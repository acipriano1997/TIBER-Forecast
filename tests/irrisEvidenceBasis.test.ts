import { describe, expect, it } from 'vitest';
import type { IrrisAssessment } from '../src/contracts/irris.js';
import { buildIrrisMedicalEvidenceBasis } from '../src/models/irris/irrisEvidenceBasis.js';
import {
  IRRIS_MEDICAL_EVIDENCE_REGISTRY,
  IRRIS_MEDICAL_EVIDENCE_REGISTRY_VERSION,
} from '../src/models/irris/irrisMedicalEvidenceRegistry.js';

const assessment = (family: IrrisAssessment['differential'][number]['injury_family']): IrrisAssessment => ({
  schema_version: 'irris-assessment-v0',
  model_version: 'irris-v0.2.0',
  inference_status: 'model_inference_not_medically_confirmed',
  player_id: '00-EVIDENCE',
  as_of: '2026-09-11T12:00:00Z',
  eligible_evidence_ids: [],
  excluded_future_evidence_ids: [],
  official: null,
  differential: [{
    injury_family: family,
    probability: 1,
    severity: { mild: 0.4, moderate: 0.45, severe: 0.15 },
    supporting_evidence_ids: [],
    contradicting_evidence_ids: [],
  }],
  recovery: {
    games_missed_probability: { zero: 0.4, one: 0.3, two: 0.15, three: 0.08, four_plus: 0.07 },
    active_next_game_probability: 0.4,
    full_workload_next_game_probability: 0.25,
    median_games_missed_bucket: '1',
    return_to_workload_lag_games: { low: 0, median: 1, high: 3 },
    return_to_performance_lag_games: { low: 0, median: 2, high: 4 },
    recurrence_risk: 'elevated',
  },
  readiness: { score: 70, label: 'normal', uncertainty: 0.3, drivers: [] },
  scenarios: { inactive: 0.6, active_normal: 0.15, active_limited: 0.18, active_early_exit: 0.07 },
  functional_limitations: {
    acceleration: 0, top_speed: 0, deceleration: 0, lateral_cutting: 0, power: 0,
    throwing: 0, grip_catching: 0, contact_tolerance: 0, endurance: 0,
  },
  narrative_divergence: { level: 'unknown', score: 0, explanation: [] },
  confidence: 0.5,
  medical_clearance_forecast: 'not_applicable',
  caveats: [],
});

describe('IRRIS medical evidence basis', () => {
  it('links a hamstring assessment to curated population evidence', () => {
    const basis = buildIrrisMedicalEvidenceBasis(assessment('hamstring_strain'));
    expect(basis.registry_version).toBe(IRRIS_MEDICAL_EVIDENCE_REGISTRY_VERSION);
    expect(basis.status).toBe('provisional_prior_evidence_not_individualized');
    expect(basis.diagnosis_families[0]!.anchor_ids).toContain('hamstring-nfl-recurrence-2009-2020');
    expect(basis.diagnosis_families[0]!.anchor_ids).toContain('hamstring-uefa-mri-255');
  });

  it('surfaces an injury family not yet covered by a literature anchor', () => {
    const basis = buildIrrisMedicalEvidenceBasis(assessment('mcl_injury'));
    expect(basis.uncovered_injury_families).toContain('mcl_injury');
  });

  it('always exposes readiness-methodology constraints', () => {
    const basis = buildIrrisMedicalEvidenceBasis(assessment('hamstring_strain'));
    expect(basis.readiness_methodology_anchor_ids).toContain('short-rest-nfl-2013-2016');
    expect(basis.readiness_methodology_anchor_ids).toContain('acwr-methodology-systematic-review-2020');
    expect(basis.readiness_methodology_anchor_ids).toContain('acwr-conceptual-pitfalls-2020');
  });

  it('keeps registry anchor ids unique', () => {
    const ids = IRRIS_MEDICAL_EVIDENCE_REGISTRY.map((anchor) => anchor.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
