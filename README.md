# Atmosphere

[English](#english) | [中文](#中文)

---

<h2 id="english">English</h2>

Atmosphere is a localized climate analysis dashboard built with React, Vite, and ECharts. It fetches high-fidelity meteorological data via Open-Meteo and processes it into actionable, macro-level climate trends spanning the past 10 years to determine the true livability of any city.

### Features
- **10-Year Macro Climate Trend**: Visualize the evolution of season length and global livability distribution to track macro changes (e.g., urban heat island effect, global warming).
- **Cross-City PK Dashboard**: Compare the climate data of up to 8 cities simultaneously via radar charts and stacked bar charts.
- **Constitution Preferences**: A customizable engine that dynamically adjusts livability scores based on user preferences (e.g., Balanced, Heat-Averse, Cold-Averse, or Sensitive to pollution/humidity).
- **Extreme Weather Detection**: Analytically classifies days into "Scorching Summer" (≥ 35°C max / ≥ 28°C avg) and "Bitter Winter" (≤ 5°C max / ≤ 0°C avg), highlighting prolonged severe weather.
- **Latent Heat vs. Sensible Heat**: Distinct tracks for Dry-bulb Temperature and Wet-bulb Temperature to correctly visualize physical heat versus perceived sweltering humidity.
- **PM2.5 Air Quality Penalty**: Aggressive livability deductions based on AQI to account for winter smog.
- **Continuous Spell Tracking**: Detects Huinan (回南天), Dry Spells, and Humid Spells dynamically.
- **Offline Capable Local Cache**: Uses Node.js caching and memory caching for sub-second, persistent data loads.

### Development

```bash
npm install
npm run dev
```

### Build

```bash
npm run build
```

---

<h2 id="中文">中文</h2>

Atmosphere 是一款基于 React、Vite 和 ECharts 构建的硬核气象宜居分析仪。它通过 Open-Meteo 获取高精度的气象数据，并将其处理为涵盖过去 10 年的宏观气候趋势，以此推演任意城市的真实体感宜居度。

### 核心功能
- **10年宏观气候趋势**：可视化四季时长的演变和全局宜居度分布，追踪宏观环境变化（如城市热岛效应、全球变暖）。
- **跨城 PK 看板**：通过雷达图和堆叠柱状图，支持最多 8 个城市同时进行硬核气候对比。
- **体质偏好引擎**：支持根据用户的真实体质（如：标准模型、避暑体质、避寒体质、敏感体质）动态调整宜居度扣分权重。
- **极端天气侦测**：通过算法将每一天精准分类，捕捉“酷夏”（最高温 ≥ 35°C / 均温 ≥ 28°C）与“严冬”（最高温 ≤ 5°C / 均温 ≤ 0°C）。
- **显热与潜热双轨分析**：分离干球温度与湿球体感温度，直观展现纯粹的物理高温与“闷热魔法攻击”的区别。
- **PM2.5 空气质量惩罚**：基于空气质量指数（AQI）进行严厉的宜居度扣分，精准狙击冬季雾霾。
- **连续气候魔法攻击追踪**：动态侦测回南天、连续干燥期以及连续潮湿闷热期。
- **极速本地缓存**：使用 Node.js 与内存缓存，实现秒级的数据加载响应。

### 开发指南

```bash
npm install
npm run dev
```

### 生产构建

```bash
npm run build
```

## License
MIT License
