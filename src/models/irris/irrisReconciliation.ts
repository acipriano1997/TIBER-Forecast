import type { IrrisAssessment } from '../../contracts/irris.js';

export type IrrisObservedScenario = 'inactive' | 'active_normal' | 'active_limited' | 'active_early_exit';

export interface IrrisObservedOutcome {
  player_id: string;
  game_id: string;
  observed_at: string;
  active: boolean;
  full_workload: boolean | null;
  early_exit: boolean | null;
  observed_scenario: IrrisObservedScenario;
  snap_share?: number | null;
  route_share?: number | null;
  opportunities?: number | null;
  aggravation_reported?: boolean | null;
  following_week_practice_status?: 'dnp' | 'limited' | 'full' | 'not_reported' | 'unknown' | null;
}

export interface IrrisReconciliationResult {
  schema_version: 'irris-reconciliation-v0';
  player_id: string;
  game_id: string;
  assessment_as_of: string;
  outcome_observed_at: string;
  active_brier: number;
  full_workload_brier: number | null;
  early_exit_brier: number | null;
  scenario_log_loss: number;
  predicted_scenario_probability: number;
  observed_scenario: IrrisObservedScenario;
  calibration_dimensions: Array<'active' | 'full_workload' | 'early_exit' | 'scenario'>;
  notes: string[];
}

const round = (value: number) => Number(value.toFixed(6));
const brier = (probability: number, outcome: boolean) => (probability - (outcome ? 1 : 0)) ** 2;

export const reconcileIrrisAssessment = (
  assessment: IrrisAssessment,
  outcome: IrrisObservedOutcome,
): IrrisReconciliationResult => {
  if (assessment.player_id !== outcome.player_id) {
    throw new Error('IRRIS reconciliation player_id mismatch');
  }

  const activeP = assessment.recovery.active_next_game_probability;
  const fullP = assessment.recovery.full_workload_next_game_probability;
  const earlyExitP = assessment.scenarios.active_early_exit;
  const scenarioP = assessment.scenarios[outcome.observed_scenario];
  const dimensions: IrrisReconciliationResult['calibration_dimensions'] = ['active', 'scenario'];
  if (outcome.full_workload !== null) dimensions.push('full_workload');
  if (outcome.early_exit !== null) dimensions.push('early_exit');

  const notes = [
    'Brier scores are proper scoring rules: lower is better; calibration must be evaluated over cohorts, not one case.',
    'Scenario log loss penalizes confident probability assigned away from the realized state.',
  ];
  if (outcome.aggravation_reported === true) notes.push('Public postgame reporting recorded an aggravation signal for follow-up episode analysis.');
  if (outcome.following_week_practice_status) notes.push(`Following-week practice status=${outcome.following_week_practice_status}.`);

  return {
    schema_version: 'irris-reconciliation-v0',
    player_id: outcome.player_id,
    game_id: outcome.game_id,
    assessment_as_of: assessment.as_of,
    outcome_observed_at: outcome.observed_at,
    active_brier: round(brier(activeP, outcome.active)),
    full_workload_brier: outcome.full_workload === null ? null : round(brier(fullP, outcome.full_workload)),
    early_exit_brier: outcome.early_exit === null ? null : round(brier(earlyExitP, outcome.early_exit)),
    scenario_log_loss: round(-Math.log(Math.max(scenarioP, 1e-9))),
    predicted_scenario_probability: round(scenarioP),
    observed_scenario: outcome.observed_scenario,
    calibration_dimensions: dimensions,
    notes,
  };
};

export interface IrrisCalibrationBin {
  lower: number;
  upper: number;
  count: number;
  mean_prediction: number;
  observed_rate: number;
  calibration_error: number;
}

export const buildIrrisCalibrationBins = (
  samples: Array<{ probability: number; outcome: boolean }>,
  binWidth = 0.1,
): IrrisCalibrationBin[] => {
  if (!(binWidth > 0 && binWidth <= 1)) throw new Error('binWidth must be within (0, 1]');
  const bins: IrrisCalibrationBin[] = [];
  for (let lower = 0; lower < 1; lower += binWidth) {
    const upper = Math.min(1, lower + binWidth);
    const selected = samples.filter(({ probability }) => probability >= lower && (upper === 1 ? probability <= upper : probability < upper));
    if (selected.length === 0) continue;
    const meanPrediction = selected.reduce((sum, row) => sum + row.probability, 0) / selected.length;
    const observedRate = selected.filter((row) => row.outcome).length / selected.length;
    bins.push({
      lower: round(lower),
      upper: round(upper),
      count: selected.length,
      mean_prediction: round(meanPrediction),
      observed_rate: round(observedRate),
      calibration_error: round(Math.abs(meanPrediction - observedRate)),
    });
  }
  return bins;
};
