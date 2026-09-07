/**
 * Weekly tail-distribution contract v2.
 *
 * This contract is deliberately additive to fantasy_forecast.weekly_player_card v1.
 * It MUST NOT reinterpret the legacy floor / median / ceiling fields as calibrated
 * quantiles or probabilities. A success response is valid only when Forecast has
 * a named model and calibration artifact for the requested population. Otherwise
 * the contract returns a typed unavailable response.
 */

import {
  validateJsonSchemaSubset,
  type JsonSchemaSubsetObject,
} from '../validation/validateJsonSchemaSubset.js';

export const FANTASY_FORECAST_WEEKLY_DISTRIBUTION_VERSION = '2.0.0';
export const FANTASY_FORECAST_WEEKLY_DISTRIBUTION_CONTRACT =
  'fantasy_forecast.weekly_player_distribution';
export const FANTASY_FORECAST_WEEKLY_PLAYER_V1_VERSION = '1.0.0';

export type WeeklyDistributionPosition = 'QB' | 'RB' | 'WR' | 'TE';

export type WeeklyDistributionUnavailableReason =
  | 'calibration_missing'
  | 'unsupported_population'
  | 'unsupported_scoring_profile'
  | 'insufficient_evidence'
  | 'stale_evidence'
  | 'model_unavailable';

export interface WeeklyDistributionIssueV2 {
  code: string;
  message: string;
  details?: string;
}

export interface WeeklyDistributionPathwayV2 {
  id: string;
  direction:
    | 'raises_right_tail'
    | 'raises_left_tail'
    | 'stabilizes_floor'
    | 'widens_distribution'
    | 'narrows_distribution';
  evidence_refs: string[];
}

export interface WeeklyDistributionCalibrationV2 {
  status: 'calibrated';
  method_version: string;
  calibration_artifact_ref: string;
  supported_population: string;
  cohort_sample_size: number;
  evidence_cutoff: string;
}

export interface WeeklyDistributionQuantilesV2 {
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
}

export interface WeeklyDistributionRightTailV2 {
  p_points_ge_25: number;
  p_points_ge_30: number;
  p_points_ge_40: number;
  p_top_1pct_position_week: number;
}

export interface WeeklyDistributionLeftTailV2 {
  position_threshold_points: number;
  replacement_points: number;
  top_x_position_finish: number;
  p_points_lt_position_threshold: number;
  p_points_lt_replacement: number;
  p_fail_top_x_position_finish: number;
}

export interface FantasyForecastWeeklyDistributionCardV2 {
  player_id: string;
  player_name: string;
  position: WeeklyDistributionPosition;
  season: number;
  week: number;
  scoring_profile: string;
  source_weekly_card_contract: 'fantasy_forecast.weekly_player_card';
  source_weekly_card_contract_version: typeof FANTASY_FORECAST_WEEKLY_PLAYER_V1_VERSION;
  model_version: string;
  generated_at: string;
  quantiles: WeeklyDistributionQuantilesV2;
  right_tail: WeeklyDistributionRightTailV2;
  left_tail: WeeklyDistributionLeftTailV2;
  calibration: WeeklyDistributionCalibrationV2;
  ceiling_pathways: WeeklyDistributionPathwayV2[];
  bust_pathways: WeeklyDistributionPathwayV2[];
  floor_stabilizers: WeeklyDistributionPathwayV2[];
}

export type FantasyForecastWeeklyDistributionResponseV2 =
  | {
      contract: typeof FANTASY_FORECAST_WEEKLY_DISTRIBUTION_CONTRACT;
      contract_version: typeof FANTASY_FORECAST_WEEKLY_DISTRIBUTION_VERSION;
      ok: true;
      warnings: WeeklyDistributionIssueV2[];
      errors: [];
      data: { distribution: FantasyForecastWeeklyDistributionCardV2 };
    }
  | {
      contract: typeof FANTASY_FORECAST_WEEKLY_DISTRIBUTION_CONTRACT;
      contract_version: typeof FANTASY_FORECAST_WEEKLY_DISTRIBUTION_VERSION;
      ok: false;
      warnings: WeeklyDistributionIssueV2[];
      errors: [WeeklyDistributionIssueV2, ...WeeklyDistributionIssueV2[]];
      unavailable: {
        reason: WeeklyDistributionUnavailableReason;
        retryable: boolean;
      };
    };

const nonEmptyString: JsonSchemaSubsetObject = {
  type: 'string',
  minLength: 1,
  pattern: '\\S',
};
const probability: JsonSchemaSubsetObject = { type: 'number', minimum: 0, maximum: 1 };
const finiteNumber: JsonSchemaSubsetObject = { type: 'number' };
const nonNegativeInteger: JsonSchemaSubsetObject = { type: 'integer', minimum: 0 };

const issueSchema: JsonSchemaSubsetObject = {
  type: 'object',
  additionalProperties: false,
  required: ['code', 'message'],
  properties: {
    code: nonEmptyString,
    message: nonEmptyString,
    details: nonEmptyString,
  },
};

const pathwaySchema: JsonSchemaSubsetObject = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'direction', 'evidence_refs'],
  properties: {
    id: nonEmptyString,
    direction: {
      type: 'string',
      enum: [
        'raises_right_tail',
        'raises_left_tail',
        'stabilizes_floor',
        'widens_distribution',
        'narrows_distribution',
      ],
    },
    evidence_refs: {
      type: 'array',
      items: nonEmptyString,
    },
  },
};

const quantileSchema: JsonSchemaSubsetObject = {
  type: 'object',
  additionalProperties: false,
  required: ['p10', 'p25', 'p50', 'p75', 'p90', 'p95'],
  properties: {
    p10: finiteNumber,
    p25: finiteNumber,
    p50: finiteNumber,
    p75: finiteNumber,
    p90: finiteNumber,
    p95: finiteNumber,
  },
};

const rightTailSchema: JsonSchemaSubsetObject = {
  type: 'object',
  additionalProperties: false,
  required: ['p_points_ge_25', 'p_points_ge_30', 'p_points_ge_40', 'p_top_1pct_position_week'],
  properties: {
    p_points_ge_25: probability,
    p_points_ge_30: probability,
    p_points_ge_40: probability,
    p_top_1pct_position_week: probability,
  },
};

const leftTailSchema: JsonSchemaSubsetObject = {
  type: 'object',
  additionalProperties: false,
  required: [
    'position_threshold_points',
    'replacement_points',
    'top_x_position_finish',
    'p_points_lt_position_threshold',
    'p_points_lt_replacement',
    'p_fail_top_x_position_finish',
  ],
  properties: {
    position_threshold_points: finiteNumber,
    replacement_points: finiteNumber,
    top_x_position_finish: { type: 'integer', minimum: 1 },
    p_points_lt_position_threshold: probability,
    p_points_lt_replacement: probability,
    p_fail_top_x_position_finish: probability,
  },
};

const calibrationSchema: JsonSchemaSubsetObject = {
  type: 'object',
  additionalProperties: false,
  required: [
    'status',
    'method_version',
    'calibration_artifact_ref',
    'supported_population',
    'cohort_sample_size',
    'evidence_cutoff',
  ],
  properties: {
    status: { type: 'string', const: 'calibrated' },
    method_version: nonEmptyString,
    calibration_artifact_ref: nonEmptyString,
    supported_population: nonEmptyString,
    cohort_sample_size: { type: 'integer', minimum: 1 },
    evidence_cutoff: nonEmptyString,
  },
};

const distributionCardSchema: JsonSchemaSubsetObject = {
  type: 'object',
  additionalProperties: false,
  required: [
    'player_id',
    'player_name',
    'position',
    'season',
    'week',
    'scoring_profile',
    'source_weekly_card_contract',
    'source_weekly_card_contract_version',
    'model_version',
    'generated_at',
    'quantiles',
    'right_tail',
    'left_tail',
    'calibration',
    'ceiling_pathways',
    'bust_pathways',
    'floor_stabilizers',
  ],
  properties: {
    player_id: nonEmptyString,
    player_name: nonEmptyString,
    position: { type: 'string', enum: ['QB', 'RB', 'WR', 'TE'] },
    season: { type: 'integer', minimum: 2000, maximum: 2200 },
    week: { type: 'integer', minimum: 1, maximum: 25 },
    scoring_profile: nonEmptyString,
    source_weekly_card_contract: {
      type: 'string',
      const: 'fantasy_forecast.weekly_player_card',
    },
    source_weekly_card_contract_version: {
      type: 'string',
      const: FANTASY_FORECAST_WEEKLY_PLAYER_V1_VERSION,
    },
    model_version: nonEmptyString,
    generated_at: nonEmptyString,
    quantiles: quantileSchema,
    right_tail: rightTailSchema,
    left_tail: leftTailSchema,
    calibration: calibrationSchema,
    ceiling_pathways: { type: 'array', items: pathwaySchema },
    bust_pathways: { type: 'array', items: pathwaySchema },
    floor_stabilizers: { type: 'array', items: pathwaySchema },
  },
};

const successSchema: JsonSchemaSubsetObject = {
  type: 'object',
  additionalProperties: false,
  required: ['contract', 'contract_version', 'ok', 'warnings', 'errors', 'data'],
  properties: {
    contract: { type: 'string', const: FANTASY_FORECAST_WEEKLY_DISTRIBUTION_CONTRACT },
    contract_version: { type: 'string', const: FANTASY_FORECAST_WEEKLY_DISTRIBUTION_VERSION },
    ok: { type: 'boolean', const: true },
    warnings: { type: 'array', items: issueSchema },
    errors: { type: 'array', maxItems: 0, items: issueSchema },
    data: {
      type: 'object',
      additionalProperties: false,
      required: ['distribution'],
      properties: { distribution: distributionCardSchema },
    },
  },
};

const unavailableSchema: JsonSchemaSubsetObject = {
  type: 'object',
  additionalProperties: false,
  required: ['contract', 'contract_version', 'ok', 'warnings', 'errors', 'unavailable'],
  properties: {
    contract: { type: 'string', const: FANTASY_FORECAST_WEEKLY_DISTRIBUTION_CONTRACT },
    contract_version: { type: 'string', const: FANTASY_FORECAST_WEEKLY_DISTRIBUTION_VERSION },
    ok: { type: 'boolean', const: false },
    warnings: { type: 'array', items: issueSchema },
    errors: { type: 'array', minItems: 1, items: issueSchema },
    unavailable: {
      type: 'object',
      additionalProperties: false,
      required: ['reason', 'retryable'],
      properties: {
        reason: {
          type: 'string',
          enum: [
            'calibration_missing',
            'unsupported_population',
            'unsupported_scoring_profile',
            'insufficient_evidence',
            'stale_evidence',
            'model_unavailable',
          ],
        },
        retryable: { type: 'boolean' },
      },
    },
  },
};

export const fantasyForecastWeeklyDistributionV2Schema: JsonSchemaSubsetObject = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: `tiber-forecast:${FANTASY_FORECAST_WEEKLY_DISTRIBUTION_CONTRACT}:${FANTASY_FORECAST_WEEKLY_DISTRIBUTION_VERSION}`,
  title: 'FantasyForecastWeeklyDistributionResponseV2',
  description:
    'Additive calibrated weekly distribution seam. Legacy weekly-card range fields are not probability aliases.',
  oneOf: [successSchema, unavailableSchema],
};

export const validateFantasyForecastWeeklyDistributionV2 = (value: unknown): string[] => {
  const issues = validateJsonSchemaSubset(value, fantasyForecastWeeklyDistributionV2Schema);
  if (issues.length > 0 || typeof value !== 'object' || value === null) return issues;

  const response = value as Partial<FantasyForecastWeeklyDistributionResponseV2>;
  if (response.ok !== true || !('data' in response) || !response.data) return issues;

  const distribution = response.data.distribution;
  const q = distribution.quantiles;
  const orderedQuantiles = [q.p10, q.p25, q.p50, q.p75, q.p90, q.p95];
  for (let index = 1; index < orderedQuantiles.length; index += 1) {
    if (orderedQuantiles[index] < orderedQuantiles[index - 1]) {
      issues.push('$.data.distribution.quantiles must be monotonic: p10 <= p25 <= p50 <= p75 <= p90 <= p95.');
      break;
    }
  }

  const right = distribution.right_tail;
  if (!(right.p_points_ge_25 >= right.p_points_ge_30 && right.p_points_ge_30 >= right.p_points_ge_40)) {
    issues.push('$.data.distribution.right_tail threshold probabilities must be monotonic: P(>=25) >= P(>=30) >= P(>=40).');
  }

  return issues;
};

export interface MakeWeeklyDistributionUnavailableV2Input {
  reason: WeeklyDistributionUnavailableReason;
  message: string;
  retryable?: boolean;
  warnings?: WeeklyDistributionIssueV2[];
  details?: string;
}

/**
 * Canonical fail-closed constructor. Use this whenever model/calibration support
 * is absent instead of manufacturing a distribution from legacy range fields.
 */
export const makeWeeklyDistributionUnavailableV2 = (
  input: MakeWeeklyDistributionUnavailableV2Input,
): FantasyForecastWeeklyDistributionResponseV2 => ({
  contract: FANTASY_FORECAST_WEEKLY_DISTRIBUTION_CONTRACT,
  contract_version: FANTASY_FORECAST_WEEKLY_DISTRIBUTION_VERSION,
  ok: false,
  warnings: input.warnings ?? [],
  errors: [
    {
      code: input.reason,
      message: input.message,
      ...(input.details ? { details: input.details } : {}),
    },
  ],
  unavailable: {
    reason: input.reason,
    retryable: input.retryable ?? false,
  },
});

export const isWeeklyDistributionAvailableV2 = (
  response: FantasyForecastWeeklyDistributionResponseV2,
): response is Extract<FantasyForecastWeeklyDistributionResponseV2, { ok: true }> => response.ok;
