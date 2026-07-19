# Review Skeleton

Use this document to prioritize review effort. Verify every finding against the current source and diff; this is not a substitute for reading either.

## Review Priorities

- Protect the correctness and interpretability of climate calculations, inferred seasons, livability classifications, comparisons, and travel-window statistics.
- Preserve the frontend-first product boundary and the manual fallback when the optional ENSO backend is unavailable.
- Check that partial external data, especially missing PM2.5 or ENSO state, degrades without corrupting or blocking unrelated analysis.
- Keep historical inference clearly separated from current observation and real-time forecasting in labels, conclusions, and visual treatment.
- Maintain Chinese and English parity across visible copy, formatting, state transitions, errors, and URL-selected language.
- Evaluate responsive behavior on both desktop and mobile, with particular attention to dense charts, legends, tooltips, touch targets, and non-overlapping controls.

## Block

Block a change when it:

- Makes a custom backend mandatory for a core workflow without an explicit product decision.
- Presents historical inference as a guaranteed or real-time forecast.
- Silently changes climate thresholds, weighting, season inference, or risk labels without a stated rationale and proportionate verification.
- Treats unavailable PM2.5 or automatic ENSO detection as a fatal failure for the main climate analysis.
- Adds user-facing behavior that is usable or understandable in only one supported language.
- Regresses a core workflow on either desktop or mobile without an intentional, documented replacement.

## High-Risk Patterns

- Date-window, year-boundary, leap-day, timezone, or cross-year travel-range handling.
- Alignment and aggregation of weather and air-quality series with different timestamps or missing values.
- Confusing a numeric zero with unavailable environmental data.
- Cache changes that can reuse stale data after a query, schema, provider, or model change.
- Error handling that converts an upstream failure into plausible-looking default results.
- Language state that disagrees between the URL, persisted preference, document metadata, and rendered copy.
- Chart resizing or localization changes that hide data, clip labels, overlap controls, or make tooltips inaccessible.
- Geocoding changes that conceal place ambiguity or select a different city without making that identity visible.

## Verification Expectations

- Run `npm run lint` and `npm run build` for code or configuration changes.
- For climate-model, aggregation, or prediction changes, use focused deterministic checks over representative dates, missing data, boundary values, and cross-year ranges. If no automated harness covers the change, record a reproducible check and add focused coverage when the risk justifies it.
- For interface or chart changes, inspect representative desktop and mobile viewports and exercise the affected interactions rather than relying only on a successful build.
- For localization changes, exercise both Chinese and English, including `?lang=zh` and `?lang=en` entry URLs.
- For ENSO integration changes, verify automatic success, backend absence, and manual selection.
- For external-data changes, verify explicit failure and partial-data paths as well as the happy path.

## Review Method

1. Establish the intended behavior from the request, `README.md`, and affected source.
2. Trace changed inputs through calculations, persisted state, and every user-facing output they influence.
3. Test the highest-risk boundary cases before cosmetic details.
4. Report concrete bugs and regressions with file and line evidence; separate confirmed findings from open assumptions.

## Boundary

Do not expand this file into a current test list, module-by-module checklist, implementation walkthrough, or record of past review findings.
