import { describe, expect, it } from 'vitest';
import type { IrrisEvidence } from '../src/contracts/irris.js';
import { buildIrrisEpisodeTimeline } from '../src/models/irris/irrisEpisodes.js';

const row = (
  id: string,
  observedAt: string,
  bodyRegion: IrrisEvidence['body_region'],
  recurrence = false,
): IrrisEvidence => ({
  evidence_id: id,
  player_id: '00-EPISODE',
  source_kind: 'game_observation',
  claim_type: 'functional_observation',
  body_region: bodyRegion,
  observed_at: observedAt,
  known_at: observedAt,
  source_quality: 0.8,
  features: recurrence ? { same_region_recurrence: true } : {},
});

describe('buildIrrisEpisodeTimeline', () => {
  it('groups nearby same-region evidence into one continuing episode', () => {
    const timeline = buildIrrisEpisodeTimeline([
      row('onset', '2026-09-01T12:00:00Z', 'hamstring'),
      row('practice', '2026-09-05T12:00:00Z', 'hamstring'),
    ]);
    expect(timeline.episodes).toHaveLength(1);
    expect(timeline.episodes[0]!.evidence_ids).toEqual(['onset', 'practice']);
  });

  it('starts and links a new episode for explicit same-region recurrence', () => {
    const timeline = buildIrrisEpisodeTimeline([
      row('onset', '2026-09-01T12:00:00Z', 'hamstring'),
      row('recurrence', '2026-09-20T12:00:00Z', 'hamstring', true),
    ]);
    expect(timeline.episodes).toHaveLength(2);
    expect(timeline.episodes[1]!.recurrence_of_episode_id).toBe(timeline.episodes[0]!.episode_id);
    expect(timeline.episodes[1]!.recurrence_evidence_ids).toEqual(['recurrence']);
  });

  it('starts a new same-region episode after the inactivity gap', () => {
    const timeline = buildIrrisEpisodeTimeline([
      row('old', '2026-01-01T12:00:00Z', 'ankle'),
      row('new', '2026-09-01T12:00:00Z', 'ankle'),
    ]);
    expect(timeline.episodes).toHaveLength(2);
    expect(timeline.episodes[1]!.recurrence_of_episode_id).toBeNull();
  });

  it('rejects mixed-player evidence', () => {
    const other = { ...row('other', '2026-09-02T12:00:00Z', 'hamstring'), player_id: '00-OTHER' };
    expect(() => buildIrrisEpisodeTimeline([row('one', '2026-09-01T12:00:00Z', 'hamstring'), other])).toThrow('one player');
  });
});
