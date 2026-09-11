# IRRIS v0 — Injury, Recovery & Readiness Intelligence System

## Status

IRRIS v0 is a deterministic, typed injury/recovery/readiness inference kernel in TIBER-Forecast.

It is **model inference, not observed medical truth, not medical advice, and not a substitute for team medical clearance**. It is designed to let TIBER reason independently from public team narratives while preserving the distinction between what is known, what is reported, what is observed, and what the model infers.

Current model version: `irris-v0.1.0`.

## Cross-repository ownership

```text
TIBER-Data
  governed public evidence + temporal provenance + raw trace
        |
        v
TIBER-Forecast / IRRIS
  probabilistic injury + severity + recovery + readiness inference
        |
        v
TIBER-Fantasy
  validated consumption + user-facing explanation + decision orchestration
```

TIBER-Data owns evidence truth. TIBER-Forecast owns inference. TIBER-Fantasy must not reproduce the model or silently promote inference into fact.

## Questions IRRIS answers

IRRIS separates questions that fantasy platforms usually collapse into one status icon:

1. What injury families are most consistent with the temporally eligible public evidence?
2. How uncertain is the inferred severity?
3. What is the probability of being active for the next game?
4. Conditional on being active, how likely is a normal versus limited workload?
5. What is the probability of an early exit?
6. How long might return-to-workload and return-to-performance lag behind return-to-play?
7. Is recurrence risk elevated?
8. Is the player's recovery/readiness state fresh, normal, loaded, depleted, or too uncertain to characterize?
9. Does the public/team narrative materially disagree with the model-inferred state?

## Evidence doctrine

Official designations are authoritative **facts about the designation**, not authoritative probabilities of playing normally.

IRRIS preserves official status separately from its model inference. A player may therefore be:

- officially `questionable` with a high active probability;
- officially `questionable` with a low active probability;
- officially active but with elevated limited-workload or early-exit probability;
- subject to reassuring public language while the model remains materially concerned.

Confirmed `inactive`, `out`, `IR`, `PUP`, or `NFI` states override model availability and force next-game active probability to zero for the referenced game state. Inference never rewrites the official record.

## Frozen-as-of temporal rule

Every assessment has an `as_of` timestamp. Evidence is eligible only when:

```text
known_at <= as_of
```

Later MRI reporting, practice information, corrections, or reporter updates are excluded from earlier replays. The assessment exposes both `eligible_evidence_ids` and `excluded_future_evidence_ids` so temporal leakage is inspectable.

The preferred upstream source is TIBER-Data `injury-evidence-v0`, whose adapter preserves raw-payload reference/hash and source/retrieval timestamps.

## Independent diagnostic inference

IRRIS does not force one diagnosis. It emits a differential distribution across bounded injury families plus a severity distribution for every candidate.

Current families include:

- concussion;
- lateral and syndesmotic ankle sprain;
- ankle bone injury;
- Achilles injury;
- ACL, MCL, meniscus, and nonspecific knee sprain/contusion;
- hamstring, calf, groin/adductor, and quadriceps strain;
- shoulder sprain/contusion;
- foot/toe injury;
- illness;
- other/unknown.

### Mechanism evidence

The v0 engine uses bounded mechanism likelihood adjustments. Examples:

- planted foot + external rotation at the ankle increases syndesmotic/high-ankle probability;
- inversion increases lateral-ankle probability;
- non-contact immediate stop at the knee increases ACL-family probability;
- non-contact immediate stop in the calf/Achilles region increases Achilles-family probability;
- sprinting + immediate stop in the hamstring region increases hamstring-strain probability;
- documented concussion protocol increases concussion probability.

These are model features, not diagnoses. Broadcast/video evidence must not be represented as MRI-level anatomical confirmation.

### Reported diagnosis evidence

Publicly reported diagnoses are weighted evidence and can substantially update the differential. They do not retroactively erase the earlier model state in an `as_of` replay.

## Severity inference

Severity remains probabilistic (`mild`, `moderate`, `severe`). V0 uses observations including:

- returned to game;
- full/limited/DNP practice progression;
- immediate stop and non-return;
- visible limp;
- weight-bearing difficulty;
- cart use;
- public reporting of structural damage or surgery.

Major structural injury families receive appropriately more severe priors. These are broad v0 priors and are not a substitute for calibrated injury-specific medical datasets.

## Recovery model

IRRIS models a distribution rather than a single return date.

The v0 output includes probability of missing:

- 0 games;
- 1 game;
- 2 games;
- 3 games;
- 4+ games.

It separately emits:

- active-next-game probability;
- full-workload-next-game probability;
- median games-missed bucket;
- return-to-workload lag interval;
- return-to-performance lag interval;
- recurrence-risk state.

This enforces the doctrine:

```text
return to play != return to workload != return to performance != healed
```

## Scenario mixture

Every assessment produces a normalized four-state mixture:

```text
inactive
active_normal
active_limited
active_early_exit
```

These states are designed to become inputs to downstream fantasy-point/tail-risk modeling. They are intentionally not collapsed to one projection multiplier inside IRRIS.

## Functional limitation vector

IRRIS translates the leading injury family/severity burden into a bounded functional vector:

- acceleration;
- top speed;
- deceleration;
- lateral cutting;
- power;
- throwing;
- grip/catching;
- contact tolerance;
- endurance.

Position changes the interpretation. For example, a shoulder injury can affect a QB's throwing dimension more directly than a non-QB's.

The vector is a model abstraction for downstream football modeling, not a clinical range-of-motion measurement.

## FRIM — Fatigue & Recovery Intelligence Model

The readiness layer deliberately does not treat “short week” as synonymous with injury or depletion.

V0 combines available signals such as:

- hours since previous game;
- snap workload relative to the player's recent baseline;
- opportunity workload relative to baseline;
- overtime exposure;
- multi-time-zone/international travel;
- environmental heat stress;
- reported illness;
- bye-week recovery;
- recent return from a same-region injury.

The output is a continuous readiness score plus an interpretable label:

```text
fresh | normal | loaded | depleted | high_uncertainty
```

Missing workload context increases uncertainty rather than inventing a neutral-perfect state.

## Tissue-aware recurrence

Recent return from a same-region injury and prior same-region episodes can elevate recurrence state. Soft-tissue families receive special recurrence attention.

V0 does not yet claim individualized tissue load from private GPS/training telemetry. Public workload is a proxy and uncertainty must remain visible.

## Narrative divergence

IRRIS can compare structured team/public narrative tone (`reassuring`, `neutral`, `concerning`) against the model-inferred concern state.

The resulting divergence score means:

> public narrative framing and model inference disagree

It does **not** mean:

> the team physician is wrong

Teams may possess examination/imaging information unavailable publicly. Divergence is useful because public fantasy decisions occur under public information constraints.

## Concussion rule

IRRIS may infer that a concussion/protocol state is plausible and may forecast game availability from public evidence. It must not assert medical clearance.

When concussion probability is material, output uses:

```text
medical_clearance_forecast = not_predicted
```

No downstream consumer may convert this into “cleared” or an exact medical-resolution timetable.

## Reconciliation and learning

`irrisReconciliation.ts` evaluates forecasts after the game using proper scoring rules:

- Brier score for active probability;
- Brier score for full-workload probability;
- Brier score for early-exit probability;
- log loss for the four-state realized scenario.

Cohort calibration bins compare mean predicted probability with observed frequency. Calibration should be analyzed by dimensions such as:

- injury family;
- position;
- team/coach/reporting environment;
- source mix;
- practice trajectory;
- days since injury;
- recurrence state;
- readiness state;
- confidence band.

A single miss is not automatically a model failure. Persistent calibration error is.

## Planned empirical calibration sequence

Before IRRIS receives recommendation authority:

1. Backfill a source-governed historical injury evidence corpus with frozen timestamps.
2. Evaluate diagnosis-family discrimination only where a later public diagnosis/outcome is supportable.
3. Calibrate severity and games-missed distributions by injury family.
4. Calibrate active/full-workload/early-exit probabilities.
5. Learn source/team/reporting reliability only from temporally valid historical outcomes.
6. Test readiness features as challengers; retain only features with out-of-sample value.
7. Measure calibration drift by season/regime.
8. Promote only after predeclared Brier/log-loss/calibration gates pass.

No source/team reliability weight should be promoted from anecdote alone.

## V0 priors and limitations

The current recovery/severity tables are intentionally broad deterministic v0 priors. They make the architecture executable and testable but are **not yet empirically certified for production recommendation authority**.

Current intentional limitations:

- no private club medical records or GPS telemetry;
- no live provider automatically admitted by this code;
- no autonomous diagnosis claim;
- no exact anatomical grading from broadcast video;
- no medical-clearance prediction;
- no calibrated team/coach/reporter reliability model yet;
- no direct fantasy-point multiplier inside IRRIS;
- no recommendation authority until historical calibration gates are passed.

## Why fantasy-point translation is downstream

IRRIS should estimate the physical/availability state. The scoring model should decide how those states change fantasy outcomes.

A future TIBER-Forecast scoring integration should condition opportunity and efficiency distributions on the four IRRIS scenarios and functional vector, then propagate those mixtures into median, ceiling, floor, bust probability, and teammate contingency upside. This avoids hard-coding a generic “hamstring = -12%” rule.

## API

Protected compute endpoint:

```text
POST /api/irris/assess
```

The route uses the existing Forecast API-key gate. It accepts a typed IRRIS request and returns a versioned assessment.

## Promotion doctrine

IRRIS v0 implementation status and recommendation authority are separate concepts.

The subsystem may be code-complete as an experimental inference kernel while remaining **HOLD for production recommendation authority** until:

- a governed live/historical evidence feed exists;
- source use/licensing is approved;
- empirical calibration gates are defined and passed;
- temporal replay tests show no future leakage;
- downstream TIBER-Fantasy preserves inference/fact separation;
- calibration/reconciliation evidence is reviewable.
