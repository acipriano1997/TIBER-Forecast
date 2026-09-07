import { describe, expect, it } from 'vitest';
import {
  FANTASY_FORECAST_WEEKLY_DISTRIBUTION_CONTRACT,
  FANTASY_FORECAST_WEEKLY_DISTRIBUTION_VERSION,
  isWeeklyDistributionAvailableV2,
  makeWeeklyDistributionUnavailableV2,
  validateFantasyForecastWeeklyDistributionV2,
  type FantasyForecastWeeklyDistributionResponseV2,
} from '../src/contracts/fantasyForecastWeeklyDistributionV2.js';

const calibratedFixture = (): FantasyForecastWeeklyDistributionResponseV2 => ({
  contract: FANTASY_FORECAST_WEEKLY_DISTRIBUTION_CONTRACT,
  contract_version: FANTASY_FORECAST_WEEKLY_DISTRIBUTION_VERSION,
  ok: true,
  warnings: [],
  errors: [],
  data: {
    distribution: {
      player_id: 'player-1',
      player_name: 'Example Receiver',
      position: 'WR',
      season: 2026,
      week: 1,
      scoring_profile: 'tiber.generic_full_ppr.v1',
      source_weekly_card_contract: 'fantasy_forecast.weekly_player_card',
      source_weekly_card_contract_version: '1.0.0',
      model_version: 'weekly-tail-test-v2',
      generated_at: '2026-09-07T17:00:00.000Z',
      quantiles: {
        p10: 5.5,
        p25: 9.1,
        p50: 13.8,
        p75: 18.4,
        p90: 24.9,
        p95: 29.3,
      },
      right_tail: {
        p_points_ge_25: 0.1,
        p_points_ge_30: 0.05,
        p_points_ge_40: 0.01,
        p_top_1pct_position_week: 0.012,
      },
      left_tail: {
        position_threshold_points: 8,
        replacement_points: 9.5,
        top_x_position_finish: 24,
        p_points_lt_position_threshold: 0.2,
        p_points_lt_replacement: 0.27,
        p_fail_top_x_position_finish: 0.38,
      },
      calibration: {
        status: 'calibrated',
        method_version: 'isotonic-by-position-v1',
        calibration_artifact_ref: 'artifact://weekly-tail/2021-2025/wr/full-ppr/v1',
        supported_population: 'NFL WR weekly full-PPR 2021-2025',
        cohort_sample_size: 1120,
        evidence_cutoff: '2026-09-07T16:30:00.000Z',
      },
      ceiling_pathways: [
        {
          id: 'opportunity_concentration',
          direction: 'raises_right_tail',
          evidence_refs: ['role://player-1/week-1'],
        },
      ],
      bust_pathways: [
        {
          id: 'delivery_chain_risk',
          direction: 'raises_left_tail',
          evidence_refs: ['teamstate://team-a/week-1'],
        },
      ],
      floor_stabilizers: [
        {
          id: 'multi_channel_usage',
          direction: 'stabilizes_floor',
          evidence_refs: ['role://player-1/week-1'],
        },
      ],
    },
  },
});

describe('fantasyForecastWeeklyDistributionV2', () => {
  it('accepts a calibrated distribution with explicit provenance', () => {
    const fixture = calibratedFixture();
    expect(validateFantasyForecastWeeklyDistributionV2(fixture)).toEqual([]);
    expect(isWeeklyDistributionAvailableV2(fixture)).toBe(true);
  });

  it('provides a canonical typed unavailable response when calibration is missing', () => {
    const response = makeWeeklyDistributionUnavailableV2({
      reason: 'calibration_missing',
      message: 'No approved calibration artifact exists for this population.',
      retryable: false,
    });

    expect(validateFantasyForecastWeeklyDistributionV2(response)).toEqual([]);
    expect(response.ok).toBe(false);
    expect(isWeeklyDistributionAvailableV2(response)).toBe(false);
    if (!response.ok) {
      expect(response.unavailable.reason).toBe('calibration_missing');
      expect(response.errors[0].code).toBe('calibration_missing');
    }
  });

  it('rejects probabilities outside [0, 1]', () => {
    const fixture = calibratedFixture();
    if (!fixture.ok) throw new Error('fixture unexpectedly unavailable');
    fixture.data.distribution.right_tail.p_points_ge_25 = 1.2;

    const issues = validateFantasyForecastWeeklyDistributionV2(fixture);
    expect(issues.some((issue) => issue.includes('must be <= 1'))).toBe(true);
  });

  it('rejects non-monotonic quantiles', () => {
    const fixture = calibratedFixture();
    if (!fixture.ok) throw new Error('fixture unexpectedly unavailable');
    fixture.data.distribution.quantiles.p75 = 12;

    const issues = validateFantasyForecastWeeklyDistributionV2(fixture);
    expect(issues.some((issue) => issue.includes('quantiles must be monotonic'))).toBe(true);
  });

  it('rejects non-monotonic right-tail thresholds', () => {
    const fixture = calibratedFixture();
    if (!fixture.ok) throw new Error('fixture unexpectedly unavailable');
    fixture.data.distribution.right_tail.p_points_ge_40 = 0.2;

    const issues = validateFantasyForecastWeeklyDistributionV2(fixture);
    expect(issues.some((issue) => issue.includes('threshold probabilities must be monotonic'))).toBe(true);
  });

  it('rejects a success payload that omits calibration provenance', () => {
    const fixture = calibratedFixture() as unknown as Record<string, unknown>;
    const data = fixture.data as { distribution: Record<string, unknown> };
    delete data.distribution.calibration;

    const issues = validateFantasyForecastWeeklyDistributionV2(fixture);
    expect(issues.some((issue) => issue.includes('.calibration is required'))).toBe(true);
  });

  it('rejects extra fields so old heuristic scores cannot be smuggled into the contract', () => {
    const fixture = calibratedFixture() as unknown as Record<string, unknown>;
    const data = fixture.data as { distribution: Record<string, unknown> };
    data.distribution.legacy_ceiling_multiplier = 1.25;

    const issues = validateFantasyForecastWeeklyDistributionV2(fixture);
    expect(issues.some((issue) => issue.includes('legacy_ceiling_multiplier'))).toBe(true);
  });
});
