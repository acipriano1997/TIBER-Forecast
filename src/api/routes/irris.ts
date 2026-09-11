import { Hono } from 'hono';
import type { IrrisRequest } from '../../contracts/irris.js';
import { adaptTiberDataInjuryEvidenceArrayV0 } from '../../adapters/tiberData/injuryEvidenceV0Adapter.js';
import { assessIrris } from '../../models/irris/irrisEngine.js';
import { buildIrrisMedicalEvidenceBasis } from '../../models/irris/irrisEvidenceBasis.js';
import { buildIrrisEpisodeTimeline } from '../../models/irris/irrisEpisodes.js';

const validateRequest = (body: unknown): string[] => {
  if (!body || typeof body !== 'object') return ['request body must be an object'];
  const candidate = body as Partial<IrrisRequest>;
  const issues: string[] = [];
  if (typeof candidate.as_of !== 'string' || !Number.isFinite(Date.parse(candidate.as_of))) issues.push('as_of must be a valid ISO timestamp');
  if (!candidate.player || typeof candidate.player.player_id !== 'string') issues.push('player.player_id is required');
  if (!candidate.player || !['QB', 'RB', 'WR', 'TE'].includes(candidate.player.position ?? '')) issues.push('player.position must be QB, RB, WR, or TE');
  if (!Array.isArray(candidate.evidence)) issues.push('evidence must be an array');
  if (Array.isArray(candidate.evidence)) {
    for (const [index, evidence] of candidate.evidence.entries()) {
      if (!evidence || typeof evidence !== 'object') {
        issues.push(`evidence[${index}] must be an object`);
        continue;
      }
      if (!evidence.evidence_id) issues.push(`evidence[${index}].evidence_id is required`);
      if (!evidence.player_id) issues.push(`evidence[${index}].player_id is required`);
      if (typeof evidence.source_quality !== 'number' || evidence.source_quality < 0 || evidence.source_quality > 1) {
        issues.push(`evidence[${index}].source_quality must be between 0 and 1`);
      }
      if (!Number.isFinite(Date.parse(evidence.known_at))) issues.push(`evidence[${index}].known_at must be a valid timestamp`);
      if (!Number.isFinite(Date.parse(evidence.observed_at))) issues.push(`evidence[${index}].observed_at must be a valid timestamp`);
    }
  }
  return issues;
};

const responseFor = (request: IrrisRequest) => {
  const assessment = assessIrris(request);
  const eligibleIds = new Set(assessment.eligible_evidence_ids);
  const eligibleEvidence = request.evidence.filter((item) => eligibleIds.has(item.evidence_id));
  return {
    ok: true as const,
    assessment,
    medical_evidence_basis: buildIrrisMedicalEvidenceBasis(assessment),
    episode_timeline: buildIrrisEpisodeTimeline(eligibleEvidence),
  };
};

export const registerIrrisRoutes = (app: Hono) => {
  app.post('/api/irris/assess', async (c) => {
    const body = await c.req.json().catch(() => null);
    const issues = validateRequest(body);
    if (issues.length > 0) return c.json({ ok: false, error: issues[0], issues }, 400);

    try {
      return c.json(responseFor(body as IrrisRequest), 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'IRRIS assessment failed';
      return c.json({ ok: false, error: message }, 400);
    }
  });

  // Canonical cross-repo handoff: accepts TIBER-Data injury-evidence-v0 rows
  // directly and preserves their raw-trace provenance in the normalized model input.
  app.post('/api/irris/assess/tiber-data-v0', async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return c.json({ ok: false, error: 'request body must be an object' }, 400);
    }
    const raw = body as Record<string, unknown>;
    if (!Array.isArray(raw.evidence)) return c.json({ ok: false, error: 'evidence must be an array' }, 400);

    try {
      const normalized: IrrisRequest = {
        as_of: String(raw.as_of ?? ''),
        game_id: typeof raw.game_id === 'string' ? raw.game_id : undefined,
        player: raw.player as IrrisRequest['player'],
        official: raw.official as IrrisRequest['official'],
        workload: raw.workload as IrrisRequest['workload'],
        evidence: adaptTiberDataInjuryEvidenceArrayV0(raw.evidence),
      };
      const issues = validateRequest(normalized);
      if (issues.length > 0) return c.json({ ok: false, error: issues[0], issues }, 400);
      return c.json(responseFor(normalized), 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'TIBER-Data injury evidence adaptation failed';
      return c.json({ ok: false, error: message }, 400);
    }
  });
};
