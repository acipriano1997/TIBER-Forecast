import type { IrrisAssessment, IrrisInjuryFamily } from '../../contracts/irris.js';
import {
  getIrrisMedicalEvidenceAnchors,
  IRRIS_MEDICAL_EVIDENCE_REGISTRY,
  IRRIS_MEDICAL_EVIDENCE_REGISTRY_VERSION,
} from './irrisMedicalEvidenceRegistry.js';

export interface IrrisMedicalEvidenceBasis {
  registry_version: string;
  status: 'provisional_prior_evidence_not_individualized';
  diagnosis_families: Array<{
    injury_family: IrrisInjuryFamily;
    posterior_probability: number;
    anchor_ids: string[];
  }>;
  readiness_methodology_anchor_ids: string[];
  uncovered_injury_families: IrrisInjuryFamily[];
  caveats: string[];
}

export const buildIrrisMedicalEvidenceBasis = (assessment: IrrisAssessment): IrrisMedicalEvidenceBasis => {
  const families = assessment.differential.slice(0, 3).map((candidate) => {
    const anchors = getIrrisMedicalEvidenceAnchors(candidate.injury_family);
    return {
      injury_family: candidate.injury_family,
      posterior_probability: candidate.probability,
      anchor_ids: anchors.map((anchor) => anchor.id),
    };
  });
  const uncovered = families.filter((row) => row.anchor_ids.length === 0).map((row) => row.injury_family);
  const readiness = IRRIS_MEDICAL_EVIDENCE_REGISTRY
    .filter((anchor) => anchor.domain === 'readiness_methodology')
    .map((anchor) => anchor.id);

  return {
    registry_version: IRRIS_MEDICAL_EVIDENCE_REGISTRY_VERSION,
    status: 'provisional_prior_evidence_not_individualized',
    diagnosis_families: families,
    readiness_methodology_anchor_ids: readiness,
    uncovered_injury_families: uncovered,
    caveats: [
      'Registry anchors document population evidence and methodological constraints; they are not individualized medical diagnoses.',
      'V0 numeric priors remain provisional until historical calibration binds model parameters to governed outcomes.',
      'Cross-sport anchors must be treated as lower-applicability evidence than NFL-direct cohorts.',
    ],
  };
};
