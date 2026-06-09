import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

export interface CityCompareData {
  name: string;
  dataMap: Record<string, any[]>;
}

interface Props {
  cities: CityCompareData[];
}

export const CompareDashboard: React.FC<Props> = ({ cities }) => {
  const option = useMemo(() => {
    if (!cities || cities.length === 0) return {};

    const stats = cities.map(city => {
      const validYears = Object.keys(city.dataMap).filter(year => city.dataMap[year].length >= 350);
      const yearsCount = validYears.length || 1;
      
      let sp = 0, su = 0, au = 0, wi = 0;
      let ss = 0, sw = 0; 
      let l1 = 0, l2 = 0, l3 = 0, l4 = 0;
      let huinan = 0, rainy = 0, humid = 0, dry = 0;
      let rhAvgSum = 0;
      let totalDays = 0;

      validYears.forEach(year => {
        city.dataMap[year].forEach(d => {
          totalDays++;
          if (d.season === '春季') sp++;
          if (d.season === '夏季') su++;
          if (d.season === '秋季') au++;
          if (d.season === '冬季') wi++;
          if (d.isSevereSummer) ss++;
          if (d.isSevereWinter) sw++;
          if (d.livability?.level === 1) l1++;
          if (d.livability?.level === 2) l2++;
          if (d.livability?.level === 3) l3++;
          if (d.livability?.level === 4) l4++;
          if (d.isHuinan) huinan++;
          if (d.isRainySeason) rainy++;
          if (d.isHumidSpell) humid++;
          if (d.isDrySpell) dry++;
          rhAvgSum += (d.rhAvg || 0);
        });
      });

      return {
        name: city.name,
        spring: Math.round(sp / yearsCount),
        summer: Math.round(su / yearsCount),
        autumn: Math.round(au / yearsCount),
        winter: Math.round(wi / yearsCount),
        severeSummer: Math.round(ss / yearsCount),
        severeWinter: Math.round(sw / yearsCount),
        l1: Math.round(l1 / yearsCount),
        l2: Math.round(l2 / yearsCount),
        l3: Math.round(l3 / yearsCount),
        l4: Math.round(l4 / yearsCount),
        huinan: Math.round(huinan / yearsCount),
        rainy: Math.round(rainy / yearsCount),
        humid: Math.round(humid / yearsCount),
        dry: Math.round(dry / yearsCount),
        rhAvg: Math.round(rhAvgSum / (totalDays || 1))
      };
    });

    const cityNames = stats.map(s => s.name);

    // Compute max for radar
    const maxHuinan = Math.max(30, ...stats.map(s => s.huinan));
    const maxRainy = Math.max(60, ...stats.map(s => s.rainy));
    const maxHumid = Math.max(90, ...stats.map(s => s.humid));
    const maxDry = Math.max(90, ...stats.map(s => s.dry));

    return {
      title: [
        { text: '综合宜居天数对比 (十年均值)', left: '25%', top: '5%', textAlign: 'center', textStyle: { fontSize: 14, color: '#475569' } },
        { text: '四季时长占比分布', left: '75%', top: '5%', textAlign: 'center', textStyle: { fontSize: 14, color: '#475569' } },
        { text: '极端气温天数压测 (酷夏 vs 严冬)', left: '25%', top: '55%', textAlign: 'center', textStyle: { fontSize: 14, color: '#475569' } },
        { text: '高敏异常气象对比 (回南天/汛期/极值干湿)', left: '75%', top: '55%', textAlign: 'center', textStyle: { fontSize: 14, color: '#475569' } }
      ],
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          if (params.componentSubType === 'radar') return params.name; // Radar tooltip is handled differently
          let html = `<div style="font-weight:bold;margin-bottom:4px;">${params[0].axisValue}</div>`;
          params.forEach((p: any) => {
            let val = p.value;
            if (val < 0) val = -val; // Fix negative winter values
            html += `${p.marker} ${p.seriesName}: <b>${val}</b>天<br/>`;
          });
          return html;
        }
      },
      legend: [
        { data: ['极度舒适', '尚可接受', '较不宜居', '极端恶劣'], top: '10%', left: '5%', width: '40%' },
        { data: ['春季', '夏季', '秋季', '冬季'], top: '10%', left: '55%', width: '40%' },
        { data: ['酷夏(高温)', '严冬(冰点)'], top: '60%', left: '5%', width: '40%' }
      ],
      grid: [
        { left: '5%', right: '55%', top: '20%', height: '25%' }, // Grid 0: Livability
        { left: '55%', right: '5%', top: '20%', height: '25%' }, // Grid 1: Seasons
        { left: '5%', right: '55%', top: '70%', height: '25%' }  // Grid 2: Extreme Weather
      ],
      radar: {
        center: ['75%', '80%'],
        radius: '30%',
        indicator: [
          { name: '回南天', max: maxHuinan },
          { name: '集中降雨/汛期', max: maxRainy },
          { name: '连续潮湿', max: maxHumid },
          { name: '连续干燥', max: maxDry }
        ],
        splitArea: { areaStyle: { color: ['#f8fafc', '#f1f5f9'] } }
      },
      xAxis: [
        { type: 'category', data: cityNames, gridIndex: 0, axisLine: { lineStyle: { color: '#cbd5e1' } } },
        { type: 'category', data: cityNames, gridIndex: 1, axisLine: { lineStyle: { color: '#cbd5e1' } } },
        { type: 'category', data: cityNames, gridIndex: 2, axisLine: { lineStyle: { color: '#cbd5e1' } } }
      ],
      yAxis: [
        { type: 'value', gridIndex: 0, splitLine: { lineStyle: { color: '#f1f5f9' } } },
        { type: 'value', gridIndex: 1, splitLine: { lineStyle: { color: '#f1f5f9' } } },
        { type: 'value', gridIndex: 2, splitLine: { lineStyle: { color: '#f1f5f9' } } }
      ],
      series: [
        // Livability
        { name: '极度舒适', type: 'bar', stack: 'livability', xAxisIndex: 0, yAxisIndex: 0, data: stats.map(s => s.l1), itemStyle: { color: '#10b981' }, barMaxWidth: 40 },
        { name: '尚可接受', type: 'bar', stack: 'livability', xAxisIndex: 0, yAxisIndex: 0, data: stats.map(s => s.l2), itemStyle: { color: '#3b82f6' }, barMaxWidth: 40 },
        { name: '较不宜居', type: 'bar', stack: 'livability', xAxisIndex: 0, yAxisIndex: 0, data: stats.map(s => s.l3), itemStyle: { color: '#f59e0b' }, barMaxWidth: 40 },
        { name: '极端恶劣', type: 'bar', stack: 'livability', xAxisIndex: 0, yAxisIndex: 0, data: stats.map(s => s.l4), itemStyle: { color: '#ef4444' }, barMaxWidth: 40 },
        
        // Seasons
        { name: '春季', type: 'bar', stack: 'seasons', xAxisIndex: 1, yAxisIndex: 1, data: stats.map(s => s.spring), itemStyle: { color: '#10b981' }, barMaxWidth: 40 },
        { name: '夏季', type: 'bar', stack: 'seasons', xAxisIndex: 1, yAxisIndex: 1, data: stats.map(s => s.summer), itemStyle: { color: '#ef4444' }, barMaxWidth: 40 },
        { name: '秋季', type: 'bar', stack: 'seasons', xAxisIndex: 1, yAxisIndex: 1, data: stats.map(s => s.autumn), itemStyle: { color: '#f59e0b' }, barMaxWidth: 40 },
        { name: '冬季', type: 'bar', stack: 'seasons', xAxisIndex: 1, yAxisIndex: 1, data: stats.map(s => s.winter), itemStyle: { color: '#3b82f6' }, barMaxWidth: 40 },

        // Extreme Weather
        { name: '酷夏(高温)', type: 'bar', xAxisIndex: 2, yAxisIndex: 2, data: stats.map(s => s.severeSummer), itemStyle: { color: '#991b1b', borderRadius: [4, 4, 0, 0] }, barMaxWidth: 40 },
        { name: '严冬(冰点)', type: 'bar', xAxisIndex: 2, yAxisIndex: 2, data: stats.map(s => -s.severeWinter), itemStyle: { color: '#1e3a8a', borderRadius: [0, 0, 4, 4] }, barMaxWidth: 40 },

        // Radar
        {
          type: 'radar',
          data: stats.map((s) => ({
            value: [s.huinan, s.rainy, s.humid, s.dry],
            name: s.name,
            areaStyle: { opacity: 0.1 }
          })),
          tooltip: {
            trigger: 'item',
            formatter: (params: any) => {
              const vals = params.value;
              return `<b>${params.name}</b><br/>回南天: ${vals[0]}天<br/>集中降雨: ${vals[1]}天<br/>连续潮湿: ${vals[2]}天<br/>连续干燥: ${vals[3]}天`;
            }
          }
        }
      ]
    };
  }, [cities]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '800px', background: '#ffffff', borderRadius: '12px', padding: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
      <ReactECharts
        option={option}
        style={{ height: '100%', width: '100%' }}
        theme="light"
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
};
