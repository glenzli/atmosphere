import { calculateWetBulbTemperature, calculateSeasons, evaluateLivability, dewPoint, apparentTemperature } from './utils/analyzer';
import { get, set, clear } from 'idb-keyval';

export async function clearCache() {
  await clear();
}

export async function geocodeCity(name: string) {
  const res = await fetch(`/api/geocoding?name=${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error('Geocoding failed');
  const data = await res.json();
  if (!data.results || data.results.length === 0) throw new Error('City not found');
  return data.results[0]; // { latitude, longitude, name, country }
}

export async function fetchEnsoStatus() {
  try {
    const res = await fetch('/api/enso');
    if (!res.ok) throw new Error('Network error');
    return await res.json();
  } catch (err) {
    return { status: 'Neutral', value: 0, error: true };
  }
}

export async function fetchHistoricalData(lat: number, lon: number, years = 10) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(endDate.getFullYear() - years);
  startDate.setMonth(0, 1); // January 1st

  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  const cacheKey = `weather_v3_${lat.toFixed(3)}_${lon.toFixed(3)}_${years}_${endStr}`;
  let weatherData = await get(cacheKey);
  let isCached = true;

  if (!weatherData) {
    isCached = false;
    const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}&startDate=${startStr}&endDate=${endStr}`);
    if (!res.ok) throw new Error('Weather data fetch failed');
    weatherData = await res.json();
    await set(cacheKey, weatherData);
  }

  // Aggregate data and extract full years
  const { yearly } = aggregateByDayOfYear(weatherData);

  const resultMap: Record<string, any[]> = {};

  const processDataset = (dataset: any[]) => {
    const seasons = calculateSeasons(dataset);
    return dataset.map((d, i) => ({
      ...d,
      season: seasons[i].season,
      seasonColor: seasons[i].seasonColor,
      isSevereSummer: d.tMax >= 35 || d.tAvg >= 28 || d.twMax >= 27,
      isSevereWinter: d.tMax <= 5 || d.tAvg <= 0,
      huinan: seasons[i].huinan, // from calculateSeasons
      isHuinan: d.isHuinan,
      isDrySpell: d.isDrySpell,
      isHumidSpell: d.isHumidSpell,
      isRainySeason: d.isRainySeason,
      livability: evaluateLivability(d.tAvg, d.tMax, d.tMin, d.twAvg, d.twMax, d.rhAvg, d.rhMin, d.windAvg, d.precipAvg, d.pm25Avg || 0)
    }));
  };
  
  const sortedYears = Object.keys(yearly).sort((a, b) => Number(b) - Number(a));
  for (const year of sortedYears) {
    resultMap[`${year}年`] = processDataset(yearly[year]);
  }

  return { data: resultMap, isCached };
}

function applySpells(dataset: any[]) {
  // Mark basic daily conditions
  for (let d of dataset) {
    const month = parseInt(d.date.split('-')[0], 10);
    d.isHuinan = (d.tAvg >= 15 && d.tAvg <= 25 && d.rhAvg >= 85 && month >= 2 && month <= 4);
    d.isDryDay = d.rhAvg <= 40;
    d.isHumidDay = d.rhAvg >= 80 && !d.isHuinan;
    d.isDrySpell = false;
    d.isHumidSpell = false;
    d.isRainySeason = false;
  }

  // Identify 3+ consecutive days spells
  let dryCount = 0;
  let humidCount = 0;
  for (let i = 0; i < dataset.length; i++) {
    const d = dataset[i];
    
    // Dry check
    if (d.isDryDay) dryCount++;
    else {
      if (dryCount >= 3) {
        for (let j = 1; j <= dryCount; j++) dataset[i - j].isDrySpell = true;
      }
      dryCount = 0;
    }
    
    // Humid check
    if (d.isHumidDay) humidCount++;
    else {
      if (humidCount >= 3) {
        for (let j = 1; j <= humidCount; j++) dataset[i - j].isHumidSpell = true;
      }
      humidCount = 0;
    }
  }
  if (dryCount >= 3) {
    for (let j = 1; j <= dryCount; j++) dataset[dataset.length - j].isDrySpell = true;
  }
  if (humidCount >= 3) {
    for (let j = 1; j <= humidCount; j++) dataset[dataset.length - j].isHumidSpell = true;
  }

  // 5-day Sliding Window for Rainy Season (Tighter, less smooth)
  const windowSize = 5;
  for (let i = 0; i <= dataset.length - windowSize; i++) {
    let rainSum = 0;
    let rainDays = 0;
    for (let w = 0; w < windowSize; w++) {
      const p = dataset[i + w].precipAvg;
      rainSum += p;
      if (p >= 1) rainDays++;
    }
    if (rainSum >= 20 && rainDays >= 3) {
      for (let w = 0; w < windowSize; w++) {
        // Only mark if it actually rained, or if it's sandwiched by rain (to avoid huge dry blocks)
        if (dataset[i + w].precipAvg > 0) {
          dataset[i + w].isRainySeason = true;
        }
      }
    }
  }
}

function aggregateByDayOfYear(weatherData: any) {
  const { time, temperature_2m_max, temperature_2m_min, temperature_2m_mean, precipitation_sum, wind_speed_10m_max, wind_gusts_10m_max } = weatherData.daily;
  const { temperature_2m, relative_humidity_2m, pm2_5 } = weatherData.hourly;

  const pm25Hourly = pm2_5 || [];
  const hourlyTw = temperature_2m.map((t: number, i: number) => calculateWetBulbTemperature(t, relative_humidity_2m[i]));

  const dailyTw = [];
  const dailyRh = [];
  const dailyTwMax = [];
  const dailyTwMin = [];
  const dailyRhMax = [];
  const dailyRhMin = [];
  const dailyPm25Avg = [];
  const dailyPm25Max = [];
  
  for (let i = 0; i < time.length; i++) {
    let twSum = 0;
    let rhSum = 0;
    let pm25Sum = 0;
    let validPm25Hours = 0;
    let pm25Max = -Infinity;
    let twMax = -Infinity;
    let twMin = Infinity;
    let rhMax = -Infinity;
    let rhMin = Infinity;
    for (let h = 0; h < 24; h++) {
      const tw = hourlyTw[i * 24 + h] || 0;
      twSum += tw;
      if (tw > twMax) twMax = tw;
      if (tw < twMin) twMin = tw;
      
      const rh = relative_humidity_2m[i * 24 + h] || 0;
      rhSum += rh;
      if (rh > rhMax) rhMax = rh;
      if (rh < rhMin) rhMin = rh;

      const pmVal = pm25Hourly[i * 24 + h];
      if (pmVal !== null && pmVal !== undefined) {
        pm25Sum += pmVal;
        validPm25Hours++;
        if (pmVal > pm25Max) pm25Max = pmVal;
      }
    }
    dailyTw.push(twSum / 24);
    dailyRh.push(rhSum / 24);
    dailyTwMax.push(twMax === -Infinity ? 0 : twMax);
    dailyTwMin.push(twMin === Infinity ? 0 : twMin);
    dailyRhMax.push(rhMax === -Infinity ? 0 : rhMax);
    dailyRhMin.push(rhMin === Infinity ? 0 : rhMin);
    dailyPm25Avg.push(validPm25Hours > 0 ? pm25Sum / validPm25Hours : 0);
    dailyPm25Max.push(pm25Max === -Infinity ? 0 : pm25Max);
  }

  const daysMap = new Map();
  const yearlyMap = new Map();

  const createEmptyEntry = () => ({
    tAvgSum: 0, tMaxSum: 0, tMinSum: 0,
    precipSum: 0, windSum: 0,
    twSum: 0, twMaxSum: 0, twMinSum: 0,
    rhSum: 0, rhMaxSum: 0, rhMinSum: 0, 
    pm25AvgSum: 0, pm25MaxSum: 0,
    count: 0
  });

  for (let i = 0; i < time.length; i++) {
    const dateStr = time[i];
    const year = dateStr.substring(0, 4);
    const dateObj = new Date(dateStr);
    const mmdd = `${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    
    if (mmdd === '02-29') continue;

    if (!daysMap.has(mmdd)) daysMap.set(mmdd, createEmptyEntry());
    const entry = daysMap.get(mmdd);

    if (!yearlyMap.has(year)) yearlyMap.set(year, new Map());
    const yearDays = yearlyMap.get(year);
    if (!yearDays.has(mmdd)) yearDays.set(mmdd, createEmptyEntry());
    const yearEntry = yearDays.get(mmdd);

    if (temperature_2m_mean[i] !== null) {
      entry.tAvgSum += temperature_2m_mean[i];
      entry.tMaxSum += temperature_2m_max[i];
      entry.tMinSum += temperature_2m_min[i];
      entry.precipSum += precipitation_sum[i];
      const maxWind = Math.max(wind_speed_10m_max[i], (wind_gusts_10m_max && wind_gusts_10m_max[i]) ? wind_gusts_10m_max[i] : 0);
      entry.windSum += maxWind;
      entry.twSum += dailyTw[i];
      entry.twMaxSum += dailyTwMax[i];
      entry.twMinSum += dailyTwMin[i];
      entry.rhSum += dailyRh[i];
      entry.rhMaxSum += dailyRhMax[i];
      entry.rhMinSum += dailyRhMin[i];
      entry.pm25AvgSum += dailyPm25Avg[i];
      entry.pm25MaxSum += dailyPm25Max[i];
      entry.count += 1;

      yearEntry.tAvgSum += temperature_2m_mean[i];
      yearEntry.tMaxSum += temperature_2m_max[i];
      yearEntry.tMinSum += temperature_2m_min[i];
      yearEntry.precipSum += precipitation_sum[i];
      yearEntry.windSum += Math.max(wind_speed_10m_max[i], (wind_gusts_10m_max && wind_gusts_10m_max[i]) ? wind_gusts_10m_max[i] : 0);
      yearEntry.twSum += dailyTw[i];
      yearEntry.twMaxSum += dailyTwMax[i];
      yearEntry.twMinSum += dailyTwMin[i];
      yearEntry.rhSum += dailyRh[i];
      yearEntry.rhMaxSum += dailyRhMax[i];
      yearEntry.rhMinSum += dailyRhMin[i];
      yearEntry.pm25AvgSum += dailyPm25Avg[i];
      yearEntry.pm25MaxSum += dailyPm25Max[i];
      yearEntry.count += 1;
    }
  }

  const formatEntry = (date: string, e: any) => ({
    date,
    tAvg: Number((e.tAvgSum / e.count).toFixed(1)),
    tMax: Number((e.tMaxSum / e.count).toFixed(1)),
    tMin: Number((e.tMinSum / e.count).toFixed(1)),
    precipAvg: Number((e.precipSum / e.count).toFixed(1)),
    windAvg: Number((e.windSum / e.count).toFixed(1)),
    twAvg: Number((e.twSum / e.count).toFixed(1)),
    twMax: Number((e.twMaxSum / e.count).toFixed(1)),
    twMin: Number((e.twMinSum / e.count).toFixed(1)),
    rhAvg: Number((e.rhSum / e.count).toFixed(1)),
    rhMax: Number((e.rhMaxSum / e.count).toFixed(1)),
    rhMin: Number((e.rhMinSum / e.count).toFixed(1)),
    pm25Avg: Number((e.pm25AvgSum / e.count).toFixed(1)),
    pm25Max: Number((e.pm25MaxSum / e.count).toFixed(1)),
    dewPoint: Number(dewPoint(e.tAvgSum / e.count, e.rhSum / e.count).toFixed(1)),
    at: Number(apparentTemperature(e.tAvgSum / e.count, e.rhSum / e.count, e.windSum / e.count).toFixed(1)),
  });

  const averageResult: any[] = [];
  for (let m = 1; m <= 12; m++) {
    const daysInMonth = new Date(2023, m, 0).getDate(); 
    for (let d = 1; d <= daysInMonth; d++) {
      const mmdd = `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const entry = daysMap.get(mmdd);
      if (entry && entry.count > 0) {
        averageResult.push(formatEntry(mmdd, entry));
      }
    }
  }

  applySpells(averageResult);

  const yearlyResult: Record<string, any[]> = {};
  for (const [year, yearDays] of yearlyMap.entries()) {
    const res = [];
    for (let m = 1; m <= 12; m++) {
      const daysInMonth = new Date(2023, m, 0).getDate(); 
      for (let d = 1; d <= daysInMonth; d++) {
        const mmdd = `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const entry = yearDays.get(mmdd);
        if (entry && entry.count > 0) {
          res.push(formatEntry(mmdd, entry));
        }
      }
    }
    if (res.length > 0) {
      applySpells(res);
      yearlyResult[year] = res;
    }
  }

  // Omit 5-year average, only return individual years
  return { yearly: yearlyResult };
}
