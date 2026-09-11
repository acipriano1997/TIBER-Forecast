import { describe, expect, it } from 'vitest';
import type { IrrisAssessment } from '../src/contracts/irris.js';
import { compareIrrisAssessments } from '../src/models/irris/irrisShock.js';

const assessment = (overrides: Partial<IrrisAssessment> = {}): IrrisAssessment => ({
  schema_version: 'irris-assessment-v0',
  model_version: 'irris-v0.2.0',
  inference_status: 'model_inference_not_medically_confirmed',
  player_id: '00-SHOCK',
  as_of: '2026-09-11T12:00:00Z',
  eligible_evidence_ids: ['e1'],
  excluded_future_evidence_ids: [],
  official: null,
  differential: [{
    injury_family: 'hamstring_strain',
    probability: 0.8,
    severity: { mild: 0.4, moderate: 0.5, severe: 0.1 },
    supporting_evidence_ids: ['e1'],
    contradicting_evidence_ids: [],
  }],
  recovery: {
    games_missed_probability: { zero: 0.7, one: 0.2, two: 0.05, three: 0.03, four_plus: 0.02 },
    active_next_game_probability: 0.82,
    full_workload_next_game_probability: 0.68,
    median_games_missed_bucket: '0',
    return_to_workload_lag_games: { low: 0, median: 1, high: 2 },
    return_to_performance_lag_games: { low: 0, median: 1, high: 3 },
    recurrence_risk: 'elevated',
  },
  readiness: { score: 68, label: 'normal', uncertainty: 0.2, drivers: [] },
  scenarios: { inactive: 0.18, active_normal: 0.5, active_limited: 0.24, active_early_exit: 0.08 },
  functional_limitations: {
    acceleration: 0.4, top_speed: 0.4, deceleration: 0.3, lateral_cutting: 0.2, power: 0.1,
    throwing: 0, grip_catching: 0, contact_tolerance: 0.1, endurance: 0.2,
  },
  narrative_divergence: { level: 'low', score: 0.1, explanation: [] },
  confidence: 0.72,
  medical_clearance_forecast: 'not_applicable',
  caveats: [],
  ...overrides,
});

describe('compareIrrisAssessments', () => {
  it('raises a high shock when availability falls materially', () => {
    const previous = assessment();
    const current = assessment({
      as_of: '2026-09-11T17:00:00Z',
      recovery: {
        ...previous.recovery,
        active_next_game_probability: 0.55,
        full_workload_next_game_probability: 0.4,
      },
      scenarios: { inactive: 0.45, active_normal: 0.25, active_limited: 0.17, active_early_exit: 0.13 },
    });
    const shock = compareIrrisAssessments(previous, current);
    expect(shock.level).toBe('high');
    expect(shock.active_probability_delta).toBeCloseTo(-0.27);
    expect(shock.reasons.some((reason) => reason.includes('active probability fell'))).toBe(true);
  });

  it('detects a confident leading-diagnosis change', () => {
    const previous = assessment();
    const current = assessment({
      as_of: '2026-09-11T18:00:00Z',
      differential: [{
        injury_family: 'achilles_injury',
        probability: 0.73,
        severity: { mild: 0.1, moderate: 0.25, severe: 0.65 },
        supporting_evidence_ids: ['e2'],
        contradicting_evidence_ids: [],
      }],
      confidence: 0.8,
    });
    const shock = compareIrrisAssessments(previous, current);
    expect(shock.level).toBe('high');
    expect(shock.top_injury_family_changed).toBe(true);
  });

  it('refuses reverse-time comparison', () => {
    const previous = assessment({ as_of: '2026-09-11T18:00:00Z' });
    const current = assessment({ as_of: '2026-09-11T12:00:00Z' });
    expect(() => compareIrrisAssessments(previous, current)).toThrow('nondecreasing as_of');
  });
});
