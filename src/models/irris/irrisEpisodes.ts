import type { IrrisBodyRegion, IrrisEvidence } from '../../contracts/irris.js';

export interface IrrisInjuryEpisode {
  episode_id: string;
  player_id: string;
  body_region: IrrisBodyRegion;
  started_at: string;
  last_observed_at: string;
  evidence_ids: string[];
  recurrence_of_episode_id: string | null;
  recurrence_evidence_ids: string[];
  derivation: 'model_derived_public_evidence_episode';
}

export interface IrrisEpisodeTimeline {
  schema_version: 'irris-episode-timeline-v0';
  player_id: string | null;
  episode_gap_days: number;
  episodes: IrrisInjuryEpisode[];
  caveats: string[];
}

const DAY_MS = 86_400_000;

/**
 * Builds a deterministic public-evidence episode timeline.
 *
 * This is not a clinical episode record. It is a model-side grouping used to
 * avoid treating every blurb as an unrelated injury. Explicit recurrence
 * evidence starts a new linked episode; otherwise same-region observations are
 * grouped until the configured inactivity gap is exceeded.
 */
export const buildIrrisEpisodeTimeline = (
  evidence: IrrisEvidence[],
  episodeGapDays = 42,
): IrrisEpisodeTimeline => {
  if (!(episodeGapDays > 0)) throw new Error('episodeGapDays must be positive');
  const playerIds = [...new Set(evidence.map((item) => item.player_id))];
  if (playerIds.length > 1) throw new Error('IRRIS episode timeline requires evidence for one player');

  const sorted = [...evidence]
    .filter((item) => Number.isFinite(Date.parse(item.observed_at)))
    .sort((a, b) => Date.parse(a.observed_at) - Date.parse(b.observed_at));
  const episodes: IrrisInjuryEpisode[] = [];
  const sequenceByRegion = new Map<IrrisBodyRegion, number>();

  for (const item of sorted) {
    const region = item.body_region ?? 'unknown';
    const priorSameRegion = [...episodes].reverse().find((episode) => episode.body_region === region);
    const explicitRecurrence = item.features?.same_region_recurrence === true;
    const gapDays = priorSameRegion
      ? (Date.parse(item.observed_at) - Date.parse(priorSameRegion.last_observed_at)) / DAY_MS
      : Number.POSITIVE_INFINITY;
    const shouldStartNew = !priorSameRegion || explicitRecurrence || gapDays > episodeGapDays;

    if (shouldStartNew) {
      const nextSequence = (sequenceByRegion.get(region) ?? 0) + 1;
      sequenceByRegion.set(region, nextSequence);
      const episodeId = `derived:${item.player_id}:${region}:${nextSequence}`;
      episodes.push({
        episode_id: episodeId,
        player_id: item.player_id,
        body_region: region,
        started_at: item.observed_at,
        last_observed_at: item.observed_at,
        evidence_ids: [item.evidence_id],
        recurrence_of_episode_id: explicitRecurrence && priorSameRegion ? priorSameRegion.episode_id : null,
        recurrence_evidence_ids: explicitRecurrence ? [item.evidence_id] : [],
        derivation: 'model_derived_public_evidence_episode',
      });
      continue;
    }

    priorSameRegion.last_observed_at = item.observed_at;
    priorSameRegion.evidence_ids.push(item.evidence_id);
    if (explicitRecurrence) priorSameRegion.recurrence_evidence_ids.push(item.evidence_id);
  }

  const caveats = [
    'Episode grouping is model-derived from public evidence and is not a team medical record.',
    `Same-region observations are grouped across gaps of at most ${episodeGapDays} days unless explicit recurrence evidence starts a linked episode.`,
    'A new body-region episode does not establish a specific anatomical structure or diagnosis.',
  ];

  return {
    schema_version: 'irris-episode-timeline-v0',
    player_id: playerIds[0] ?? null,
    episode_gap_days: episodeGapDays,
    episodes,
    caveats,
  };
};
