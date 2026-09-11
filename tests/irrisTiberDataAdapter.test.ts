import { describe, expect, it } from 'vitest';
import { adaptTiberDataInjuryEvidenceV0 } from '../src/adapters/tiberData/injuryEvidenceV0Adapter.js';

const raw = () => ({
  contractVersion: 'injury-evidence-v0',
  evidenceId: 'e1',
  playerId: '00-TEST001',
  gameId: 'g1',
  claimType: 'mechanism',
  observedAt: '2026-09-10T20:00:00Z',
  reportedAt: '2026-09-10T20:01:00Z',
  knownAt: '2026-09-10T20:02:00Z',
  bodyRegion: 'ankle',
  side: 'right',
  rawText: 'Foot planted with external rotation; player did not return.',
  reportedDiagnosis: null,
  sourceQuality: 0.85,
  features: {
    contact: true,
    nonContact: null,
    plantedFoot: true,
    externalRotation: true,
    inversion: null,
    eversion: null,
    hyperextension: null,
    sprinting: null,
    acceleration: null,
    deceleration: null,
    immediateStop: true,
    returnedToGame: false,
    unableToBearWeight: null,
    visibleLimp: true,
    carted: null,
    walkingBoot: null,
    crutches: null,
    brace: null,
    imagingNegativeFracture: null,
    structuralDamageReported: null,
    surgeryReported: null,
    practiceDnp: null,
    practiceLimited: null,
    practiceFull: null,
    firstTeamReps: null,
    cuttingObserved: null,
    sprintingObserved: null,
    workloadRestrictionReported: null,
    gameTimeDecision: null,
    expectedActive: null,
    expectedInactive: null,
    sameRegionRecurrence: null,
    concussionProtocol: null,
  },
  source: {
    sourceKind: 'video_observation',
    sourceName: 'broadcast review',
    sourceRecordId: 'clip-1',
    sourceUrl: 'https://example.com/clip',
    retrievedAt: '2026-09-10T20:03:00Z',
    rawPayloadRef: 'raw/injury/clip-1.json',
    rawPayloadSha256: 'b'.repeat(64),
  },
});

describe('adaptTiberDataInjuryEvidenceV0', () => {
  it('maps governed camelCase evidence into IRRIS while preserving raw trace', () => {
    const result = adaptTiberDataInjuryEvidenceV0(raw());
    expect(result.evidence_id).toBe('e1');
    expect(result.features?.planted_foot).toBe(true);
    expect(result.features?.external_rotation).toBe(true);
    expect(result.features?.non_contact).toBeUndefined();
    expect(result.provenance.raw_payload_sha256).toBe('b'.repeat(64));
    expect(result.provenance.reported_at).toBe('2026-09-10T20:01:00Z');
  });

  it('rejects records with no immutable raw trace hash', () => {
    const broken = raw();
    broken.source.rawPayloadSha256 = 'bad';
    expect(() => adaptTiberDataInjuryEvidenceV0(broken)).toThrow('rawPayloadSha256');
  });

  it('rejects unknown source and claim vocabulary at the Forecast boundary', () => {
    const badSource = raw();
    badSource.source.sourceKind = 'social_guess';
    expect(() => adaptTiberDataInjuryEvidenceV0(badSource)).toThrow('source.sourceKind');

    const badClaim = raw();
    badClaim.claimType = 'diagnose_from_vibes';
    expect(() => adaptTiberDataInjuryEvidenceV0(badClaim)).toThrow('claimType');
  });

  it('rejects invalid body-region vocabulary', () => {
    const broken = raw();
    broken.bodyRegion = 'left_leg_somewhere';
    expect(() => adaptTiberDataInjuryEvidenceV0(broken)).toThrow('bodyRegion');
  });

  it('re-checks canonical temporal ordering instead of trusting upstream casts', () => {
    const beforeReport = raw();
    beforeReport.knownAt = '2026-09-10T19:59:00Z';
    expect(() => adaptTiberDataInjuryEvidenceV0(beforeReport)).toThrow('knownAt cannot precede reportedAt');

    const afterRetrieval = raw();
    afterRetrieval.knownAt = '2026-09-10T20:04:00Z';
    expect(() => adaptTiberDataInjuryEvidenceV0(afterRetrieval)).toThrow('knownAt cannot be later than retrievedAt');
  });
});
