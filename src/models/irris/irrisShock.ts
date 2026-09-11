import type { IrrisAssessment } from '../../contracts/irris.js';

export type IrrisShockLevel = 'none' | 'low' | 'moderate' | 'high';

export interface IrrisAssessmentShock {
  schema_version: 'irris-shock-v0';
  player_id: string;
  previous_as_of: string;
  current_as_of: string;
  level: IrrisShockLevel;
  active_probability_delta: number;
  full_workload_probability_delta: number;
  early_exit_probability_delta: number;
  confidence_delta: number;
  top_injury_family_changed: boolean;
  previous_top_injury_family: string | null;
  current_top_injury_family: string | null;
  reasons: string[];
}

const round = (value: number) => Number(value.toFixed(4));

export const compareIrrisAssessments = (
  previous: IrrisAssessment,
  current: IrrisAssessment,
): IrrisAssessmentShock => {
  if (previous.player_id !== current.player_id) throw new Error('IRRIS shock comparison player_id mismatch');
  if (Date.parse(current.as_of) < Date.parse(previous.as_of)) throw new Error('IRRIS shock comparison requires nondecreasing as_of timestamps');

  const activeDelta = current.recovery.active_next_game_probability - previous.recovery.active_next_game_probability;
  const workloadDelta = current.recovery.full_workload_next_game_probability - previous.recovery.full_workload_next_game_probability;
  const earlyExitDelta = current.scenarios.active_early_exit - previous.scenarios.active_early_exit;
  const confidenceDelta = current.confidence - previous.confidence;
  const previousTop = previous.differential[0]?.injury_family ?? null;
  const currentTop = current.differential[0]?.injury_family ?? null;
  const topChanged = previousTop !== currentTop;
  const reasons: string[] = [];

  if (activeDelta <= -0.2) reasons.push(`active probability fell ${Math.abs(round(activeDelta * 100))} points`);
  else if (activeDelta <= -0.1) reasons.push(`active probability fell ${Math.abs(round(activeDelta * 100))} points`);
  if (workloadDelta <= -0.2) reasons.push(`full-workload probability fell ${Math.abs(round(workloadDelta * 100))} points`);
  else if (workloadDelta <= -0.1) reasons.push(`full-workload probability fell ${Math.abs(round(workloadDelta * 100))} points`);
  if (earlyExitDelta >= 0.12) reasons.push(`early-exit probability rose ${round(earlyExitDelta * 100)} points`);
  else if (earlyExitDelta >= 0.06) reasons.push(`early-exit probability rose ${round(earlyExitDelta * 100)} points`);
  if (topChanged) reasons.push(`leading injury family changed from ${previousTop ?? 'none'} to ${currentTop ?? 'none'}`);
  if (current.narrative_divergence.level === 'high' && previous.narrative_divergence.level !== 'high') reasons.push('official-vs-model narrative divergence became high');

  let level: IrrisShockLevel = 'none';
  if (
    activeDelta <= -0.2 ||
    workloadDelta <= -0.25 ||
    earlyExitDelta >= 0.12 ||
    (topChanged && current.confidence >= 0.65)
  ) level = 'high';
  else if (
    activeDelta <= -0.1 ||
    workloadDelta <= -0.1 ||
    earlyExitDelta >= 0.06 ||
    topChanged ||
    (current.narrative_divergence.level === 'high' && previous.narrative_divergence.level !== 'high')
  ) level = 'moderate';
  else if (
    Math.abs(activeDelta) >= 0.05 ||
    Math.abs(workloadDelta) >= 0.05 ||
    Math.abs(earlyExitDelta) >= 0.03 ||
    Math.abs(confidenceDelta) >= 0.15
  ) level = 'low';

  if (level === 'none') reasons.push('no material assessment movement');

  return {
    schema_version: 'irris-shock-v0',
    player_id: current.player_id,
    previous_as_of: previous.as_of,
    current_as_of: current.as_of,
    level,
    active_probability_delta: round(activeDelta),
    full_workload_probability_delta: round(workloadDelta),
    early_exit_probability_delta: round(earlyExitDelta),
    confidence_delta: round(confidenceDelta),
    top_injury_family_changed: topChanged,
    previous_top_injury_family: previousTop,
    current_top_injury_family: currentTop,
    reasons,
  };
};
