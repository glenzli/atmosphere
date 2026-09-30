# Focused regression checks

Run `npm test` for deterministic Node tests of city lookup, cancellation, unavailable browser storage, missing/partial air-quality readings, wind-risk fields, calendar dates in a western timezone, and travel date boundaries. The test runner uses the existing `tsx` dependency.

The rendered UI checks use Python Playwright and Chromium. With the app running (`npm run dev:frontend`), run:

```sh
python3 tests/ui_smoke.py
```

Install Python Playwright in your own environment if needed. Set `CHROMIUM_PATH` for a non-default Chromium executable and `ATMOSPHERE_URL` for a different app address. These checks use explicitly synthetic provider responses to exercise errors, delayed responses, cancellation, comparison, preferences, keyboard focus, travel ranges, ENSO fallback, both languages, and mobile chart modes. They are separate from live Open-Meteo screenshot evidence.

Repository-wide checks remain `npm run lint` and `npm run build`. The baseline contains pre-existing lint failures; do not disable lint rules to hide them.
