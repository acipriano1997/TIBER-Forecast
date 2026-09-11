import { Hono } from 'hono';
import type { IrrisRequest } from '../../contracts/irris.js';
import { assessIrris } from '../../models/irris/irrisEngine.js';

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

export const registerIrrisRoutes = (app: Hono) => {
  app.post('/api/irris/assess', async (c) => {
    const body = await c.req.json().catch(() => null);
    const issues = validateRequest(body);
    if (issues.length > 0) return c.json({ ok: false, error: issues[0], issues }, 400);

    try {
      return c.json({ ok: true, assessment: assessIrris(body as IrrisRequest) }, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'IRRIS assessment failed';
      return c.json({ ok: false, error: message }, 400);
    }
  });
};
