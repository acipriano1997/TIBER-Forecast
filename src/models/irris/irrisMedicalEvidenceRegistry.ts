import type { IrrisInjuryFamily } from '../../contracts/irris.js';

export type IrrisEvidenceTier = 'nfl_direct' | 'american_football' | 'elite_cross_sport' | 'methodology';

export interface IrrisMedicalEvidenceAnchor {
  id: string;
  injury_families: IrrisInjuryFamily[];
  domain: 'return_to_play' | 'return_to_performance' | 'recurrence' | 'mechanism' | 'readiness_methodology';
  tier: IrrisEvidenceTier;
  population: string;
  design: string;
  publication_year: number;
  pmid: string;
  doi: string | null;
  findings: string[];
  modeling_use: string;
  limitations: string[];
}

/**
 * Curated literature anchors for IRRIS calibration and prior review.
 *
 * These records document evidence provenance; they do not automatically turn a
 * published cohort estimate into an individualized player probability. Any
 * numeric model prior still requires an explicit calibration/promotion step.
 */
export const IRRIS_MEDICAL_EVIDENCE_REGISTRY_VERSION = 'irris-medical-evidence-v0.1.0';

export const IRRIS_MEDICAL_EVIDENCE_REGISTRY: IrrisMedicalEvidenceAnchor[] = [
  {
    id: 'hamstring-nfl-recurrence-2009-2020',
    injury_families: ['hamstring_strain'],
    domain: 'recurrence',
    tier: 'nfl_direct',
    population: 'NFL players, 2009-2020 public injury data',
    design: 'retrospective cohort',
    publication_year: 2023,
    pmid: '34878369',
    doi: '10.1080/00913847.2021.2013106',
    findings: [
      'Same-season recurrence was observed in the NFL cohort.',
      'Shorter return-to-play interval was associated with same-season recurrence.',
      'The highest reported week-by-week recurrence risk occurred among returns within two weeks.',
    ],
    modeling_use: 'Supports elevated early-return recurrence state for hamstring injuries; does not define an automatic no-play threshold.',
    limitations: ['public-data ascertainment', 'retrospective design', 'historical NFL eras', 'association is not individualized causal risk'],
  },
  {
    id: 'hamstring-uefa-mri-255',
    injury_families: ['hamstring_strain'],
    domain: 'return_to_play',
    tier: 'elite_cross_sport',
    population: 'male elite European football players, 255 grade 1-2 hamstring injuries',
    design: 'prospective cohort',
    publication_year: 2016,
    pmid: '27084882',
    doi: '10.1136/bjsports-2016-095974',
    findings: [
      'Grade 2 injuries had longer average return-to-play time than grade 1 injuries.',
      'Return-to-play variability was substantial within grades.',
      'Biceps femoris injuries had higher recurrence than the other hamstring muscles combined in this cohort.',
    ],
    modeling_use: 'Supports severity-conditioned recovery distributions rather than one fixed hamstring timetable.',
    limitations: ['soccer rather than NFL', 'MRI grade 1-2 only', 'team medical data unavailable to public fantasy models'],
  },
  {
    id: 'hamstring-clinical-prognosis-australian-football',
    injury_families: ['hamstring_strain'],
    domain: 'return_to_play',
    tier: 'elite_cross_sport',
    population: 'elite Australian football players with hamstring strain',
    design: 'prospective observational study',
    publication_year: 2010,
    pmid: '18653619',
    doi: '10.1136/bjsm.2008.048181',
    findings: [
      'Taking more than one day to walk pain-free was associated with longer return to competition.',
      'Prior hamstring injury was associated with recurrence in the study cohort.',
    ],
    modeling_use: 'Supports functional-progression and prior-episode features when such observations are publicly established.',
    limitations: ['small cohort', 'non-NFL sport', 'clinical examination detail is usually unavailable publicly'],
  },
  {
    id: 'concussion-nfl-2015-2020',
    injury_families: ['concussion'],
    domain: 'return_to_play',
    tier: 'nfl_direct',
    population: 'NFL players diagnosed with concussion, 2015-2020',
    design: 'retrospective cohort',
    publication_year: 2022,
    pmid: '36315827',
    doi: '10.1097/JSM.0000000000001050',
    findings: [
      'Median time missed was nine days in the cohort.',
      'Most diagnosed players missed at least one scheduled game.',
      'Fewer than half of Sunday-game concussions returned the following Sunday.',
    ],
    modeling_use: 'Provides population availability priors while preserving the hard rule that IRRIS cannot predict medical clearance.',
    limitations: ['protocol-era dependent', 'diagnosed concussions only', 'population statistic cannot determine individual clearance'],
  },
  {
    id: 'syndesmosis-video-mechanism-pilot',
    injury_families: ['syndesmotic_ankle_sprain', 'lateral_ankle_sprain'],
    domain: 'mechanism',
    tier: 'elite_cross_sport',
    population: '12 professional soccer players with syndesmosis injuries',
    design: 'video-mechanism pilot cohort',
    publication_year: 2023,
    pmid: '37578852',
    doi: '10.1177/24730114231195048',
    findings: [
      'External rotation with dorsiflexion was associated with higher-grade syndesmosis injury in the small cohort.',
      'Different observed mechanisms were associated with materially different return-to-play times.',
    ],
    modeling_use: 'Supports bounded mechanism likelihood updates for high-ankle versus lateral-sprain families.',
    limitations: ['very small sample', 'soccer', 'high-speed study video differs from ordinary broadcast footage'],
  },
  {
    id: 'ankle-nfl-outcomes-2015-2018',
    injury_families: ['lateral_ankle_sprain', 'syndesmotic_ankle_sprain', 'ankle_bone_injury'],
    domain: 'return_to_performance',
    tier: 'nfl_direct',
    population: 'NFL ankle injuries, 2015-2018 seasons',
    design: 'descriptive epidemiologic cohort using public data',
    publication_year: 2022,
    pmid: '35677018',
    doi: '10.1177/23259671221101056',
    findings: [
      'The cohort had a high return-to-play rate.',
      'Performance measures remained lower after ankle injury despite return to play.',
    ],
    modeling_use: 'Supports separate return-to-play and return-to-performance clocks.',
    limitations: ['public-data injury classification', 'aggregate performance metric', 'does not supply acute individualized recovery time'],
  },
  {
    id: 'acl-american-football-systematic-review',
    injury_families: ['acl_injury'],
    domain: 'return_to_play',
    tier: 'american_football',
    population: 'American football players after primary ACL reconstruction',
    design: 'systematic review',
    publication_year: 2021,
    pmid: '33195714',
    doi: null,
    findings: [
      'Across included studies, return-to-play after ACL reconstruction was incomplete and mean return time was measured in months rather than weeks.',
      'Post-return performance commonly declined relative to preinjury levels or controls.',
      'Outcomes varied by position and preinjury context.',
    ],
    modeling_use: 'Supports severe long-horizon ACL priors and position-sensitive return-to-performance uncertainty.',
    limitations: ['heterogeneous included studies', 'multiple football levels', 'surgical cases only'],
  },
  {
    id: 'acl-nfl-2013-2018',
    injury_families: ['acl_injury'],
    domain: 'return_to_performance',
    tier: 'nfl_direct',
    population: 'NFL players after ACL reconstruction, 2013-2018',
    design: 'descriptive epidemiologic cohort',
    publication_year: 2022,
    pmid: '35284583',
    doi: '10.1177/23259671221079637',
    findings: [
      'Only a subset of players returned to NFL play after ACL reconstruction.',
      'Games, starts, snap counts, and performance were lower in the postinjury period in the cohort.',
      'Return and performance varied by position.',
    ],
    modeling_use: 'Supports position-aware long-term performance uncertainty after ACL injury.',
    limitations: ['public injury database', 'career selection effects', 'does not estimate acute pre-imaging diagnosis probability'],
  },
  {
    id: 'achilles-nfl-matched-2026',
    injury_families: ['achilles_injury'],
    domain: 'return_to_performance',
    tier: 'nfl_direct',
    population: 'NFL Achilles tendon ruptures, 2008-2022, matched controls',
    design: 'retrospective matched cohort',
    publication_year: 2026,
    pmid: '42206389',
    doi: '10.1080/00913847.2026.2682120',
    findings: [
      'Return to play did not imply return to prior performance.',
      'The matched analysis reported persistent performance and career effects after Achilles rupture.',
    ],
    modeling_use: 'Supports a separate return-to-performance clock and high uncertainty after suspected major Achilles rupture.',
    limitations: ['retrospective public-data cohort', 'complete ruptures differ from lesser Achilles-region injuries'],
  },
  {
    id: 'shoulder-instability-nfl-2017',
    injury_families: ['shoulder_sprain_or_contusion'],
    domain: 'recurrence',
    tier: 'nfl_direct',
    population: '83 NFL players with in-season shoulder instability events',
    design: 'retrospective cohort',
    publication_year: 2017,
    pmid: '28941971',
    doi: null,
    findings: [
      'Nonoperative subluxation and dislocation had different return-to-play timing.',
      'Recurrent instability was common after return in the cohort.',
      'Operative repair had a substantially longer return interval but lower recurrence than nonoperative management.',
    ],
    modeling_use: 'Supports distinguishing acute return probability from recurrence and treatment-path uncertainty for shoulder instability.',
    limitations: ['instability-specific cohort', 'does not cover all shoulder pain/contusion diagnoses'],
  },
  {
    id: 'short-rest-nfl-2013-2016',
    injury_families: ['other_or_unknown'],
    domain: 'readiness_methodology',
    tier: 'nfl_direct',
    population: 'NFL games, 2013-2016',
    design: 'descriptive epidemiologic study',
    publication_year: 2020,
    pmid: '32412782',
    doi: '10.1177/0363546520919989',
    findings: [
      'Short rest was not associated with a higher overall observed in-game injury rate in the study.',
    ],
    modeling_use: 'Prevents FRIM from equating a Thursday/short-rest schedule with automatic injury-risk escalation.',
    limitations: ['game-book ascertainment', 'historical schedule era', 'population injury rate is not individual recovery status'],
  },
  {
    id: 'acwr-methodology-systematic-review-2020',
    injury_families: ['other_or_unknown'],
    domain: 'readiness_methodology',
    tier: 'methodology',
    population: 'professional/elite team-sport workload studies',
    design: 'systematic review',
    publication_year: 2020,
    pmid: '32572824',
    doi: '10.1007/s40279-020-01308-6',
    findings: [
      'Workload/injury studies used heterogeneous metrics, windows, and binning methods.',
      'The heterogeneity limits strong universal workload-threshold recommendations.',
    ],
    modeling_use: 'Supports multi-signal readiness modeling and forbids a single universal ACWR threshold.',
    limitations: ['cross-sport evidence', 'heterogeneous methodology', 'association does not establish individual causal risk'],
  },
  {
    id: 'acwr-conceptual-pitfalls-2020',
    injury_families: ['other_or_unknown'],
    domain: 'readiness_methodology',
    tier: 'methodology',
    population: 'training-load methodology literature',
    design: 'critical methodological review',
    publication_year: 2020,
    pmid: '32502973',
    doi: '10.1123/ijspp.2019-0864',
    findings: [
      'The acute:chronic workload ratio has conceptual and statistical limitations for causal injury-prevention recommendations.',
    ],
    modeling_use: 'Forbids treating ACWR as a causal standalone injury score in FRIM.',
    limitations: ['methodological critique rather than NFL outcome cohort'],
  },
];

export const getIrrisMedicalEvidenceAnchors = (family: IrrisInjuryFamily) =>
  IRRIS_MEDICAL_EVIDENCE_REGISTRY.filter((anchor) => anchor.injury_families.includes(family));
