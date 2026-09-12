# IRRIS v0 — Injury, Recovery & Readiness Intelligence System

## Status

IRRIS is the TIBER-Forecast injury/recovery/readiness inference kernel. Current model version: `irris-v0.2.0`.

It is **model inference, not observed medical truth, not medical advice, and not a substitute for team medical clearance**. The system is intentionally capable of disagreeing with public team narratives while preserving the distinction between official facts, public reporting, observed behavior, and model inference.

Recommendation authority remains **HOLD** until governed historical/live evidence and empirical calibration gates exist.

## Repository ownership

```text
TIBER-Data
  governed public evidence + temporal provenance + raw trace
        |
        v
TIBER-Forecast / IRRIS
  probabilistic diagnosis + severity + recovery + readiness inference
        |
        v
TIBER-Fantasy
  validated consumption + explanation + decision orchestration
```

TIBER-Data owns source truth. TIBER-Forecast owns inference. TIBER-Fantasy must not duplicate the model or silently convert inference into confirmed medical fact.

## Questions IRRIS answers

IRRIS separates questions that are normally collapsed into one fantasy injury badge:

1. Which injury families best fit the evidence available at the frozen `as_of` time?
2. What is the severity distribution?
3. How likely is the player to be active next game?
4. If active, how likely is a normal workload?
5. How likely is an early exit?
6. How far might return-to-workload and return-to-performance lag behind return-to-play?
7. Is recurrence risk elevated?
8. Is the recovery/readiness state fresh, normal, loaded, depleted, or too uncertain to characterize?
9. Does the public narrative materially disagree with model inference?
10. Did new information create a material injury-news shock?

## Official status is separate from inference

An official designation is authoritative as a fact about the designation. It is not treated as a complete medical model.

A player can therefore be officially `questionable` while IRRIS assigns either high or low active probability. A player can be active while still carrying elevated limited-workload or early-exit probability.

Confirmed `inactive`, `out`, `IR`, `PUP`, or `NFI` states override model game availability when they are temporally eligible for the assessment.

Official status never gets overwritten by the inferred diagnosis.

## Frozen-as-of temporal rule

Evidence is eligible only when:

```text
known_at <= as_of
```

Later MRI reporting, practice information, corrections, reporter updates, or official status changes are excluded from earlier replays.

The same rule now applies to official state when `official.known_at` is present. Future-dated official state is excluded instead of leaking backward. A missing official timestamp is surfaced as a caveat rather than silently declared temporally certified.

Assessments expose eligible evidence IDs and future-excluded evidence IDs for replay inspection.

## TIBER-Data evidence bridge

The preferred upstream contract is `injury-evidence-v0` from TIBER-Data.

The Forecast adapter preserves:

- evidence identity;
- source identity;
- observed/reported/known timestamps;
- retrieval timestamp;
- raw payload reference;
- raw payload SHA-256;
- body region and side;
- tri-state mechanism/function observations;
- public reported diagnosis;
- per-record source quality.

`null` observations remain unknown. They are not converted to `false`.

## Independent diagnostic inference

IRRIS emits a differential diagnosis rather than forcing a single label.

Current bounded injury families include concussion, lateral ankle sprain, syndesmotic/high-ankle sprain, ankle bone injury, Achilles injury, ACL/MCL/meniscus/nonspecific knee injury, hamstring/calf/groin/quadriceps strain, shoulder sprain/contusion, foot/toe injury, illness, and other/unknown.

### Mechanism evidence

Examples of bounded v0 mechanism updates:

- planted foot + external rotation at the ankle increases syndesmotic probability;
- inversion increases lateral-ankle probability;
- non-contact immediate stop at the knee increases ACL-family probability;
- non-contact immediate stop in the calf/Achilles region increases Achilles-family probability;
- sprinting + immediate stop in the hamstring region increases hamstring-strain probability;
- concussion-protocol reporting increases concussion probability.

Mechanism evidence can support a candidate but is never represented as imaging-level confirmation.

The assessment records supporting evidence IDs. Explicit negative-fracture imaging can appear as contradicting evidence for an ankle-bone candidate.

## Source reliability doctrine

V0 does **not** encode fixed coach/team/beat/national-reporter reliability rankings.

Those multipliers were removed during hardening because source reliability must be learned from temporally valid historical calibration, not anecdote. The model currently uses the governed per-record `source_quality` field only.

Future source/team/reporting reliability must be trained and evaluated out of sample before promotion.

## Severity inference

Severity is a probability distribution over `mild`, `moderate`, and `severe`.

Signals include explicit return to game, explicit non-return after an immediate stop, visible limp, inability to bear weight, cart use, public structural-damage reporting, surgery reporting, and ordered practice progression.

A critical tri-state rule is enforced:

```text
returned_to_game = unknown
```

is **not** treated as:

```text
returned_to_game = false
```

## Practice trajectory model

Practice order matters.

IRRIS sorts practice evidence chronologically and classifies trajectories such as:

```text
DNP -> Limited -> Full      = improving
Full -> Limited -> DNP      = worsening
Limited -> Limited          = flat
DNP -> Full -> Limited      = mixed
```

The latest practice state and the trajectory independently influence severity and availability. Historical statuses are not simply summed in an order-blind manner.

## Recovery model

IRRIS models a distribution rather than a single return date.

It emits probability of missing 0, 1, 2, 3, or 4+ games, plus:

- active-next-game probability;
- full-workload-next-game probability;
- median games-missed bucket;
- return-to-workload lag interval;
- return-to-performance lag interval;
- recurrence-risk state.

Core doctrine:

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

These states are intended for downstream fantasy/tail-risk modeling rather than a generic injury percentage haircut.

## Functional limitation vector

IRRIS maps the leading diagnosis/severity burden to a bounded football-function vector:

- acceleration;
- top speed;
- deceleration;
- lateral cutting;
- power;
- throwing;
- grip/catching;
- contact tolerance;
- endurance.

Position matters. For example, a shoulder injury can load the QB throwing dimension differently from a non-QB catching/contact profile.

This is a football-model abstraction, not a clinical range-of-motion measurement.

## FRIM — Fatigue & Recovery Intelligence Model

Readiness is not a synonym for injury and short rest is not automatically treated as harmful.

Current public-data features include:

- hours since prior game;
- snap workload relative to recent baseline;
- opportunity workload relative to recent baseline;
- overtime exposure;
- multi-time-zone/international travel;
- environmental heat stress;
- reported illness;
- bye-week recovery;
- recent return from same-region injury.

The output is a readiness score plus:

```text
fresh | normal | loaded | depleted | high_uncertainty
```

Missing workload context raises uncertainty rather than fabricating a clean bill of health.

## Tissue-aware recurrence

Prior same-region episodes and recent return from a same-region injury can elevate recurrence state. Soft-tissue families receive special recurrence attention.

IRRIS does not claim access to private club GPS/training telemetry. Public workload remains a proxy.

## Narrative divergence

Structured public narrative tone (`reassuring`, `neutral`, `concerning`) is compared with model-inferred concern.

A high divergence means the public framing and model inference disagree. It does **not** mean a team physician is proven wrong; teams may possess private examination or imaging unavailable publicly.

## Injury News Shock

`compareIrrisAssessments` compares two frozen assessments for the same player and reports:

- active-probability delta;
- full-workload-probability delta;
- early-exit-probability delta;
- confidence delta;
- leading injury-family change;
- newly high narrative divergence;
- `none`, `low`, `moderate`, or `high` shock state.

This supports late-breaking alerts such as “active probability fell 27 points” or “leading diagnosis changed after new evidence.” Reverse-time comparison is rejected.

## Concussion rule

IRRIS may infer that concussion/protocol status is plausible and may estimate game availability from public evidence. It must not assert medical clearance.

When concussion probability is material:

```text
medical_clearance_forecast = not_predicted
```

No downstream consumer may translate that into “cleared” or an exact clinical recovery timetable.

## Reconciliation and learning

Postgame reconciliation scores:

- active probability with Brier score;
- full-workload probability with Brier score;
- early-exit probability with Brier score;
- four-state scenario outcome with log loss.

Calibration bins compare mean predicted probability with observed frequency. Cohort evaluation can later be segmented by injury family, position, team/reporting environment, source mix, practice trajectory, days since injury, recurrence state, readiness state, and confidence band.

A single miss is not itself a calibration conclusion. Persistent cohort error is.

## Calibration sequence before recommendation authority

1. Build a governed historical injury evidence corpus with frozen timestamps.
2. Evaluate diagnosis-family discrimination only where later public outcomes support labels.
3. Calibrate severity and games-missed distributions by injury family.
4. Calibrate active/full-workload/early-exit probabilities.
5. Learn source/team/reporting reliability from historical outcomes only.
6. Treat readiness features as challengers and retain only out-of-sample signal.
7. Measure calibration drift by season/regime.
8. Promote only after predeclared Brier/log-loss/calibration gates pass.

## V0 limitations

The current recovery/severity tables are broad deterministic v0 priors. They make the architecture executable and testable but are **not empirically certified for production recommendation authority**.

Current intentional limitations include no private medical records, no private GPS telemetry, no automatically admitted live provider, no exact anatomical grading from broadcast video, no medical-clearance prediction, no learned reporter/team reliability model yet, and no direct fantasy-point multiplier inside IRRIS.

## Fantasy translation boundary

IRRIS estimates physical state and availability. The scoring model should translate the four scenario states and functional vector into opportunity/efficiency distributions, then propagate them into median, ceiling, floor, bust probability, and teammate contingency upside.

This deliberately avoids rules such as “hamstring = -12% projection.”

## API

Protected endpoint:

```text
POST /api/irris/assess
```

It uses the existing Forecast API-key gate and returns a versioned `irris-assessment-v0` payload.

## Promotion doctrine

Code-complete experimental inference and production recommendation authority are different states.

Promotion requires a governed live/historical evidence feed, approved source use/licensing, empirical calibration gates, successful frozen-as-of replay tests, preserved fact/inference separation in TIBER-Fantasy, and reviewable reconciliation evidence.
