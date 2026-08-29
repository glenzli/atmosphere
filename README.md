<p align="center">
  <img alt="Atmosphere banner" src="./public/readme/banner.png" width="100%" />
</p>

# Atmosphere

[中文](#中文) · [English](#english)

---

<a id="中文"></a>

## 中文

Atmosphere 是一个城市历史气候查看和比较工具。页面读取近十年的逐日气温、湿度、降水、风速和 PM2.5，提供按年查看、十年汇总、城市比较和旅行日期统计。

界面支持中文、英文以及桌面和移动端布局，可通过 `?lang=zh` 或 `?lang=en` 指定初始语言。Chrome 等浏览器可以将网站安装到桌面或主屏幕。

### 当前功能

- 按城市名查询 Open-Meteo 地理编码和历史数据。
- 按年份查看气温、湿球温度、表观温度、湿度、降水、风速、PM2.5、季节划分和宜居等级。
- 查看近十年的季节长度、宜居天数和温度统计。
- 同时比较最多 8 个城市。
- 按选定日期汇总历史同期数据，并按年份和 ENSO 状态调整权重。
- 按怕热、怕冷和敏感偏好调整宜居评分。

### 界面

![按年查看城市气候](./public/readme/yearly-detail.png)

*按年查看每日气候数据和计算结果。*

![查看十年趋势](./public/readme/ten-year-trend.png)

*汇总各年的季节、宜居天数和温度变化。*

![比较城市](./public/readme/city-compare.png)

*比较多个城市的气候指标。*

![旅行日期统计](./public/readme/travel-predictor.png)

*根据历史同期数据计算指定日期范围。*

### 数据与服务

- 历史天气、空气质量和城市查询来自 Open-Meteo。
- 中文城市名先通过 MyMemory 翻译，再提交给 Open-Meteo Geocoding。
- 历史 ENSO 年份标签根据 NOAA/PSL ONI 数据生成并保存在前端；可选的 `GET /api/enso` 接口从 NOAA CPC 读取当前状态。
- 历史天气缓存在 IndexedDB；语言、最近搜索和旅行日期等界面状态保存在 localStorage。

浏览器直接请求历史天气、空气质量和地理编码。Express 服务只提供当前 ENSO 状态；该接口不可用时，旅行日期页面允许手动选择 ENSO 状态。

### 运行开发版

```sh
npm install
npm run dev
```

默认地址：

- 前端：`http://localhost:5173/`
- ENSO 接口：`http://127.0.0.1:3000/`

也可以分别启动：

```sh
npm run dev:frontend
npm run dev:backend
```

生产构建和本地预览：

```sh
npm run build
npm run preview
```

构建产物位于 `dist/`。

### 当前限制

- 页面使用历史日值，当前未接入实时天气和天气预报。季节、宜居等级和旅行日期结果由历史数据与项目内规则计算。
- 空气质量请求失败时，当前实现会把缺失的 PM2.5 记为 `0`，可能影响空气质量显示和宜居评分。
- 地理编码当前使用第一个匹配结果；同名城市需要核对地区和国家。
- 安装版仍通过网络加载页面和第三方数据。IndexedDB 只保存已经读取的历史天气。

### 代码导航

- [src/api.ts](src/api.ts)：外部数据请求、缓存和日级整理
- [src/utils/analyzer.ts](src/utils/analyzer.ts)：体感、季节和宜居评分
- [src/utils/predictor.ts](src/utils/predictor.ts)：旅行日期统计
- [src/components](src/components)：图表、城市比较和旅行日期界面
- [src/i18n](src/i18n)：中英文资源与格式化
- [server/index.ts](server/index.ts)：可选的 ENSO 接口

前端使用 React、TypeScript、Vite 和 ECharts；可选服务使用 Express。完整依赖和命令见 [package.json](package.json)。

---

<a id="english"></a>

## English

Atmosphere is a tool for viewing and comparing city climate history. It reads roughly ten years of daily temperature, humidity, precipitation, wind, and PM2.5 data for yearly views, ten-year summaries, city comparison, and travel-date statistics.

The interface supports Chinese and English on desktop and mobile layouts. Use `?lang=zh` or `?lang=en` to select the initial language. Chrome and other browsers can install the site on the desktop or home screen.

### Current features

- Query Open-Meteo geocoding and historical data by city name.
- Inspect temperature, wet-bulb temperature, apparent temperature, humidity, precipitation, wind, PM2.5, season assignments, and livability levels by year.
- View season lengths, livable days, and temperature statistics across roughly ten years.
- Compare up to 8 cities.
- Summarize matching historical dates for a selected range, with weights adjusted by year and ENSO status.
- Adjust livability scoring for heat, cold, and general sensitivity preferences.

### Interface

![Yearly city climate view](./public/readme/yearly-detail.png)

*Daily climate data and calculated results for one year.*

![Ten-year trends](./public/readme/ten-year-trend.png)

*Yearly season, livable-day, and temperature summaries.*

![City comparison](./public/readme/city-compare.png)

*Climate indicators for multiple cities.*

![Travel date estimates](./public/readme/travel-predictor.png)

*A selected date range calculated from matching historical dates.*

### Data and services

- Historical weather, air quality, and city search come from Open-Meteo.
- Chinese city names are translated through MyMemory before the Open-Meteo Geocoding request.
- Historical ENSO year labels are generated from NOAA/PSL ONI data and bundled with the frontend. The optional `GET /api/enso` endpoint reads the current status from NOAA CPC.
- Historical weather is cached in IndexedDB. Language, recent searches, travel dates, and other interface state use localStorage.

The browser requests historical weather, air quality, and geocoding directly. The Express service only supplies the current ENSO status. When that endpoint is unavailable, the travel-date view allows manual ENSO selection.

### Run the development build

```sh
npm install
npm run dev
```

Default addresses:

- Frontend: `http://localhost:5173/`
- ENSO endpoint: `http://127.0.0.1:3000/`

The two processes can also run separately:

```sh
npm run dev:frontend
npm run dev:backend
```

Production build and local preview:

```sh
npm run build
npm run preview
```

Build output is written to `dist/`.

### Current limitations

- The page uses daily history and currently has no current-condition or weather-forecast feed. Season assignments, livability levels, and travel-date results are calculated from historical data and repository-defined rules.
- When the air-quality request fails, the current implementation records missing PM2.5 as `0`. This can affect the air-quality display and livability score.
- Geocoding currently uses the first result. Ambiguous city names require checking the region and country.
- The installed app loads the page and third-party data over the network. IndexedDB only stores historical weather that has already been loaded.

### Code map

- [src/api.ts](src/api.ts): external data requests, caching, and daily aggregation
- [src/utils/analyzer.ts](src/utils/analyzer.ts): apparent conditions, seasons, and livability scoring
- [src/utils/predictor.ts](src/utils/predictor.ts): travel-date calculations
- [src/components](src/components): charts, city comparison, and travel-date interface
- [src/i18n](src/i18n): Chinese and English resources and formatting
- [server/index.ts](server/index.ts): optional ENSO endpoint

The frontend uses React, TypeScript, Vite, and ECharts. The optional service uses Express. See [package.json](package.json) for dependencies and commands.

## License

MIT
