# Engineering profile

## Recruiter-facing summary

**Venezuela Earthquake Companion Desk** is an offline-first browser prototype for low-connectivity emergency scenarios. It demonstrates how operational constraints can be translated into modular software components with explicit data contracts, behavioural tests, and clear failure states.

The project is best read as evidence of **systems thinking, constraint-driven design, and testable prototyping** rather than as an emergency-response product.

## What the repository demonstrates

- offline-first browser architecture;
- explicit local/pre-synced data assumptions;
- compact fixed-width record encoding with checksum validation;
- A* routing with mode-dependent terrain costs;
- generated-waveform AFSK TX/RX prototyping;
- solar-position and building-shadow calculations;
- SGP4/TLE-based satellite-pass logic;
- multilingual UI support;
- JSON-schema data contracts; and
- behavioural tests for higher-risk modules.

## Engineering story

The design starts from constraints instead of features:

```text
intermittent connectivity
        +
limited bandwidth
        +
stale / missing data risk
        +
human-entered observations
        |
        v
explicit module boundaries
        |
        +--> compact record codec
        +--> local routing graph
        +--> offline modem prototype
        +--> local physical/orbit calculations
        +--> explicit no-data states
        |
        v
browser-only prototype
```

## CV-ready description

> Built an offline-first emergency-scenario prototype combining fixed-width data encoding, A* terrain routing, AFSK waveform transmission, solar/shadow modelling, satellite-pass calculations, explicit JSON data contracts, and behavioural tests; designed modules around low-bandwidth operation and explicit missing-data states.

## Technical-review path

A five-minute review can focus on:

1. `modules/codec/` — fixed-width record design and corruption handling.
2. `modules/routing/` — A* routing and mode-dependent path selection.
3. `modules/modem/` — generated-waveform TX/RX round-trip.
4. `modules/digital-twin/` — solar and shadow calculations.
5. `modules/orbit/` — TLE/SGP4 logic and explicit no-data behaviour.
6. `docs/data-contracts/` — machine-readable module interfaces.

## Verification boundary

Routing and codec are treated as higher-risk modules and include behavioural tests. The repository also contains pass markers from a separate adversarial verification workflow.

That evidence should **not** be described as:

- third-party certification;
- independent safety validation;
- field-readiness approval; or
- operational emergency-response verification.

## Portfolio fit

This project complements the other public work:

- **MAILO Legal AI Engine** → Python application engineering, knowledge representation, validation, CI
- **NomadSpot Taiwan** → BFF architecture, multi-source API integration, deployment
- **Earthquake Companion Desk** → constraint-driven system design, algorithms, offline-first architecture

Together, they show breadth across **Applied AI / Knowledge Engineering / Forward Deployed Engineering-style problem solving**.

## Scope limitation

This project is a research and portfolio prototype. It should not be used to direct real rescue operations or replace official emergency-management systems.
