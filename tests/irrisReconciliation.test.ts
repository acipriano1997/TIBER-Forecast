import { describe, expect, it } from 'vitest';
import type { IrrisAssessment } from '../src/contracts/irris.js';
import { buildIrrisCalibrationBins, reconcileIrrisAssessment } from '../src/models/irris/irrisReconciliation.js';

const assessment = {
  schema_version: 'irris-assessment-v0',
  model_version: 'irris-v0.1.0',
  inference_status: 'model_inference_not_medically_confirmed',
  player_id: '00-TEST001',
  as_of: '2026-09-11T12:00:00Z',
  eligible_evidence_ids: ['e1'],
  excluded_future_evidence_ids: [],
  official: null,
  differential: [],
  recovery: {
    games_missed_probability: { zero: 0.7, one: 0.2, two: 0.05, three: 0.03, four_plus: 0.02 },
    active_next_game_probability: 0.7,
    full_workload_next_game_probability: 0.55,
    median_games_missed_bucket: '0',
    return_to_workload_lag_games: { low: 0, median: 1, high: 2 },
    return_to_performance_lag_games: { low: 0, median: 1, high: 3 },
    recurrence_risk: 'elevated',
  },
  readiness: { score: 68, label: 'normal', uncertainty: 0.2, drivers: [] },
  scenarios: { inactive: 0.3, active_normal: 0.4, active_limited: 0.2, active_early_exit: 0.1 },
  functional_limitations: {
    acceleration: 0, top_speed: 0, deceleration: 0, lateral_cutting: 0, power: 0,
    throwing: 0, grip_catching: 0, contact_tolerance: 0, endurance: 0,
  },
  narrative_divergence: { level: 'unknown', score: 0, explanation: [] },
  confidence: 0.7,
  medical_clearance_forecast: 'not_applicable',
  caveats: [],
} satisfies IrrisAssessment;

describe('IRRIS reconciliation', () => {
  it('scores active, workload, early-exit and categorical scenario forecasts', () => {
    const result = reconcileIrrisAssessment(assessment, {
      player_id: '00-TEST001',
      game_id: 'g1',
      observed_at: '2026-09-13T21:00:00Z',
      active: true,
      full_workload: false,
      early_exit: false,
      observed_scenario: 'active_limited',
      snap_share: 0.54,
      aggravation_reported: false,
      following_week_practice_status: 'limited',
    });

    expect(result.active_brier).toBeCloseTo(0.09);
    expect(result.full_workload_brier).toBeCloseTo(0.3025);
    expect(result.early_exit_brier).toBeCloseTo(0.01);
    expect(result.predicted_scenario_probability).toBe(0.2);
    expect(result.scenario_log_loss).toBeCloseTo(-Math.log(0.2));
  });

  it('refuses to reconcile a different player', () => {
    expect(() => reconcileIrrisAssessment(assessment, {
      player_id: '00-OTHER', game_id: 'g1', observed_at: '2026-09-13T21:00:00Z',
      active: true, full_workload: null, early_exit: null, observed_scenario: 'active_normal',
    })).toThrow('player_id mismatch');
  });

  it('builds cohort calibration bins rather than judging calibration from one case', () => {
    const bins = buildIrrisCalibrationBins([
      { probability: 0.82, outcome: true },
      { probability: 0.86, outcome: true },
      { probability: 0.88, outcome: false },
      { probability: 0.21, outcome: false },
    ]);
    const highBin = bins.find((bin) => bin.lower === 0.8);
    expect(highBin?.count).toBe(3);
    expect(highBin?.observed_rate).toBeCloseTo(2 / 3, 5);
  });
});
