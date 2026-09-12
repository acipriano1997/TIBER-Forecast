export type IrrisBodyRegion =
  | 'head'
  | 'neck'
  | 'shoulder'
  | 'arm'
  | 'elbow'
  | 'wrist_hand'
  | 'back'
  | 'hip'
  | 'groin_adductor'
  | 'quadriceps'
  | 'hamstring'
  | 'knee'
  | 'calf'
  | 'achilles'
  | 'ankle'
  | 'foot_toe'
  | 'illness'
  | 'other'
  | 'unknown';

export type IrrisEvidenceSourceKind =
  | 'official_injury_report'
  | 'official_transaction'
  | 'team_statement'
  | 'coach_statement'
  | 'player_statement'
  | 'medical_reporting'
  | 'national_reporter'
  | 'beat_reporter'
  | 'practice_observation'
  | 'video_observation'
  | 'game_observation'
  | 'workload_data'
  | 'travel_data'
  | 'weather_data'
  | 'other';

export type IrrisEvidenceClaimType =
  | 'body_region'
  | 'diagnosis_reported'
  | 'severity_reported'
  | 'availability'
  | 'practice_participation'
  | 'mechanism'
  | 'functional_observation'
  | 'diagnostic_test'
  | 'treatment_device'
  | 'workload'
  | 'travel_recovery'
  | 'environmental_recovery'
  | 'narrative'
  | 'other';

export interface IrrisEvidenceFeatures {
  contact?: boolean;
  non_contact?: boolean;
  planted_foot?: boolean;
  external_rotation?: boolean;
  inversion?: boolean;
  eversion?: boolean;
  hyperextension?: boolean;
  sprinting?: boolean;
  acceleration?: boolean;
  deceleration?: boolean;
  immediate_stop?: boolean;
  returned_to_game?: boolean;
  unable_to_bear_weight?: boolean;
  visible_limp?: boolean;
  carted?: boolean;
  walking_boot?: boolean;
  crutches?: boolean;
  brace?: boolean;
  imaging_negative_fracture?: boolean;
  structural_damage_reported?: boolean;
  surgery_reported?: boolean;
  practice_dnp?: boolean;
  practice_limited?: boolean;
  practice_full?: boolean;
  first_team_reps?: boolean;
  cutting_observed?: boolean;
  sprinting_observed?: boolean;
  workload_restriction_reported?: boolean;
  game_time_decision?: boolean;
  expected_active?: boolean;
  expected_inactive?: boolean;
  same_region_recurrence?: boolean;
  concussion_protocol?: boolean;
}

export interface IrrisEvidence {
  evidence_id: string;
  player_id: string;
  source_kind: IrrisEvidenceSourceKind;
  claim_type: IrrisEvidenceClaimType;
  source_name?: string;
  source_record_id?: string;
  source_url?: string;
  body_region?: IrrisBodyRegion;
  side?: 'left' | 'right' | 'bilateral' | 'unknown';
  text?: string;
  reported_diagnosis?: string;
  observed_at: string;
  known_at: string;
  valid_for_game_id?: string;
  source_quality: number;
  features?: IrrisEvidenceFeatures;
}

export type IrrisOfficialGameStatus =
  | 'none'
  | 'questionable'
  | 'doubtful'
  | 'out'
  | 'inactive'
  | 'ir'
  | 'pup'
  | 'nfi'
  | 'unknown';

export interface IrrisOfficialState {
  game_status?: IrrisOfficialGameStatus;
  practice_status?: 'dnp' | 'limited' | 'full' | 'not_reported' | 'unknown';
  body_region?: IrrisBodyRegion;
  narrative?: string;
  narrative_tone?: 'reassuring' | 'neutral' | 'concerning' | 'unknown';
  known_at?: string;
}

export interface IrrisPlayerContext {
  player_id: string;
  position: 'QB' | 'RB' | 'WR' | 'TE';
  age?: number;
  prior_same_region_episodes?: number;
  recent_return_from_same_region_injury?: boolean;
}

export interface IrrisWorkloadContext {
  hours_since_last_game?: number;
  last_game_snaps?: number;
  recent_avg_snaps?: number;
  last_game_opportunities?: number;
  recent_avg_opportunities?: number;
  overtime_last_game?: boolean;
  travel_time_zones?: number;
  international_travel?: boolean;
  heat_stress_index?: number;
  illness_reported?: boolean;
  bye_week_last_week?: boolean;
}

export interface IrrisRequest {
  as_of: string;
  game_id?: string;
  player: IrrisPlayerContext;
  official?: IrrisOfficialState;
  evidence: IrrisEvidence[];
  workload?: IrrisWorkloadContext;
}

export type IrrisInjuryFamily =
  | 'concussion'
  | 'lateral_ankle_sprain'
  | 'syndesmotic_ankle_sprain'
  | 'ankle_bone_injury'
  | 'achilles_injury'
  | 'acl_injury'
  | 'mcl_injury'
  | 'meniscus_injury'
  | 'knee_contusion_or_sprain'
  | 'hamstring_strain'
  | 'calf_strain'
  | 'groin_adductor_strain'
  | 'quadriceps_strain'
  | 'shoulder_sprain_or_contusion'
  | 'foot_or_toe_injury'
  | 'illness'
  | 'other_or_unknown';

export type IrrisSeverity = 'mild' | 'moderate' | 'severe';

export interface IrrisInjuryCandidate {
  injury_family: IrrisInjuryFamily;
  probability: number;
  severity: Record<IrrisSeverity, number>;
  supporting_evidence_ids: string[];
  contradicting_evidence_ids: string[];
}

export interface IrrisRecoveryForecast {
  games_missed_probability: {
    zero: number;
    one: number;
    two: number;
    three: number;
    four_plus: number;
  };
  active_next_game_probability: number;
  full_workload_next_game_probability: number;
  median_games_missed_bucket: '0' | '1' | '2' | '3' | '4+';
  return_to_workload_lag_games: { low: number; median: number; high: number };
  return_to_performance_lag_games: { low: number; median: number; high: number };
  recurrence_risk: 'baseline' | 'elevated' | 'high' | 'unknown';
}

export type IrrisReadinessLabel = 'fresh' | 'normal' | 'loaded' | 'depleted' | 'high_uncertainty';

export interface IrrisReadinessForecast {
  score: number;
  label: IrrisReadinessLabel;
  uncertainty: number;
  drivers: string[];
}

export interface IrrisScenarioMixture {
  inactive: number;
  active_normal: number;
  active_limited: number;
  active_early_exit: number;
}

export interface IrrisFunctionalLimitations {
  acceleration: number;
  top_speed: number;
  deceleration: number;
  lateral_cutting: number;
  power: number;
  throwing: number;
  grip_catching: number;
  contact_tolerance: number;
  endurance: number;
}

export interface IrrisNarrativeDivergence {
  level: 'low' | 'moderate' | 'high' | 'unknown';
  score: number;
  explanation: string[];
}

export interface IrrisAssessment {
  schema_version: 'irris-assessment-v0';
  model_version: string;
  inference_status: 'model_inference_not_medically_confirmed';
  player_id: string;
  as_of: string;
  eligible_evidence_ids: string[];
  excluded_future_evidence_ids: string[];
  official: IrrisOfficialState | null;
  differential: IrrisInjuryCandidate[];
  recovery: IrrisRecoveryForecast;
  readiness: IrrisReadinessForecast;
  scenarios: IrrisScenarioMixture;
  functional_limitations: IrrisFunctionalLimitations;
  narrative_divergence: IrrisNarrativeDivergence;
  confidence: number;
  medical_clearance_forecast: 'not_applicable' | 'not_predicted';
  caveats: string[];
}
