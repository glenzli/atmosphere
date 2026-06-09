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
  PM25: number = 0
) {
  let score = 100;
  let isExtreme = false; // 绝对否决权标志
  
  // A. 极端热应激 (Heat Stress)
  if (twMax >= 30 || tMax >= 40) { score -= 100; isExtreme = true; } // 致命高温
  else if (twMax >= 28 || tMax >= 38) { score -= 60; isExtreme = true; } // 极端高温
  else if (twMax >= 26 || tMax >= 35) { score -= 40; isExtreme = true; } // 严重危险高温
  else if (twMax >= 24 || tMax >= 32) score -= 20;
  
  // B. 极端冷应激 (Cold Stress) - Relaxed because adding clothes is easier
  const windChillPenalty = (tMin < 5 && windMax > 15) ? Math.max(0, (windMax - 10) / 5) * 1.5 : 0;
  const effectiveTMin = tMin - windChillPenalty;
  
  if (effectiveTMin <= -25) { score -= 60; isExtreme = true; } // 绝对致命严寒
  else if (effectiveTMin <= -15) { score -= 40; } // 严寒
  else if (effectiveTMin <= -5) { score -= 20; } // 寒冷 (需厚冬装)
  else if (effectiveTMin <= 5) { score -= 10; } // 微冷
  
  // C. 生理波动应激 (Diurnal Temperature Range)
  const dtr = tMax - tMin;
  if (dtr >= 20) { score -= 40; isExtreme = true; } // 极端温差
  else if (dtr >= 15) score -= 20;
  else if (dtr >= 12) score -= 10;
  
  // D. 湿度极端不适
  if (rhMin <= 15) { score -= 30; isExtreme = true; } // 沙漠级极度干燥
  else if (rhMin <= 20) score -= 15; 
  
  if (tAvg <= 10 && rhAvg >= 80) { score -= 40; isExtreme = true; } // 极致湿冷魔法攻击
  else if (tAvg <= 10 && rhAvg >= 75) score -= 20; 
  
  if (tAvg >= 15 && tAvg <= 25 && rhAvg >= 85) { score -= 40; isExtreme = true; } // 极致回南天
  else if (tAvg >= 15 && rhAvg >= 80) score -= 15; // 闷热潮湿
  
  // E. 降雨极端天气
  if (precipAvg >= 50) { score -= 60; isExtreme = true; } // 暴雨
  else if (precipAvg >= 20) score -= 25; // 大雨
  else if (precipAvg >= 10) score -= 10; // 中雨
  
  // F. PM2.5 惩罚
  if (PM25 > 150) { score -= 50; isExtreme = true; } // 重度污染
  else if (PM25 > 115) score -= 30;
  else if (PM25 > 75) score -= 15;
  else if (PM25 > 35) score -= 5;

  // 绝对一票否决
  if (isExtreme || score < 50) return { level: 4, label: '不宜居(极端)', color: '#ef4444' }; // Red 500
  
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
    const isHuiNan = (seasonsArr[i] === '春季' || seasonsArr[i] === '冬季') 
                   && dailyData[i].rhAvg >= 82 
                   && dailyData[i].tAvg >= 12 
                   && dailyData[i].tAvg <= 22;
    result.push({
      date: dailyData[i].date,
      tAvg: dailyData[i].tAvg,
      movingAvg: T5[i],
      season: seasonsArr[i],
      seasonColor: colorMap[seasonsArr[i]],
      huinan: isHuiNan
    });
  }

  return result;
}
