import { describe, expect, it } from 'vitest';
import type { IrrisEvidence, IrrisRequest } from '../src/contracts/irris.js';
import { assessIrris } from '../src/models/irris/irrisEngine.js';

const evidence = (
  id: string,
  observedAt: string,
  features: IrrisEvidence['features'],
): IrrisEvidence => ({
  evidence_id: id,
  player_id: '00-HARDEN',
  source_kind: 'official_injury_report',
  claim_type: 'practice_participation',
  body_region: 'hamstring',
  observed_at: observedAt,
  known_at: observedAt,
  source_quality: 1,
  features,
});

const request = (items: IrrisEvidence[]): IrrisRequest => ({
  as_of: '2026-09-11T20:00:00Z',
  player: { player_id: '00-HARDEN', position: 'WR' },
  evidence: items,
});

describe('IRRIS hardening', () => {
  it('does not treat unknown return-to-game status as explicit non-return evidence', () => {
    const unknownReturn = assessIrris(request([
      {
        ...evidence('mechanism', '2026-09-10T20:00:00Z', { immediate_stop: true }),
        source_kind: 'video_observation',
        claim_type: 'mechanism',
      },
    ]));
    const explicitNonReturn = assessIrris(request([
      {
        ...evidence('mechanism', '2026-09-10T20:00:00Z', { immediate_stop: true, returned_to_game: false }),
        source_kind: 'video_observation',
        claim_type: 'mechanism',
      },
    ]));

    const unknownModerate = unknownReturn.differential[0]!.severity.moderate;
    const explicitModerate = explicitNonReturn.differential[0]!.severity.moderate;
    expect(explicitModerate).toBeGreaterThan(unknownModerate);
  });

  it('distinguishes improving from worsening practice order', () => {
    const improving = assessIrris(request([
      evidence('dnp', '2026-09-09T16:00:00Z', { practice_dnp: true }),
      evidence('limited', '2026-09-10T16:00:00Z', { practice_limited: true }),
      evidence('full', '2026-09-11T16:00:00Z', { practice_full: true }),
    ]));
    const worsening = assessIrris(request([
      evidence('full', '2026-09-09T16:00:00Z', { practice_full: true }),
      evidence('limited', '2026-09-10T16:00:00Z', { practice_limited: true }),
      evidence('dnp', '2026-09-11T16:00:00Z', { practice_dnp: true }),
    ]));

    expect(improving.recovery.active_next_game_probability).toBeGreaterThan(worsening.recovery.active_next_game_probability);
    expect(improving.caveats).toContain('Practice trajectory=improving; latest=full.');
    expect(worsening.caveats).toContain('Practice trajectory=worsening; latest=dnp.');
  });

  it('excludes an official state learned after as_of instead of leaking it backward', () => {
    const result = assessIrris({
      ...request([]),
      official: {
        game_status: 'inactive',
        body_region: 'hamstring',
        known_at: '2026-09-12T12:00:00Z',
      },
    });

    expect(result.official).toBeNull();
    expect(result.recovery.active_next_game_probability).toBeGreaterThan(0);
    expect(result.caveats).toContain('Official state was learned after as_of and was excluded from this frozen replay.');
  });

  it('keeps source-class reliability neutral until learned from calibration', () => {
    const base: Omit<IrrisEvidence, 'evidence_id' | 'source_kind'> = {
      player_id: '00-HARDEN',
      claim_type: 'availability',
      body_region: 'hamstring',
      observed_at: '2026-09-11T15:00:00Z',
      known_at: '2026-09-11T15:00:00Z',
      source_quality: 0.8,
      features: { expected_active: true },
    };

    const coach = assessIrris(request([{ ...base, evidence_id: 'coach', source_kind: 'coach_statement' }]));
    const reporter = assessIrris(request([{ ...base, evidence_id: 'reporter', source_kind: 'national_reporter' }]));
    expect(coach.recovery.active_next_game_probability).toBe(reporter.recovery.active_next_game_probability);
  });
});
