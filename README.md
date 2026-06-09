# Atmosphere (宜居仪 6.0)

Atmosphere is a localized climate analysis dashboard built with React, Vite, and ECharts. It fetches high-fidelity meteorological data via Open-Meteo and processes it into actionable, macro-level climate trends spanning the past 10 years.

## Features
- **10-Year Macro Climate Trend**: Visualize the evolution of season length and global livability distribution to track macro changes (e.g., urban heat island effect, global warming).
- **Extreme Weather Detection**: Analytically classifies days into "Scorching Summer" (≥ 35°C max / ≥ 28°C avg) and "Bitter Winter" (≤ 5°C max / ≤ 0°C avg), highlighting prolonged severe weather.
- **Latent Heat vs. Sensible Heat**: Distinct tracks for Dry-bulb Temperature and Wet-bulb Temperature to correctly visualize physical heat versus perceived sweltering humidity.
- **Continuous Spell Tracking**: Detects Huinan (回南天), Dry Spells, and Humid Spells dynamically.
- **Offline Capable Local Cache**: Uses `idb-keyval` for sub-second, persistent IndexedDB caching of all fetched datasets.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## License
MIT License
