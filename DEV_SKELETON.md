# Development Skeleton

This document is durable orientation, not implementation authority. Read the current source before making claims or changes; when this document and the source disagree, the source wins.

## Product Purpose

- Help people evaluate cities for living, relocation, comparison, and travel timing through real-feel climate livability.
- Turn roughly ten years of daily historical climate data into inspectable yearly views, long-term trends, cross-city comparisons, and travel-window estimates.

## Non-Goals

- Atmosphere is not a current-weather application or a real-time weather forecast.
- Travel outlooks are historical statistical inferences, not promises about future conditions.
- Core climate exploration must not require a custom backend service.
- Fixed calendar seasons and coarse monthly averages are not substitutes for the project's daily-data analysis.

## Sources Of Truth

- `README.md` defines the public product scope, supported workflows, data sources, and stated limitations.
- `package.json`, the lockfile, TypeScript configuration, ESLint configuration, and Vite configuration define the supported toolchain and executable checks.
- `src/` is authoritative for browser behavior, domain calculations, data access, localization, and presentation.
- `server/` is authoritative only for optional server-side enhancements.
- Generated build output and documentation screenshots are presentation artifacts, not behavioral truth.

## Durable Constraints

- The browser must retain the core search, historical analysis, trend, comparison, and travel-inference workflows without the optional server.
- The optional ENSO endpoint may improve automatic detection, but its absence must preserve a clear manual-selection path.
- Missing air-quality data must degrade independently and must not block the primary historical weather analysis.
- Results derived from historical data, heuristics, or inferred climate states must remain distinguishable from observed current conditions and real-time forecasts.
- User-facing behavior and copy must remain coherent in both Chinese and English, including `?lang=zh` and `?lang=en` entry paths.
- Desktop and mobile are both supported interaction surfaces. A change may adapt the interaction, but must preserve readability, chart meaning, and access to the same core workflows.
- External data-provider failures and ambiguous geocoding must be surfaced honestly; the interface must not silently present guessed or partial data as complete.

## Domain Assumptions

- Daily historical observations, rather than only monthly climatology, are the basis of the analysis.
- Seasons are inferred from temperature transitions and smoothing rather than assigned solely by calendar month.
- Livability categories and extreme-condition labels are model outputs whose thresholds materially affect multiple downstream results.
- Travel-window estimates use historical analogues and may use ENSO state as one input; they remain probabilistic historical guidance.
- City-name translation and geocoding can be ambiguous, so a successful lookup is not proof that the intended place was selected.

## Entry Hints

- Start with `README.md` and `package.json` for product and toolchain orientation.
- Inspect `src/api.ts` for browser-side data acquisition, aggregation, and caching work.
- Inspect `src/utils/` and `src/data/` for climate-model or travel-inference work.
- Inspect `src/App.tsx`, `src/components/`, and the relevant styles for workflow, chart, and responsive-interface work.
- Inspect `src/i18n/` for language behavior and user-facing copy.
- Inspect `server/` only when changing the optional backend capability.

## Refresh Triggers

Refresh this skeleton only when a durable boundary changes, such as product scope, the frontend/backend contract, external-data strategy, climate-model assumptions, supported languages or device classes, or repository-wide verification expectations.

Routine component changes, renamed functions, new helper files, and current implementation details do not belong here.

## Boundary

Do not turn this file into an architecture mirror, source index, API catalog, test inventory, changelog, or description of current function-level behavior.
