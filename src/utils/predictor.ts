export type EnsoStatus = 'El Niño' | 'La Niña' | 'Neutral';

// 历史年份的宏观气候标签 (近似分类)
const historicalEnso: Record<string, EnsoStatus> = {
  '2014': 'Neutral',
  '2015': 'El Niño',
  '2016': 'El Niño',
  '2017': 'La Niña', // Late 2017
  '2018': 'Neutral',
  '2019': 'El Niño',
  '2020': 'La Niña',
  '2021': 'La Niña',
  '2022': 'La Niña',
  '2023': 'El Niño',
  '2024': 'El Niño',
};

export function generatePrediction(
  dataMap: Record<string, any[]>,
  startDateStr: string, // "MM-DD"
  endDateStr: string,   // "MM-DD"
  currentEnso: EnsoStatus
) {
  const allDays = [];
  
  const parseMMDD = (str: string) => {
    const [m, d] = str.split('-').map(Number);
    return m * 100 + d;
  };

  const startVal = parseMMDD(startDateStr);
  const endVal = parseMMDD(endDateStr);

  let totalWeight = 0;
  
  for (const [yearStr, days] of Object.entries(dataMap)) {
    const year = yearStr.replace('年', '');
    const enso = historicalEnso[year] || 'Neutral';
    
    // ENSO 同态提权 (如果历史年份和今年 ENSO 相同，权重放大)
    let weight = 1.0;
    if (enso === currentEnso) {
      weight = 3.0; // 相似年权重 x3
    } else if (
      (currentEnso === 'El Niño' && enso === 'La Niña') ||
      (currentEnso === 'La Niña' && enso === 'El Niño')
    ) {
      weight = 0.5; // 相反年权重打对折
    }

    // 全球变暖时间衰减斜率 (越近的年份基础权重越高)
    const yearDiff = new Date().getFullYear() - Number(year);
    const recencyMultiplier = Math.max(0.5, 1.2 - (yearDiff * 0.05));
    
    const finalWeight = weight * recencyMultiplier;

    for (const d of days) {
      const dateVal = parseMMDD(d.date); // d.date is already "MM-DD"
      // 跨年处理暂不考虑，只考虑同一年内的普通范围
      let inRange = false;
      if (startVal <= endVal) {
        inRange = dateVal >= startVal && dateVal <= endVal;
      } else {
        // 跨年，如 12-25 到 01-05
        inRange = dateVal >= startVal || dateVal <= endVal;
      }

      if (inRange) {
        allDays.push({ ...d, weight: finalWeight });
        totalWeight += finalWeight;
      }
    }
  }

  if (allDays.length === 0) return null;

  // 排序辅助函数
  const getPercentile = (arr: any[], key: string, p: number) => {
    const sorted = [...arr].sort((a, b) => a[key] - b[key]);
    let targetWeight = totalWeight * p;
    let currentWeight = 0;
    for (const item of sorted) {
      currentWeight += item.weight;
      if (currentWeight >= targetWeight) return item[key];
    }
    return sorted[sorted.length - 1][key];
  };

  const tMaxHigh = getPercentile(allDays, 'tMax', 0.8);
  const tMaxLow = getPercentile(allDays, 'tMax', 0.2);
  const tMinHigh = getPercentile(allDays, 'tMin', 0.8);
  const tMinLow = getPercentile(allDays, 'tMin', 0.2);
  const rhHigh = getPercentile(allDays, 'rhAvg', 0.8);
  const rhLow = getPercentile(allDays, 'rhAvg', 0.2);
  const twMaxHigh = getPercentile(allDays, 'twMax', 0.8);
  const twMaxLow = getPercentile(allDays, 'twMax', 0.2);
  const atHigh = getPercentile(allDays, 'at', 0.8);
  const atLow = getPercentile(allDays, 'at', 0.2);
  const tdHigh = getPercentile(allDays, 'dewPoint', 0.8);
  const tdLow = getPercentile(allDays, 'dewPoint', 0.2);

  // 极端灾害概率
  let rainWeight = 0;
  let typhoonWeight = 0;
  let heatWeight = 0;
  let heatStressWeight = 0;
  let coldWeight = 0;
  let smogWeight = 0;
  let severeSmogWeight = 0;
  let precipSum = 0;
  let totalPrecipVolume = 0;
  let totalPm25 = 0;

  for (const d of allDays) {
    if (d.precipAvg >= 1.0) precipSum += d.weight;
    if (d.precipAvg >= 50) rainWeight += d.weight;
    if (d.windMax >= 62) typhoonWeight += d.weight;
    if (d.tMax >= 35 || d.twMax >= 27) heatWeight += d.weight;
    if (d.twMax >= 26) heatStressWeight += d.weight;
    if (d.tAvg <= 5 || d.tMin <= 0) coldWeight += d.weight;
    if (d.pm25Avg >= 75) smogWeight += d.weight;
    if (d.pm25Avg >= 150) severeSmogWeight += d.weight;
    totalPrecipVolume += d.precipAvg * d.weight;
    totalPm25 += d.pm25Avg * d.weight;
  }

  const expectedDailyPrecip = totalPrecipVolume / totalWeight;
  let precipScale = '晴天为主';
  if (expectedDailyPrecip > 0.1 && expectedDailyPrecip <= 5) precipScale = '零星小雨';
  else if (expectedDailyPrecip > 5 && expectedDailyPrecip <= 15) precipScale = '明显阵雨';
  else if (expectedDailyPrecip > 15) precipScale = '大雨/暴雨';

  return {
    tMaxRange: [Math.round(tMaxLow), Math.round(tMaxHigh)],
    tMinRange: [Math.round(tMinLow), Math.round(tMinHigh)],
    rhRange: [Math.round(rhLow), Math.round(rhHigh)],
    twMaxRange: [Math.round(twMaxLow), Math.round(twMaxHigh)],
    atRange: [Math.round(atLow), Math.round(atHigh)],
    dewPointRange: [Math.round(tdLow), Math.round(tdHigh)],
    precipExpected: Number(expectedDailyPrecip.toFixed(1)),
    precipScale,
    pm25Expected: Math.round(totalPm25 / totalWeight),
    rainProb: Math.round((precipSum / totalWeight) * 100),
    severeRainProb: Math.round((rainWeight / totalWeight) * 100),
    typhoonProb: Math.round((typhoonWeight / totalWeight) * 100),
    heatProb: Math.round((heatWeight / totalWeight) * 100),
    heatStressProb: Math.round((heatStressWeight / totalWeight) * 100),
    coldProb: Math.round((coldWeight / totalWeight) * 100),
    smogProb: Math.round((smogWeight / totalWeight) * 100),
    severeSmogProb: Math.round((severeSmogWeight / totalWeight) * 100),
  };
}
