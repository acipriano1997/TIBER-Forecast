import type {
  IrrisAssessment,
  IrrisBodyRegion,
  IrrisEvidence,
  IrrisEvidenceFeatures,
  IrrisFunctionalLimitations,
  IrrisInjuryCandidate,
  IrrisInjuryFamily,
  IrrisNarrativeDivergence,
  IrrisReadinessForecast,
  IrrisRecoveryForecast,
  IrrisRequest,
  IrrisScenarioMixture,
  IrrisSeverity,
} from '../../contracts/irris.js';

export const IRRIS_MODEL_VERSION = 'irris-v0.1.0';

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const round = (value: number) => Number(value.toFixed(4));

const SOURCE_MULTIPLIER: Record<IrrisEvidence['source_kind'], number> = {
  official_injury_report: 1,
  official_transaction: 1,
  team_statement: 0.75,
  coach_statement: 0.68,
  player_statement: 0.58,
  medical_reporting: 0.95,
  national_reporter: 0.88,
  beat_reporter: 0.82,
  practice_observation: 0.86,
  video_observation: 0.78,
  game_observation: 0.82,
  workload_data: 0.9,
  travel_data: 0.9,
  weather_data: 0.9,
  other: 0.5,
};

const REGION_PRIORS: Record<IrrisBodyRegion, Partial<Record<IrrisInjuryFamily, number>>> = {
  head: { concussion: 0.82, other_or_unknown: 0.18 },
  neck: { other_or_unknown: 1 },
  shoulder: { shoulder_sprain_or_contusion: 0.82, other_or_unknown: 0.18 },
  arm: { other_or_unknown: 1 },
  elbow: { other_or_unknown: 1 },
  wrist_hand: { other_or_unknown: 1 },
  back: { other_or_unknown: 1 },
  hip: { other_or_unknown: 1 },
  groin_adductor: { groin_adductor_strain: 0.86, other_or_unknown: 0.14 },
  quadriceps: { quadriceps_strain: 0.86, other_or_unknown: 0.14 },
  hamstring: { hamstring_strain: 0.9, other_or_unknown: 0.1 },
  knee: {
    acl_injury: 0.18,
    mcl_injury: 0.2,
    meniscus_injury: 0.18,
    knee_contusion_or_sprain: 0.36,
    other_or_unknown: 0.08,
  },
  calf: { calf_strain: 0.64, achilles_injury: 0.18, other_or_unknown: 0.18 },
  achilles: { achilles_injury: 0.82, calf_strain: 0.08, other_or_unknown: 0.1 },
  ankle: {
    lateral_ankle_sprain: 0.48,
    syndesmotic_ankle_sprain: 0.3,
    ankle_bone_injury: 0.1,
    achilles_injury: 0.04,
    other_or_unknown: 0.08,
  },
  foot_toe: { foot_or_toe_injury: 0.88, other_or_unknown: 0.12 },
  illness: { illness: 0.94, other_or_unknown: 0.06 },
  other: { other_or_unknown: 1 },
  unknown: { other_or_unknown: 1 },
};

const DIAGNOSIS_TERMS: Array<[RegExp, IrrisInjuryFamily]> = [
  [/concuss/i, 'concussion'],
  [/high[- ]ankle|syndes/i, 'syndesmotic_ankle_sprain'],
  [/lateral ankle|low ankle|ankle sprain/i, 'lateral_ankle_sprain'],
  [/fracture|bone injury/i, 'ankle_bone_injury'],
  [/achilles/i, 'achilles_injury'],
  [/\bacl\b|anterior cruciate/i, 'acl_injury'],
  [/\bmcl\b|medial collateral/i, 'mcl_injury'],
  [/menisc/i, 'meniscus_injury'],
  [/hamstring/i, 'hamstring_strain'],
  [/calf/i, 'calf_strain'],
  [/groin|adductor/i, 'groin_adductor_strain'],
  [/quad/i, 'quadriceps_strain'],
  [/shoulder/i, 'shoulder_sprain_or_contusion'],
  [/toe|foot/i, 'foot_or_toe_injury'],
  [/illness|flu|virus|viral/i, 'illness'],
];

const recoveryPriors: Record<IrrisInjuryFamily, Record<IrrisSeverity, [number, number, number, number, number]>> = {
  concussion: {
    mild: [0.38, 0.4, 0.13, 0.05, 0.04],
    moderate: [0.16, 0.34, 0.24, 0.14, 0.12],
    severe: [0.06, 0.16, 0.19, 0.2, 0.39],
  },
  lateral_ankle_sprain: {
    mild: [0.46, 0.34, 0.12, 0.05, 0.03],
    moderate: [0.16, 0.31, 0.27, 0.14, 0.12],
    severe: [0.04, 0.11, 0.19, 0.22, 0.44],
  },
  syndesmotic_ankle_sprain: {
    mild: [0.22, 0.31, 0.25, 0.13, 0.09],
    moderate: [0.06, 0.17, 0.27, 0.23, 0.27],
    severe: [0.01, 0.04, 0.08, 0.13, 0.74],
  },
  ankle_bone_injury: {
    mild: [0.08, 0.17, 0.22, 0.2, 0.33],
    moderate: [0.02, 0.06, 0.12, 0.16, 0.64],
    severe: [0, 0.01, 0.03, 0.05, 0.91],
  },
  achilles_injury: {
    mild: [0.12, 0.2, 0.2, 0.18, 0.3],
    moderate: [0.02, 0.05, 0.08, 0.1, 0.75],
    severe: [0, 0, 0.01, 0.02, 0.97],
  },
  acl_injury: {
    mild: [0.04, 0.08, 0.12, 0.13, 0.63],
    moderate: [0.01, 0.02, 0.04, 0.05, 0.88],
    severe: [0, 0, 0, 0.01, 0.99],
  },
  mcl_injury: {
    mild: [0.24, 0.3, 0.22, 0.12, 0.12],
    moderate: [0.07, 0.17, 0.25, 0.2, 0.31],
    severe: [0.01, 0.04, 0.08, 0.12, 0.75],
  },
  meniscus_injury: {
    mild: [0.18, 0.24, 0.22, 0.16, 0.2],
    moderate: [0.05, 0.12, 0.18, 0.18, 0.47],
    severe: [0.01, 0.03, 0.06, 0.09, 0.81],
  },
  knee_contusion_or_sprain: {
    mild: [0.5, 0.29, 0.12, 0.05, 0.04],
    moderate: [0.2, 0.31, 0.23, 0.13, 0.13],
    severe: [0.04, 0.1, 0.16, 0.18, 0.52],
  },
  hamstring_strain: {
    mild: [0.29, 0.36, 0.2, 0.09, 0.06],
    moderate: [0.08, 0.19, 0.27, 0.21, 0.25],
    severe: [0.01, 0.04, 0.08, 0.12, 0.75],
  },
  calf_strain: {
    mild: [0.3, 0.35, 0.19, 0.09, 0.07],
    moderate: [0.09, 0.2, 0.25, 0.2, 0.26],
    severe: [0.01, 0.04, 0.08, 0.12, 0.75],
  },
  groin_adductor_strain: {
    mild: [0.35, 0.34, 0.17, 0.08, 0.06],
    moderate: [0.11, 0.22, 0.25, 0.19, 0.23],
    severe: [0.02, 0.05, 0.09, 0.13, 0.71],
  },
  quadriceps_strain: {
    mild: [0.34, 0.34, 0.18, 0.08, 0.06],
    moderate: [0.11, 0.22, 0.25, 0.19, 0.23],
    severe: [0.02, 0.05, 0.09, 0.13, 0.71],
  },
  shoulder_sprain_or_contusion: {
    mild: [0.44, 0.31, 0.14, 0.06, 0.05],
    moderate: [0.16, 0.28, 0.24, 0.14, 0.18],
    severe: [0.03, 0.08, 0.13, 0.16, 0.6],
  },
  foot_or_toe_injury: {
    mild: [0.36, 0.32, 0.17, 0.08, 0.07],
    moderate: [0.12, 0.23, 0.23, 0.17, 0.25],
    severe: [0.02, 0.05, 0.09, 0.13, 0.71],
  },
  illness: {
    mild: [0.62, 0.27, 0.07, 0.02, 0.02],
    moderate: [0.34, 0.37, 0.16, 0.07, 0.06],
    severe: [0.13, 0.27, 0.24, 0.14, 0.22],
  },
  other_or_unknown: {
    mild: [0.4, 0.3, 0.15, 0.08, 0.07],
    moderate: [0.16, 0.25, 0.23, 0.16, 0.2],
    severe: [0.04, 0.1, 0.15, 0.17, 0.54],
  },
};

const normalizeRecord = <K extends string>(record: Record<K, number>): Record<K, number> => {
  const total = Object.values(record).reduce((sum, value) => sum + Number(value), 0);
  if (total <= 0) return record;
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, Number(value) / total])) as Record<K, number>;
};

const evidenceWeight = (evidence: IrrisEvidence) => clamp(evidence.source_quality) * SOURCE_MULTIPLIER[evidence.source_kind];

const eligibleEvidence = (request: IrrisRequest) => {
  const asOf = Date.parse(request.as_of);
  if (!Number.isFinite(asOf)) throw new Error('IRRIS request as_of must be a valid timestamp');
  const eligible: IrrisEvidence[] = [];
  const future: IrrisEvidence[] = [];
  const invalid: IrrisEvidence[] = [];

  for (const evidence of request.evidence) {
    const knownAt = Date.parse(evidence.known_at);
    if (!Number.isFinite(knownAt)) {
      invalid.push(evidence);
    } else if (knownAt <= asOf) {
      eligible.push(evidence);
    } else {
      future.push(evidence);
    }
  }
  return { eligible, future, invalid };
};

const inferRegion = (request: IrrisRequest, evidence: IrrisEvidence[]): IrrisBodyRegion => {
  const scores = new Map<IrrisBodyRegion, number>();
  if (request.official?.body_region) scores.set(request.official.body_region, 1.2);
  for (const item of evidence) {
    if (!item.body_region) continue;
    scores.set(item.body_region, (scores.get(item.body_region) ?? 0) + evidenceWeight(item));
  }
  return [...scores.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'unknown';
};

const multiply = (scores: Partial<Record<IrrisInjuryFamily, number>>, family: IrrisInjuryFamily, factor: number) => {
  scores[family] = (scores[family] ?? 0.01) * factor;
};

const featureAdjustments = (
  scores: Partial<Record<IrrisInjuryFamily, number>>,
  features: IrrisEvidenceFeatures,
  weight: number,
  region: IrrisBodyRegion,
) => {
  const boost = (family: IrrisInjuryFamily, strength: number) => multiply(scores, family, 1 + strength * weight);
  const suppress = (family: IrrisInjuryFamily, strength: number) => multiply(scores, family, Math.max(0.08, 1 - strength * weight));

  if (features.external_rotation && features.planted_foot && region === 'ankle') boost('syndesmotic_ankle_sprain', 2.8);
  if (features.inversion && region === 'ankle') boost('lateral_ankle_sprain', 2.4);
  if (features.imaging_negative_fracture) suppress('ankle_bone_injury', 0.85);
  if (features.non_contact && features.immediate_stop && region === 'knee') boost('acl_injury', 2.2);
  if (features.hyperextension && region === 'knee') {
    boost('acl_injury', 1.2);
    boost('knee_contusion_or_sprain', 0.8);
  }
  if (features.non_contact && features.immediate_stop && (region === 'calf' || region === 'achilles')) boost('achilles_injury', 2.5);
  if (features.sprinting && features.immediate_stop && region === 'hamstring') boost('hamstring_strain', 1.8);
  if (features.concussion_protocol || (region === 'head' && features.immediate_stop)) boost('concussion', 2.5);
}

const inferSeverity = (family: IrrisInjuryFamily, evidence: IrrisEvidence[]) => {
  const raw: Record<IrrisSeverity, number> = { mild: 0.45, moderate: 0.4, severe: 0.15 };
  const adjust = (key: IrrisSeverity, amount: number) => { raw[key] += amount; };

  for (const item of evidence) {
    const w = evidenceWeight(item);
    const f = item.features ?? {};
    if (f.returned_to_game) adjust('mild', 0.75 * w);
    if (f.practice_full) adjust('mild', 0.65 * w);
    if (f.practice_limited) adjust('moderate', 0.45 * w);
    if (f.practice_dnp) adjust('moderate', 0.55 * w);
    if (f.immediate_stop && !f.returned_to_game) adjust('moderate', 0.45 * w);
    if (f.visible_limp) adjust('moderate', 0.3 * w);
    if (f.unable_to_bear_weight) adjust('severe', 0.8 * w);
    if (f.carted) adjust('severe', 0.55 * w);
    if (f.structural_damage_reported) adjust('severe', 1.05 * w);
    if (f.surgery_reported) adjust('severe', 1.5 * w);
  }

  if (family === 'acl_injury' || family === 'achilles_injury') raw.severe += 1.1;
  if (family === 'ankle_bone_injury') raw.severe += 0.55;
  return normalizeRecord(raw);
};

const inferDifferential = (request: IrrisRequest, evidence: IrrisEvidence[]): IrrisInjuryCandidate[] => {
  const region = inferRegion(request, evidence);
  const raw: Partial<Record<IrrisInjuryFamily, number>> = { ...REGION_PRIORS[region] };

  for (const item of evidence) {
    const w = evidenceWeight(item);
    const text = `${item.reported_diagnosis ?? ''} ${item.text ?? ''}`;
    for (const [pattern, family] of DIAGNOSIS_TERMS) {
      if (pattern.test(text)) multiply(raw, family, 1 + 5 * w);
    }
    if (item.features) featureAdjustments(raw, item.features, w, region);
  }

  const normalized = normalizeRecord(raw as Record<IrrisInjuryFamily, number>);
  return Object.entries(normalized)
    .map(([family, probability]) => {
      const injuryFamily = family as IrrisInjuryFamily;
      const supporting = evidence
        .filter((item) => {
          const text = `${item.reported_diagnosis ?? ''} ${item.text ?? ''}`;
          return DIAGNOSIS_TERMS.some(([pattern, mapped]) => mapped === injuryFamily && pattern.test(text));
        })
        .map((item) => item.evidence_id);
      return {
        injury_family: injuryFamily,
        probability: round(probability),
        severity: Object.fromEntries(Object.entries(inferSeverity(injuryFamily, evidence)).map(([k, v]) => [k, round(v)])) as Record<IrrisSeverity, number>,
        supporting_evidence_ids: supporting,
        contradicting_evidence_ids: [],
      };
    })
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 5);
};

const severityBurden = (differential: IrrisInjuryCandidate[]) => differential.reduce(
  (total, candidate) => total + candidate.probability * (candidate.severity.mild * 0.15 + candidate.severity.moderate * 0.55 + candidate.severity.severe),
  0,
);

const weightedRecovery = (differential: IrrisInjuryCandidate[]): [number, number, number, number, number] => {
  const buckets = [0, 0, 0, 0, 0];
  let represented = 0;
  for (const candidate of differential) {
    represented += candidate.probability;
    for (const severity of ['mild', 'moderate', 'severe'] as const) {
      const weight = candidate.probability * candidate.severity[severity];
      const prior = recoveryPriors[candidate.injury_family][severity];
      prior.forEach((value, index) => { buckets[index] += weight * value; });
    }
  }
  const denominator = represented || 1;
  return buckets.map((value) => value / denominator) as [number, number, number, number, number];
};

const availabilityEvidenceAdjustment = (evidence: IrrisEvidence[]) => {
  let logitShift = 0;
  for (const item of evidence) {
    const w = evidenceWeight(item);
    if (item.features?.expected_active) logitShift += 1.2 * w;
    if (item.features?.expected_inactive) logitShift -= 1.8 * w;
    if (item.features?.practice_full) logitShift += 0.55 * w;
    if (item.features?.practice_dnp) logitShift -= 0.35 * w;
    if (item.features?.returned_to_game) logitShift += 0.45 * w;
  }
  return logitShift;
};

const logistic = (x: number) => 1 / (1 + Math.exp(-x));
const logit = (p: number) => Math.log(clamp(p, 0.01, 0.99) / (1 - clamp(p, 0.01, 0.99)));

const inferRecovery = (request: IrrisRequest, differential: IrrisInjuryCandidate[], evidence: IrrisEvidence[]): IrrisRecoveryForecast => {
  const pmf = weightedRecovery(differential);
  let active = logistic(logit(pmf[0]) + availabilityEvidenceAdjustment(evidence));
  const status = request.official?.game_status;
  if (status === 'inactive' || status === 'out' || status === 'ir' || status === 'pup' || status === 'nfi') active = 0;
  if (status === 'doubtful') active = Math.min(active, 0.25);

  const burden = severityBurden(differential);
  const fullWorkload = active * clamp(1 - burden * 0.72, 0.08, 0.96);
  const cumulative = pmf.reduce<number[]>((acc, value, index) => {
    acc[index] = value + (acc[index - 1] ?? 0);
    return acc;
  }, []);
  const medianIndex = cumulative.findIndex((value) => value >= 0.5);
  const medianBucket = (['0', '1', '2', '3', '4+'][medianIndex < 0 ? 4 : medianIndex]) as IrrisRecoveryForecast['median_games_missed_bucket'];
  const top = differential[0];
  const recurrence = request.player.recent_return_from_same_region_injury || (request.player.prior_same_region_episodes ?? 0) > 0;
  const softTissue = top && ['hamstring_strain', 'calf_strain', 'groin_adductor_strain', 'quadriceps_strain'].includes(top.injury_family);
  const recurrenceRisk = recurrence && softTissue ? 'high' : recurrence || softTissue ? 'elevated' : top?.injury_family === 'other_or_unknown' ? 'unknown' : 'baseline';
  const lagMedian = Math.max(0, Math.round(burden * 3));

  return {
    games_missed_probability: { zero: round(pmf[0]), one: round(pmf[1]), two: round(pmf[2]), three: round(pmf[3]), four_plus: round(pmf[4]) },
    active_next_game_probability: round(active),
    full_workload_next_game_probability: round(fullWorkload),
    median_games_missed_bucket: medianBucket,
    return_to_workload_lag_games: { low: 0, median: lagMedian, high: Math.max(1, lagMedian + 2) },
    return_to_performance_lag_games: { low: 0, median: Math.max(lagMedian, 1), high: Math.max(2, lagMedian + 3) },
    recurrence_risk: recurrenceRisk,
  };
};

const inferReadiness = (request: IrrisRequest): IrrisReadinessForecast => {
  const w = request.workload;
  const drivers: string[] = [];
  if (!w) return { score: 70, label: 'high_uncertainty', uncertainty: 0.75, drivers: ['workload context unavailable'] };

  let score = 74;
  let known = 0;
  const use = (condition: boolean | undefined, delta: number, label: string) => {
    if (condition === undefined) return;
    known += 1;
    if (condition) { score += delta; drivers.push(label); }
  };

  if (w.hours_since_last_game !== undefined) {
    known += 1;
    if (w.hours_since_last_game < 110) { score -= 8; drivers.push('compressed recovery interval'); }
    if (w.hours_since_last_game >= 180) { score += 4; drivers.push('extended recovery interval'); }
  }
  if (w.last_game_snaps !== undefined && w.recent_avg_snaps && w.recent_avg_snaps > 0) {
    known += 1;
    const ratio = w.last_game_snaps / w.recent_avg_snaps;
    if (ratio > 1.25) { score -= 9; drivers.push('snap workload spike'); }
    else if (ratio > 1.1) { score -= 4; drivers.push('modest snap workload increase'); }
  }
  if (w.last_game_opportunities !== undefined && w.recent_avg_opportunities && w.recent_avg_opportunities > 0) {
    known += 1;
    if (w.last_game_opportunities / w.recent_avg_opportunities > 1.3) { score -= 8; drivers.push('opportunity workload spike'); }
  }
  use(w.overtime_last_game, -4, 'overtime exposure');
  use(w.international_travel, -6, 'international travel');
  use((w.travel_time_zones ?? 0) >= 3, -4, 'multi-time-zone travel');
  use((w.heat_stress_index ?? 0) >= 0.75, -5, 'high environmental heat stress');
  use(w.illness_reported, -12, 'reported illness');
  use(w.bye_week_last_week, 8, 'bye-week recovery');
  use(request.player.recent_return_from_same_region_injury, -7, 'recent return from injury');

  score = clamp(score, 0, 100);
  const uncertainty = clamp(1 - known / 10, 0.12, 0.8);
  const label = uncertainty > 0.62
    ? 'high_uncertainty'
    : score >= 85 ? 'fresh' : score >= 65 ? 'normal' : score >= 45 ? 'loaded' : 'depleted';
  return { score: round(score), label, uncertainty: round(uncertainty), drivers };
};

const inferScenarios = (recovery: IrrisRecoveryForecast, differential: IrrisInjuryCandidate[], readiness: IrrisReadinessForecast): IrrisScenarioMixture => {
  const active = recovery.active_next_game_probability;
  const burden = severityBurden(differential);
  const recurrencePenalty = recovery.recurrence_risk === 'high' ? 0.11 : recovery.recurrence_risk === 'elevated' ? 0.06 : 0;
  const readinessPenalty = readiness.label === 'depleted' ? 0.07 : readiness.label === 'loaded' ? 0.03 : 0;
  const earlyExitRate = clamp(0.035 + burden * 0.18 + recurrencePenalty + readinessPenalty, 0.02, 0.4);
  const limitedRate = clamp(0.08 + burden * 0.62, 0.06, 0.72);
  const earlyExit = active * earlyExitRate;
  const limited = active * Math.min(limitedRate, 1 - earlyExitRate);
  const normal = Math.max(0, active - earlyExit - limited);
  return {
    inactive: round(1 - active),
    active_normal: round(normal),
    active_limited: round(limited),
    active_early_exit: round(earlyExit),
  };
};

const blankLimitations = (): IrrisFunctionalLimitations => ({
  acceleration: 0, top_speed: 0, deceleration: 0, lateral_cutting: 0, power: 0,
  throwing: 0, grip_catching: 0, contact_tolerance: 0, endurance: 0,
});

const inferFunctionalLimitations = (request: IrrisRequest, differential: IrrisInjuryCandidate[]): IrrisFunctionalLimitations => {
  const result = blankLimitations();
  const top = differential[0];
  if (!top) return result;
  const magnitude = clamp(severityBurden(differential), 0, 1);
  const set = (keys: Array<keyof IrrisFunctionalLimitations>, multiplier = 1) => keys.forEach((key) => { result[key] = round(clamp(magnitude * multiplier)); });

  switch (top.injury_family) {
    case 'hamstring_strain': case 'calf_strain':
      set(['acceleration', 'top_speed', 'deceleration', 'endurance'], 0.95); set(['lateral_cutting'], 0.7); break;
    case 'groin_adductor_strain':
      set(['acceleration', 'deceleration', 'lateral_cutting'], 0.9); set(['top_speed'], 0.6); break;
    case 'quadriceps_strain':
      set(['acceleration', 'deceleration', 'power'], 0.9); break;
    case 'lateral_ankle_sprain': case 'syndesmotic_ankle_sprain': case 'foot_or_toe_injury':
      set(['acceleration', 'deceleration', 'lateral_cutting', 'power'], 0.9); break;
    case 'acl_injury': case 'mcl_injury': case 'meniscus_injury': case 'knee_contusion_or_sprain':
      set(['acceleration', 'deceleration', 'lateral_cutting', 'power'], 0.95); break;
    case 'shoulder_sprain_or_contusion':
      set(['contact_tolerance'], 0.9); if (request.player.position === 'QB') set(['throwing'], 0.95); else set(['grip_catching'], 0.65); break;
    case 'concussion': set(['contact_tolerance', 'endurance'], 0.55); break;
    case 'illness': set(['endurance'], 0.9); break;
    default: set(['endurance'], 0.25);
  }
  return result;
};

const inferNarrativeDivergence = (request: IrrisRequest, differential: IrrisInjuryCandidate[], recovery: IrrisRecoveryForecast): IrrisNarrativeDivergence => {
  const tone = request.official?.narrative_tone ?? 'unknown';
  if (tone === 'unknown') return { level: 'unknown', score: 0, explanation: ['no structured official narrative tone supplied'] };
  const burden = severityBurden(differential);
  const inferredConcern = clamp((1 - recovery.active_next_game_probability) * 0.6 + burden * 0.4);
  const narrativeConcern = tone === 'concerning' ? 0.85 : tone === 'neutral' ? 0.5 : 0.15;
  const score = Math.abs(inferredConcern - narrativeConcern);
  const level = score >= 0.5 ? 'high' : score >= 0.25 ? 'moderate' : 'low';
  return {
    level,
    score: round(score),
    explanation: [
      `official narrative tone=${tone}`,
      `model concern=${round(inferredConcern)}`,
      'divergence compares public narrative framing with model-inferred availability/severity, not with private team medical truth',
    ],
  };
};

const confidenceScore = (evidence: IrrisEvidence[], differential: IrrisInjuryCandidate[]) => {
  if (evidence.length === 0) return 0.12;
  const quality = evidence.reduce((sum, item) => sum + evidenceWeight(item), 0) / evidence.length;
  const concentration = differential[0]?.probability ?? 0;
  const breadth = Math.min(1, evidence.length / 6);
  return round(clamp(quality * 0.5 + concentration * 0.3 + breadth * 0.2, 0.08, 0.96));
};

export const assessIrris = (request: IrrisRequest): IrrisAssessment => {
  const { eligible, future, invalid } = eligibleEvidence(request);
  const differential = inferDifferential(request, eligible);
  const recovery = inferRecovery(request, differential, eligible);
  const readiness = inferReadiness(request);
  const scenarios = inferScenarios(recovery, differential, readiness);
  const functionalLimitations = inferFunctionalLimitations(request, differential);
  const narrativeDivergence = inferNarrativeDivergence(request, differential, recovery);
  const concussionPossible = differential.some((candidate) => candidate.injury_family === 'concussion' && candidate.probability >= 0.15);
  const caveats = [
    'IRRIS output is model inference and is not a medically confirmed diagnosis.',
    'Team, reporter, practice and video observations are evidence inputs rather than diagnostic ground truth.',
    'Broadcast/video mechanism evidence must not be interpreted as imaging-level anatomical confirmation.',
    'Recovery priors are broad v0 priors and require empirical calibration before production recommendation authority.',
  ];
  if (eligible.length === 0) caveats.push('No temporally eligible injury evidence was supplied; inference is low-confidence.');
  if (invalid.length > 0) caveats.push(`${invalid.length} evidence item(s) had invalid known_at timestamps and were excluded.`);
  if (concussionPossible) caveats.push('Possible concussion: IRRIS does not predict or assert medical clearance; protocol clearance remains external ground truth.');

  return {
    schema_version: 'irris-assessment-v0',
    model_version: IRRIS_MODEL_VERSION,
    inference_status: 'model_inference_not_medically_confirmed',
    player_id: request.player.player_id,
    as_of: request.as_of,
    eligible_evidence_ids: eligible.map((item) => item.evidence_id),
    excluded_future_evidence_ids: future.map((item) => item.evidence_id),
    official: request.official ?? null,
    differential,
    recovery,
    readiness,
    scenarios,
    functional_limitations: functionalLimitations,
    narrative_divergence: narrativeDivergence,
    confidence: confidenceScore(eligible, differential),
    medical_clearance_forecast: concussionPossible ? 'not_predicted' : 'not_applicable',
    caveats,
  };
};
