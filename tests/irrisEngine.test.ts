import { describe, expect, it } from 'vitest';
import type { IrrisEvidence, IrrisRequest } from '../src/contracts/irris.js';
import { assessIrris } from '../src/models/irris/irrisEngine.js';

const baseEvidence = (overrides: Partial<IrrisEvidence> = {}): IrrisEvidence => ({
  evidence_id: 'e1',
  player_id: '00-TEST001',
  source_kind: 'video_observation',
  claim_type: 'mechanism',
  body_region: 'ankle',
  observed_at: '2026-09-10T20:15:00Z',
  known_at: '2026-09-10T20:16:00Z',
  source_quality: 0.8,
  features: {},
  ...overrides,
});

const baseRequest = (overrides: Partial<IrrisRequest> = {}): IrrisRequest => ({
  as_of: '2026-09-11T12:00:00Z',
  player: { player_id: '00-TEST001', position: 'WR' },
  official: { game_status: 'questionable', body_region: 'ankle', narrative_tone: 'neutral' },
  evidence: [baseEvidence()],
  workload: {
    hours_since_last_game: 168,
    last_game_snaps: 62,
    recent_avg_snaps: 60,
    last_game_opportunities: 8,
    recent_avg_opportunities: 8,
    overtime_last_game: false,
    travel_time_zones: 0,
    international_travel: false,
    heat_stress_index: 0.2,
    illness_reported: false,
    bye_week_last_week: false,
  },
  ...overrides,
});

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

describe('IRRIS v0', () => {
  it('excludes evidence learned after the frozen as-of timestamp', () => {
    const request = baseRequest({
      evidence: [
        baseEvidence(),
        baseEvidence({
          evidence_id: 'future-mri',
          source_kind: 'medical_reporting',
          claim_type: 'diagnosis_reported',
          known_at: '2026-09-12T12:00:00Z',
          reported_diagnosis: 'high ankle sprain',
          source_quality: 1,
        }),
      ],
    });

    const result = assessIrris(request);
    expect(result.eligible_evidence_ids).toEqual(['e1']);
    expect(result.excluded_future_evidence_ids).toEqual(['future-mri']);
  });

  it('keeps diagnosis and severity as probability distributions that sum to one', () => {
    const result = assessIrris(baseRequest({
      evidence: [baseEvidence({ features: { planted_foot: true, external_rotation: true, immediate_stop: true } })],
    }));

    expect(sum(result.differential.map((candidate) => candidate.probability))).toBeCloseTo(1, 3);
    for (const candidate of result.differential) {
      expect(sum(Object.values(candidate.severity))).toBeCloseTo(1, 3);
    }
    expect(result.inference_status).toBe('model_inference_not_medically_confirmed');
  });

  it('raises syndesmotic probability for a planted-foot external-rotation mechanism', () => {
    const result = assessIrris(baseRequest({
      evidence: [baseEvidence({ features: { planted_foot: true, external_rotation: true, immediate_stop: true, returned_to_game: false } })],
    }));

    const syndesmotic = result.differential.find((candidate) => candidate.injury_family === 'syndesmotic_ankle_sprain');
    const bone = result.differential.find((candidate) => candidate.injury_family === 'ankle_bone_injury');
    expect(syndesmotic).toBeDefined();
    expect(syndesmotic!.probability).toBeGreaterThan(bone?.probability ?? 0);
  });

  it('allows model-vs-team narrative divergence without overwriting official status', () => {
    const result = assessIrris(baseRequest({
      official: {
        game_status: 'questionable',
        body_region: 'ankle',
        narrative: 'minor tweak, day-to-day',
        narrative_tone: 'reassuring',
      },
      evidence: [
        baseEvidence({ features: { planted_foot: true, external_rotation: true, immediate_stop: true, unable_to_bear_weight: true, carted: true } }),
        baseEvidence({
          evidence_id: 'practice-dnp',
          source_kind: 'official_injury_report',
          claim_type: 'practice_participation',
          observed_at: '2026-09-11T15:00:00Z',
          known_at: '2026-09-11T15:01:00Z',
          features: { practice_dnp: true },
          source_quality: 1,
        }),
      ],
      as_of: '2026-09-11T16:00:00Z',
    }));

    expect(result.official?.game_status).toBe('questionable');
    expect(result.narrative_divergence.level).not.toBe('low');
    expect(result.recovery.active_next_game_probability).toBeLessThan(0.6);
  });

  it('never predicts medical clearance for a possible concussion', () => {
    const result = assessIrris(baseRequest({
      player: { player_id: '00-TEST001', position: 'QB' },
      official: { game_status: 'questionable', body_region: 'head', narrative_tone: 'neutral' },
      evidence: [baseEvidence({
        body_region: 'head',
        claim_type: 'functional_observation',
        features: { concussion_protocol: true, immediate_stop: true },
      })],
    }));

    expect(result.differential[0]?.injury_family).toBe('concussion');
    expect(result.medical_clearance_forecast).toBe('not_predicted');
    expect(result.caveats.some((caveat) => caveat.includes('does not predict or assert medical clearance'))).toBe(true);
  });

  it('does not equate short rest alone with a depleted state', () => {
    const result = assessIrris(baseRequest({
      evidence: [],
      workload: { hours_since_last_game: 90 },
    }));

    expect(result.readiness.label).not.toBe('depleted');
    expect(result.readiness.drivers).toContain('compressed recovery interval');
  });

  it('produces a normalized availability scenario mixture', () => {
    const result = assessIrris(baseRequest());
    expect(sum(Object.values(result.scenarios))).toBeCloseTo(1, 3);
    expect(result.scenarios.inactive).toBeCloseTo(1 - result.recovery.active_next_game_probability, 3);
  });

  it('respects a confirmed inactive state over model availability inference', () => {
    const result = assessIrris(baseRequest({
      official: { game_status: 'inactive', body_region: 'ankle', narrative_tone: 'neutral' },
      evidence: [baseEvidence({ features: { expected_active: true, practice_full: true, returned_to_game: true } })],
    }));

    expect(result.recovery.active_next_game_probability).toBe(0);
    expect(result.scenarios.inactive).toBe(1);
  });
});
