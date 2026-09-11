import type { IrrisEvidence, IrrisEvidenceFeatures } from '../../contracts/irris.js';

export interface TiberDataInjuryEvidenceV0Like {
  contractVersion: 'injury-evidence-v0';
  evidenceId: string;
  playerId: string;
  gameId: string | null;
  claimType: string;
  observedAt: string;
  reportedAt: string;
  knownAt: string;
  bodyRegion: string | null;
  side: 'left' | 'right' | 'bilateral' | 'unknown' | null;
  rawText: string | null;
  reportedDiagnosis: string | null;
  sourceQuality: number;
  features: Record<string, boolean | null>;
  source: {
    sourceKind: string;
    sourceName: string;
    sourceRecordId: string;
    sourceUrl: string | null;
    retrievedAt: string;
    rawPayloadRef: string;
    rawPayloadSha256: string;
  };
}

const featureMap: Array<[string, keyof IrrisEvidenceFeatures]> = [
  ['contact', 'contact'],
  ['nonContact', 'non_contact'],
  ['plantedFoot', 'planted_foot'],
  ['externalRotation', 'external_rotation'],
  ['inversion', 'inversion'],
  ['eversion', 'eversion'],
  ['hyperextension', 'hyperextension'],
  ['sprinting', 'sprinting'],
  ['acceleration', 'acceleration'],
  ['deceleration', 'deceleration'],
  ['immediateStop', 'immediate_stop'],
  ['returnedToGame', 'returned_to_game'],
  ['unableToBearWeight', 'unable_to_bear_weight'],
  ['visibleLimp', 'visible_limp'],
  ['carted', 'carted'],
  ['walkingBoot', 'walking_boot'],
  ['crutches', 'crutches'],
  ['brace', 'brace'],
  ['imagingNegativeFracture', 'imaging_negative_fracture'],
  ['structuralDamageReported', 'structural_damage_reported'],
  ['surgeryReported', 'surgery_reported'],
  ['practiceDnp', 'practice_dnp'],
  ['practiceLimited', 'practice_limited'],
  ['practiceFull', 'practice_full'],
  ['firstTeamReps', 'first_team_reps'],
  ['cuttingObserved', 'cutting_observed'],
  ['sprintingObserved', 'sprinting_observed'],
  ['workloadRestrictionReported', 'workload_restriction_reported'],
  ['gameTimeDecision', 'game_time_decision'],
  ['expectedActive', 'expected_active'],
  ['expectedInactive', 'expected_inactive'],
  ['sameRegionRecurrence', 'same_region_recurrence'],
  ['concussionProtocol', 'concussion_protocol'],
];

const validIso = (value: string) => Number.isFinite(Date.parse(value));

const requireRecord = (value: unknown): TiberDataInjuryEvidenceV0Like => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('injury-evidence-v0 record must be an object');
  const record = value as Record<string, unknown>;
  if (record.contractVersion !== 'injury-evidence-v0') throw new Error('unsupported injury evidence contract version');
  if (typeof record.evidenceId !== 'string' || typeof record.playerId !== 'string') throw new Error('injury evidence identity fields are required');
  if (typeof record.observedAt !== 'string' || typeof record.reportedAt !== 'string' || typeof record.knownAt !== 'string') throw new Error('injury evidence temporal fields are required');
  if (!validIso(record.observedAt) || !validIso(record.reportedAt) || !validIso(record.knownAt)) throw new Error('injury evidence timestamps must be valid ISO timestamps');
  if (typeof record.sourceQuality !== 'number' || record.sourceQuality < 0 || record.sourceQuality > 1) throw new Error('injury evidence sourceQuality must be within [0,1]');
  if (!record.features || typeof record.features !== 'object' || Array.isArray(record.features)) throw new Error('injury evidence features are required');
  if (!record.source || typeof record.source !== 'object' || Array.isArray(record.source)) throw new Error('injury evidence source envelope is required');
  const source = record.source as Record<string, unknown>;
  for (const key of ['sourceKind', 'sourceName', 'sourceRecordId', 'retrievedAt', 'rawPayloadRef', 'rawPayloadSha256']) {
    if (typeof source[key] !== 'string' || source[key] === '') throw new Error(`injury evidence source.${key} is required`);
  }
  if (!/^[a-f0-9]{64}$/.test(String(source.rawPayloadSha256))) throw new Error('injury evidence rawPayloadSha256 is invalid');
  return value as TiberDataInjuryEvidenceV0Like;
};

export interface AdaptedIrrisEvidence extends IrrisEvidence {
  provenance: {
    contract_version: 'injury-evidence-v0';
    reported_at: string;
    retrieved_at: string;
    raw_payload_ref: string;
    raw_payload_sha256: string;
  };
}

export const adaptTiberDataInjuryEvidenceV0 = (value: unknown): AdaptedIrrisEvidence => {
  const input = requireRecord(value);
  const features: IrrisEvidenceFeatures = {};
  for (const [sourceKey, targetKey] of featureMap) {
    const value = input.features[sourceKey];
    if (typeof value === 'boolean') features[targetKey] = value;
  }

  return {
    evidence_id: input.evidenceId,
    player_id: input.playerId,
    source_kind: input.source.sourceKind as IrrisEvidence['source_kind'],
    claim_type: input.claimType as IrrisEvidence['claim_type'],
    source_name: input.source.sourceName,
    source_record_id: input.source.sourceRecordId,
    source_url: input.source.sourceUrl ?? undefined,
    body_region: (input.bodyRegion ?? undefined) as IrrisEvidence['body_region'],
    side: input.side ?? undefined,
    text: input.rawText ?? undefined,
    reported_diagnosis: input.reportedDiagnosis ?? undefined,
    observed_at: input.observedAt,
    known_at: input.knownAt,
    valid_for_game_id: input.gameId ?? undefined,
    source_quality: input.sourceQuality,
    features,
    provenance: {
      contract_version: 'injury-evidence-v0',
      reported_at: input.reportedAt,
      retrieved_at: input.source.retrievedAt,
      raw_payload_ref: input.source.rawPayloadRef,
      raw_payload_sha256: input.source.rawPayloadSha256,
    },
  };
};

export const adaptTiberDataInjuryEvidenceArrayV0 = (values: unknown[]): AdaptedIrrisEvidence[] =>
  values.map(adaptTiberDataInjuryEvidenceV0);
