/**
 * 湿球温度计算 (Stull 经验公式)
 * @param T 干球温度 (°C)
 * @param RH 相对湿度 (%)
 * @returns 湿球温度 Tw (°C)
 */
export function calculateWetBulbTemperature(T: number, RH: number): number {
  return T * Math.atan(0.151977 * Math.pow(RH + 8.313659, 0.5)) +
    Math.atan(T + RH) - Math.atan(RH - 1.676331) +
    0.00391838 * Math.pow(RH, 1.5) * Math.atan(0.023101 * RH) - 4.686035;
}

export interface PreferenceConfig {
  hate_heat: boolean;
  hate_cold: boolean;
  sensitive: boolean;
}

export const defaultPreference: PreferenceConfig = {
  hate_heat: false,
  hate_cold: false,
  sensitive: false
};

/**
 * 宜居度评分 (Livability Index)
 * @param Tw 湿球温度
 * @param PM25 PM2.5浓度
 * @returns { level: number, label: string, color: string }
 */
export function evaluateLivability(
  tAvg: number, 
  tMax: number, 
  tMin: number, 
  _twAvg: number, // Unused but kept for signature compatibility
  twMax: number, 
  rhAvg: number,
  rhMin: number,
  windMax: number,
  precipAvg: number,
  PM25: number = 0,
  preference: PreferenceConfig = defaultPreference
) {
  let score = 100;
  let isExtreme = false; // 绝对否决权标志

  let heatMultiplier = preference.hate_heat ? 1.5 : 1.0;
  let coldMultiplier = preference.hate_cold ? 1.5 : 1.0;

  // A. 极端热应激 (Heat Stress) - 连续抛物线插值
  const pTw = Math.pow(Math.max(0, twMax - 20), 2);
  const pTmax = Math.pow(Math.max(0, tMax - 30), 2);
  let heatPenalty = Math.max(pTw, pTmax) * heatMultiplier;
  
  if (heatPenalty >= 40) isExtreme = true; 
  score -= heatPenalty;
  
  // B. 极端冷应激 (Cold Stress) - 1.2次方平滑曲线
  const windChillPenalty = (tMin < 5 && windMax > 15) ? Math.max(0, (windMax - 10) / 5) * 1.5 : 0;
  const effectiveTMin = tMin - windChillPenalty;
  
  let coldPenalty = Math.pow(Math.max(0, 10 - effectiveTMin), 1.2) * coldMultiplier;
  
  if (coldPenalty >= 60) isExtreme = true;
  score -= coldPenalty;
  
  // C. 生理波动应激 (Diurnal Temperature Range)
  const dtr = tMax - tMin;
  if (dtr >= 20) { score -= 40; isExtreme = true; } // 极端温差
  else if (dtr >= 15) score -= 20;
  else if (dtr >= 12) score -= 10;
  
  // D1. 干燥不适 (急性物理伤害，容易流鼻血/咽喉炎)
  let dryPenalty = 0;
  if (rhMin <= 15) { dryPenalty = 30; } // 沙漠级极度干燥
  else if (rhMin <= 20) { dryPenalty = 15; }
  
  // D2. 潮湿不适 (慢性体感/情绪伤害，发霉/粘腻)
  let dampPenalty = 0;
  if (tAvg <= 10 && rhAvg >= 80) { dampPenalty = 40; } // 极致湿冷魔法攻击
  else if (tAvg <= 10 && rhAvg >= 75) { dampPenalty = 20; }
  else if (tAvg >= 15 && tAvg <= 25 && rhAvg >= 85) { dampPenalty = 20; } // 连阴发霉/回南天 (非致命，仅降低舒适度)
  else if (tAvg >= 15 && rhAvg >= 80) { dampPenalty = 10; } // 潮湿

  if (preference.sensitive) {
    dryPenalty *= 2.0; // 敏感体质对干燥（流鼻血/呼吸道刺激）反应剧烈，双倍惩罚
    dampPenalty *= 1.2; // 敏感体质对潮湿（不舒服）仅轻微放大
  }

  if (dryPenalty >= 40) isExtreme = true; 
  if (dampPenalty >= 40) isExtreme = true; 
  
  score -= (dryPenalty + dampPenalty);
  
  // E. 降雨极端天气
  if (precipAvg >= 50) { score -= 60; isExtreme = true; } // 暴雨 (极度影响出行，一票否决)
  else if (precipAvg >= 20) score -= 25; // 大雨
  else if (precipAvg >= 10) score -= 10; // 中雨
  
  // F. 台风/极端大风灾害 (基于 km/h)
  let windPenalty = 0;
  if (windMax >= 118) { windPenalty = 80; } // 台风/飓风级别 (>= 12级)
  else if (windMax >= 88) { windPenalty = 50; } // 狂风 (10-11级，树木倒伏危险)
  else if (windMax >= 62) { windPenalty = 20; } // 烈风 (8-9级，举步维艰)
  
  if (windPenalty >= 50) isExtreme = true; // 狂风及以上一票否决
  score -= windPenalty;
  
  // G. PM2.5 惩罚 (基于中国环境空气质量标准)
  let pmPenalty = 0;
  if (PM25 > 150) { pmPenalty = 60; } // 重度/严重污染 
  else if (PM25 > 115) { pmPenalty = 40; } // 中度污染 
  else if (PM25 > 75) { pmPenalty = 20; } // 轻度污染
  else if (PM25 > 35) { pmPenalty = 5; } // 良 (非常轻微的扣分)

  if (preference.sensitive) {
    pmPenalty *= 2.0; // 敏感体质对污染双倍惩罚
    if (PM25 > 75) isExtreme = true; // 轻度污染对敏感体质直接一票否决
  }

  if (pmPenalty >= 40) isExtreme = true;
  score -= pmPenalty;

  // 绝对一票否决
  if (isExtreme || score < 50) return { level: 4, label: '极端恶劣', color: '#ef4444' }; // Red 500
  
  if (score >= 85) return { level: 1, label: '极度舒适', color: '#10b981' }; // Emerald 500
  if (score >= 70) return { level: 2, label: '尚可接受', color: '#3b82f6' }; // Blue 500
  return { level: 3, label: '较不宜居', color: '#f59e0b' }; // Amber 500
}

/**
 * 滑动窗口计算“真实四季”
 * 候温法：连续 5 天滑动平均气温
 * @param dailyTemperatures 每日平均气温数组 (需按日期排序)
 * @param windowSize 窗口大小，默认 5
 */
export function calculateSeasons(dailyData: { date: string, tAvg: number, rhAvg: number }[]) {
  const n = dailyData.length;
  const result = [];
  
  // 1. Calculate 5-day smoothed temperature (Hou method)
  const T5 = new Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = -2; j <= 2; j++) {
      let idx = (i + j + n) % n;
      sum += dailyData[idx].tAvg;
    }
    T5[i] = sum / 5;
  }

  // 2. Find Peak and Trough of the smoothed curve
  let maxT = -Infinity, minT = Infinity;
  let peakIdx = 0, troughIdx = 0;
  for (let i = 0; i < n; i++) {
    if (T5[i] > maxT) { maxT = T5[i]; peakIdx = i; }
    if (T5[i] < minT) { minT = T5[i]; troughIdx = i; }
  }

  // Helper to find start index (5 consecutive days condition)
  function findStart(startBoundary: number, endBoundary: number, condition: (t: number) => boolean): number | null {
    if (startBoundary === endBoundary) return null;
    let curr = startBoundary;
    while (curr !== endBoundary) {
      let match = true;
      for (let j = 0; j < 5; j++) {
        const idx = (curr + j) % n;
        if (!condition(T5[idx])) {
          match = false;
          break;
        }
      }
      if (match) return curr;
      curr = (curr + 1) % n;
    }
    return null;
  }

  // 3. Find transitions according to QX/T 152-2012
  const springStart = findStart(troughIdx, peakIdx, t => t >= 10);
  const summerStart = findStart(troughIdx, peakIdx, t => t >= 22);
  const autumnStart = findStart(peakIdx, troughIdx, t => t < 22);
  const winterStart = findStart(peakIdx, troughIdx, t => t < 10);

  const transitions = new Map<number, string>();
  if (springStart !== null) transitions.set(springStart, '春季');
  if (summerStart !== null) transitions.set(summerStart, '夏季');
  if (autumnStart !== null) transitions.set(autumnStart, '秋季');
  if (winterStart !== null) transitions.set(winterStart, '冬季');

  // 4. Assign seasons based on most recent transition
  const seasonsArr = new Array(n);
  if (transitions.size === 0) {
    let flatSeason = '春季';
    if (maxT >= 22) flatSeason = '夏季';
    if (maxT < 10) flatSeason = '冬季';
    seasonsArr.fill(flatSeason);
  } else {
    for (let i = 0; i < n; i++) {
      let season = '';
      for (let offset = 0; offset <= n; offset++) {
        let checkIdx = (i - offset + n) % n;
        if (transitions.has(checkIdx)) {
          season = transitions.get(checkIdx)!;
          break;
        }
      }
      seasonsArr[i] = season;
    }
  }

  const colorMap: Record<string, string> = {
    '冬季': 'rgba(186, 230, 253, 0.15)', // Sky 200 pale
    '春季': 'rgba(187, 247, 208, 0.15)', // Green 200 pale
    '夏季': 'rgba(254, 240, 138, 0.15)', // Yellow 200 pale
    '秋季': 'rgba(254, 215, 170, 0.15)', // Orange 200 pale
  };

  for (let i = 0; i < n; i++) {
    // 回南天多发期判定近似逻辑：春季或冬末，气温在12-22度之间，相对湿度极高(>82%)
    let isHuinan = (seasonsArr[i] === '春季' || seasonsArr[i] === '冬季') 
                   && dailyData[i].rhAvg >= 82 
                   && dailyData[i].tAvg >= 12 
                   && dailyData[i].tAvg <= 22;
    if (i > 0 && Math.abs(T5[i] - 22) > 0.5) isHuinan = false;

    result.push({
      date: dailyData[i].date,
      tAvg: dailyData[i].tAvg,
      movingAvg: T5[i],
      season: seasonsArr[i],
      seasonColor: colorMap[seasonsArr[i]],
      huinan: isHuinan
    });
  }

  return result;
}

/**
 * 重新应用体质偏好计算一个城市数据集中所有的宜居度
 */
export function applyLivabilityPreference(dataMap: Record<string, any[]>, preference: PreferenceConfig) {
  const newMap = { ...dataMap };
  for (const year of Object.keys(newMap)) {
    newMap[year] = newMap[year].map(d => ({
      ...d,
      livability: evaluateLivability(
        d.tAvg, d.tMax, d.tMin, d.twAvg, d.twMax, d.rhAvg, d.rhMin, d.windAvg, d.precipAvg, d.pm25Avg || 0, preference
      )
    }));
  }
  return newMap;
}
