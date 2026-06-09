import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

interface ClimateData {
  date: string;
  tAvg: number;
  tMax: number;
  tMin: number;
  precipAvg: number;
  windAvg: number;
  twAvg: number;
  twMax: number;
  twMin: number;
  rhAvg: number;
  rhMax: number;
  rhMin: number;
  season: string;
  seasonColor: string;
  huinan?: boolean;
  isHuinan?: boolean;
  isDrySpell?: boolean;
  isHumidSpell?: boolean;
  isRainySeason?: boolean;
  isSevereSummer?: boolean;
  isSevereWinter?: boolean;
  pm25Avg?: number;
  pm25Max?: number;
  livability: { level: number, label: string, color: string } | null;
}

interface Props {
  data: ClimateData[];
}

export const ClimateChart: React.FC<Props> = ({ data }) => {
  const option = useMemo(() => {
    if (!data || data.length === 0) return {};

    const dates = (() => {
      const arr = [];
      for (let m = 1; m <= 12; m++) {
        const daysInMonth = new Date(2023, m, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
          arr.push(`${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
        }
      }
      return arr;
    })();
    const tAvg = data.map(d => d.tAvg);
    const tMax = data.map(d => d.tMax);
    const tMin = data.map(d => d.tMin);
    const tDiff = data.map(d => Number((d.tMax - d.tMin).toFixed(1)));
    
    const twAvg = data.map(d => d.twAvg);
    const twMax = data.map(d => d.twMax);
    const twMin = data.map(d => d.twMin);
    const twDiff = data.map(d => Number((d.twMax - d.twMin).toFixed(1)));

    const precipAvg = data.map(d => d.precipAvg);
    const pm25Avg = data.map(d => d.pm25Avg || 0);
    const pm25Max = data.map(d => d.pm25Max || 0);
    const rhAvg = data.map(d => d.rhAvg || 0);
    const rhMax = data.map(d => d.rhMax || 0);
    const rhMin = data.map(d => d.rhMin || 0);
    const rhDiff = data.map(d => Number(((d.rhMax || 0) - (d.rhMin || 0)).toFixed(1)));

    const markAreas = [];
    let currentSeason = data[0].season;
    let currentStart = data[0].date;
    let currentColor = data[0].seasonColor;

    for (let i = 1; i < data.length; i++) {
      if (data[i].season !== currentSeason) {
        markAreas.push([
          { name: currentSeason, xAxis: currentStart, itemStyle: { color: currentColor } },
          { xAxis: data[i - 1].date }
        ]);
        currentSeason = data[i].season;
        currentStart = data[i].date;
        currentColor = data[i].seasonColor;
      }
    }
    markAreas.push([
      { name: currentSeason, xAxis: currentStart, itemStyle: { color: currentColor } },
      { xAxis: data[data.length - 1].date }
    ]);

    const createMarkAreas = (flagKey: keyof ClimateData, color: string) => {
      const areas = [];
      let inArea = false;
      let start = '';
      for (let i = 0; i < data.length; i++) {
        if (data[i][flagKey] && !inArea) {
          inArea = true;
          start = data[i].date;
        } else if (!data[i][flagKey] && inArea) {
          inArea = false;
          areas.push([
            { xAxis: start, itemStyle: { color } },
            { xAxis: data[i - 1].date }
          ]);
        }
      }
      if (inArea) {
        areas.push([
          { xAxis: start, itemStyle: { color } },
          { xAxis: data[data.length - 1].date }
        ]);
      }
      return areas;
    };

    const huinanAreas = createMarkAreas('isHuinan', 'rgba(224, 242, 254, 0.8)');
    const dryAreas = createMarkAreas('isDrySpell', 'rgba(254, 240, 138, 0.5)');
    const humidAreas = createMarkAreas('isHumidSpell', 'rgba(220, 252, 231, 0.5)');
    const humidityMarkAreas = [...huinanAreas, ...dryAreas, ...humidAreas];

    const severeSummerAreas = createMarkAreas('isSevereSummer', 'rgba(220, 38, 38, 0.15)');
    const severeWinterAreas = createMarkAreas('isSevereWinter', 'rgba(30, 58, 138, 0.15)');
    const temperatureMarkAreas = [...markAreas, ...severeSummerAreas, ...severeWinterAreas];

    const rainySeasonAreas = createMarkAreas('isRainySeason', 'rgba(186, 230, 253, 0.5)');

    return {
      title: [
        {
          text: '年度真实气候与极值推演',
          left: 'center',
          top: 0,
          textStyle: { color: '#0f172a', fontSize: 16 }
        },
        {
          text: '🌡️ 干球气温带 (极值阴影与分段均值)',
          left: '4%',
          top: '3%',
          textStyle: { fontSize: 13, color: '#64748b', fontWeight: 'normal' }
        },
        {
          text: '💦 湿球体感带 (人体真实感知)',
          left: '4%',
          top: '32%',
          textStyle: { fontSize: 13, color: '#64748b', fontWeight: 'normal' }
        },
        {
          text: '💧 相对湿度 (干湿波动极限与连续气象期)',
          left: '4%',
          top: '59%',
          textStyle: { fontSize: 13, color: '#64748b', fontWeight: 'normal' }
        },
        {
          text: '🌧️ 降水量 (自动识别梅雨/汛期)',
          left: '4%',
          top: '77%',
          textStyle: { fontSize: 13, color: '#64748b', fontWeight: 'normal' }
        },
        {
          text: '🏡 宜居综合评估条带',
          left: '4%',
          top: '92%',
          textStyle: { fontSize: 13, color: '#64748b', fontWeight: 'normal' }
        }
      ],
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e2e8f0',
        textStyle: { color: '#0f172a' },
        formatter: (params: any) => {
          let html = `<div style="margin-bottom:4px;font-weight:bold;border-bottom:1px solid #cbd5e1;padding-bottom:4px">${params[0].axisValue}</div>`;
          const dataIndex = params[0].dataIndex;
          const pointData = data[dataIndex];
          html += `季节推演: <b>${pointData.season}</b><br/>`;
          
          if (pointData.isHuinan) {
            html += `<span style="color:#0284c7;font-weight:bold">💧 回南天高发期 (极易返潮)</span><br/>`;
          } else if (pointData.isHumidSpell) {
            html += `<span style="color:#16a34a;font-weight:bold">💦 连续潮湿期 (可能闷热或湿冷)</span><br/>`;
          } else if (pointData.isDrySpell) {
            html += `<span style="color:#ca8a04;font-weight:bold">🏜️ 连续干燥期 (注意保湿补水)</span><br/>`;
          }

          if (pointData.isRainySeason) {
            html += `<span style="color:#0284c7;font-weight:bold">🌧️ 处于集中降雨季 (汛期/梅雨期)</span><br/>`;
          }

          if (pointData.livability) {
            html += `宜居评价: <span style="color:${pointData.livability.color};font-weight:bold">${pointData.livability.label}</span><br/>`;
          }

          if (pointData.tMax !== undefined && pointData.tMin !== undefined) {
            html += `干球温度: <b>${pointData.tMin}</b>°C ~ <b style="color:#ef4444">${pointData.tMax}</b>°C<br/>`;
          }
          if (pointData.twMax !== undefined && pointData.twMin !== undefined) {
            html += `湿球体感: <b>${pointData.twMin}</b>°C ~ <b style="color:#ef4444">${pointData.twMax}</b>°C<br/>`;
          }
          if (pointData.rhMax !== undefined && pointData.rhMin !== undefined) {
            html += `相对湿度: <b>${pointData.rhMin}</b>% ~ <b style="color:#0ea5e9">${pointData.rhMax}</b>%<br/>`;
          }
          
          let precipLevel = '无雨/微雨';
          if (pointData.precipAvg >= 50) precipLevel = '暴雨';
          else if (pointData.precipAvg >= 20) precipLevel = '大雨';
          else if (pointData.precipAvg >= 10) precipLevel = '中雨';
          else if (pointData.precipAvg >= 1) precipLevel = '小雨';
          html += `降雨情况: <b>${precipLevel}</b> (${pointData.precipAvg} mm)<br/>`;

          return html;
        }
      },
      legend: {
        show: false
      },
      visualMap: [
        {
          show: false,
          dimension: 1,
          seriesIndex: [2, 3, 4], // 干球均值, 最高温, 最低温
          pieces: [
            { max: 0, color: '#3b82f6' },
            { min: 0, max: 10, color: '#06b6d4' },
            { min: 10, max: 28, color: '#94a3b8' },
            { min: 28, max: 32, color: '#f59e0b' },
            { min: 32, color: '#ef4444' }
          ]
        },
        {
          show: false,
          dimension: 1, 
          seriesIndex: [7, 8, 9], // 湿球均值, 最高温, 最低温
          pieces: [
            { max: 0, color: '#3b82f6' },
            { min: 0, max: 15, color: '#10b981' },
            { min: 15, max: 24, color: '#f59e0b' },
            { min: 24, color: '#ef4444' }
          ]
        },
        {
          show: false,
          dimension: 1, 
          seriesIndex: [12, 13, 14], // 湿度均值, 最大湿度, 最小湿度
          pieces: [
            { max: 20, color: '#b45309' },
            { min: 20, max: 40, color: '#f59e0b' },
            { min: 40, max: 70, color: '#10b981' },
            { min: 70, max: 85, color: '#0ea5e9' },
            { min: 85, color: '#3b82f6' }
          ]
        },
        {
          show: false,
          dimension: 1, 
          seriesIndex: [16, 17], // pm25Avg, pm25Max (Grid 4)
          pieces: [
            { max: 35, color: '#10b981' }, // 优 (绿)
            { min: 35, max: 75, color: '#f59e0b' }, // 良 (黄)
            { min: 75, max: 115, color: '#f97316' }, // 轻度 (橙)
            { min: 115, max: 150, color: '#ef4444' }, // 中度 (红)
            { min: 150, color: '#8b5cf6' } // 重度 (紫)
          ]
        }
      ],
      axisPointer: {
        link: [{ xAxisIndex: 'all' }]
      },
      grid: [
        { left: '4%', right: '4%', top: '4%', height: '22%' },    // Grid 0: Dry Bulb
        { left: '4%', right: '4%', top: '29%', height: '20%' },   // Grid 1: Wet Bulb
        { left: '4%', right: '4%', top: '52%', height: '12%' },   // Grid 2: Humidity
        { left: '4%', right: '4%', top: '67%', height: '10%' },   // Grid 3: Precip
        { left: '4%', right: '4%', top: '80%', height: '10%' },   // Grid 4: PM2.5
        { left: '4%', right: '4%', top: '94%', height: '4%' }     // Grid 5: Livability
      ],
      xAxis: [
        { type: 'category', data: dates, gridIndex: 0, axisLine: { lineStyle: { color: '#cbd5e1' } }, axisLabel: { show: false }, axisTick: { show: false } },
        { type: 'category', data: dates, gridIndex: 1, axisLine: { lineStyle: { color: '#cbd5e1' } }, axisLabel: { show: false }, axisTick: { show: false } },
        { type: 'category', data: dates, gridIndex: 2, axisLine: { lineStyle: { color: '#cbd5e1' } }, axisLabel: { show: false }, axisTick: { show: false } },
        { type: 'category', data: dates, gridIndex: 3, axisLine: { lineStyle: { color: '#cbd5e1' } }, axisLabel: { show: false }, axisTick: { show: false } },
        { type: 'category', data: dates, gridIndex: 4, axisLine: { lineStyle: { color: '#cbd5e1' } }, axisLabel: { show: false }, axisTick: { show: false } },
        { type: 'category', data: dates, gridIndex: 5, axisLine: { lineStyle: { color: '#cbd5e1' } }, axisLabel: { color: '#64748b' } }
      ],
      yAxis: [
        { type: 'value', gridIndex: 0, axisLine: { lineStyle: { color: '#cbd5e1' } }, splitLine: { lineStyle: { color: '#f1f5f9' } }, axisLabel: { color: '#64748b' } },
        { type: 'value', gridIndex: 1, axisLine: { lineStyle: { color: '#cbd5e1' } }, splitLine: { lineStyle: { color: '#f1f5f9' } }, axisLabel: { color: '#64748b' } },
        { type: 'value', gridIndex: 2, max: 100, min: 0, axisLine: { lineStyle: { color: '#cbd5e1' } }, splitLine: { lineStyle: { color: '#f1f5f9' } }, axisLabel: { color: '#64748b' } },
        { type: 'value', gridIndex: 3, axisLine: { lineStyle: { color: '#cbd5e1' } }, splitLine: { lineStyle: { color: '#f1f5f9' } }, axisLabel: { color: '#64748b' } },
        { type: 'value', gridIndex: 4, axisLine: { lineStyle: { color: '#cbd5e1' } }, splitLine: { lineStyle: { color: '#f1f5f9' } }, axisLabel: { color: '#64748b' } },
        { type: 'value', gridIndex: 5, show: false, max: 1 }
      ],
      series: [
        // Grid 0: Dry Bulb Track
        { // 0
          name: '干球底带', type: 'line', xAxisIndex: 0, yAxisIndex: 0,
          data: tMin, lineStyle: { opacity: 0 }, stack: 't-band', symbol: 'none'
        },
        { // 1
          name: '干温差带', type: 'line', xAxisIndex: 0, yAxisIndex: 0,
          data: tDiff, lineStyle: { opacity: 0 }, areaStyle: { color: 'rgba(148, 163, 184, 0.15)' }, stack: 't-band', symbol: 'none'
        },
        { // 2: mapped visualMap
          name: '气温 (干球)', type: 'line', xAxisIndex: 0, yAxisIndex: 0,
          data: tAvg, smooth: true, lineStyle: { width: 2, type: 'solid' }, symbol: 'none',
          markArea: { data: temperatureMarkAreas, label: { color: '#64748b', fontWeight: 'bold', position: 'insideTop', padding: [10, 0, 0, 0] } }
        },
        { // 3: mapped visualMap
          name: '干球最高温', type: 'line', xAxisIndex: 0, yAxisIndex: 0,
          data: tMax, lineStyle: { width: 1, type: 'dashed' }, symbol: 'none'
        },
        { // 4: mapped visualMap
          name: '干球最低温', type: 'line', xAxisIndex: 0, yAxisIndex: 0,
          data: tMin, lineStyle: { width: 1, type: 'dashed' }, symbol: 'none'
        },
        
        // Grid 1: Wet Bulb Track
        { // 5
          name: '湿球底带', type: 'line', xAxisIndex: 1, yAxisIndex: 1,
          data: twMin, lineStyle: { opacity: 0 }, stack: 'tw-band', symbol: 'none'
        },
        { // 6
          name: '湿温差带', type: 'line', xAxisIndex: 1, yAxisIndex: 1,
          data: twDiff, lineStyle: { opacity: 0 }, areaStyle: { color: 'rgba(16, 185, 129, 0.1)' }, stack: 'tw-band', symbol: 'none'
        },
        { // 7: mapped visualMap
          name: '气温 (湿球体感)', type: 'line', xAxisIndex: 1, yAxisIndex: 1,
          data: twAvg, smooth: true, lineStyle: { width: 3, type: 'solid' }, symbol: 'none'
        },
        { // 8: mapped visualMap
          name: '湿球最高温', type: 'line', xAxisIndex: 1, yAxisIndex: 1,
          data: twMax, lineStyle: { width: 1, type: 'dashed' }, symbol: 'none'
        },
        { // 9: mapped visualMap
          name: '湿球最低温', type: 'line', xAxisIndex: 1, yAxisIndex: 1,
          data: twMin, lineStyle: { width: 1, type: 'dashed' }, symbol: 'none'
        },

        // Grid 2: Humidity Track
        { // 10
          name: '湿度底带', type: 'line', xAxisIndex: 2, yAxisIndex: 2,
          data: rhMin, lineStyle: { opacity: 0 }, stack: 'rh-band', symbol: 'none'
        },
        { // 11
          name: '湿度差带', type: 'line', xAxisIndex: 2, yAxisIndex: 2,
          data: rhDiff, lineStyle: { opacity: 0 }, areaStyle: { color: 'rgba(14, 165, 233, 0.1)' }, stack: 'rh-band', symbol: 'none'
        },
        { // 12: mapped visualMap
          name: '相对湿度', type: 'line', xAxisIndex: 2, yAxisIndex: 2,
          data: rhAvg, smooth: true, lineStyle: { width: 2, type: 'solid' }, symbol: 'none',
          markArea: { data: humidityMarkAreas }
        },
        { // 13: mapped visualMap
          name: '最高湿度', type: 'line', xAxisIndex: 2, yAxisIndex: 2,
          data: rhMax, lineStyle: { width: 1, type: 'dashed' }, symbol: 'none'
        },
        { // 14: mapped visualMap
          name: '最低湿度', type: 'line', xAxisIndex: 2, yAxisIndex: 2,
          data: rhMin, lineStyle: { width: 1, type: 'dashed' }, symbol: 'none'
        },

        // Grid 3: Precipitation Track
        { // 15
          name: '平均降水', type: 'bar', xAxisIndex: 3, yAxisIndex: 3,
          data: precipAvg,
          itemStyle: { 
            color: (params: any) => {
              const val = params.value;
              if (val < 1) return 'rgba(226, 232, 240, 0.3)';
              if (val < 5) return '#bae6fd';
              if (val < 15) return '#38bdf8';
              return '#0284c7';
            }
          },
          barWidth: '80%',
          markArea: { data: rainySeasonAreas }
        },

        // Grid 4: PM2.5 Track
        { // 16: mapped visualMap
          name: 'PM2.5', type: 'bar', xAxisIndex: 4, yAxisIndex: 4,
          data: pm25Avg, barWidth: '80%', symbol: 'none'
        },
        { // 17: mapped visualMap
          name: 'PM2.5最大值', type: 'line', xAxisIndex: 4, yAxisIndex: 4,
          data: pm25Max, lineStyle: { width: 1, type: 'dashed' }, symbol: 'none'
        },

        // Grid 5: Livability Ribbon
        { // 18
          name: '宜居度', type: 'bar', xAxisIndex: 5, yAxisIndex: 5,
          data: data.map(d => ({
            value: 1, itemStyle: { color: d.livability ? d.livability.color : '#e2e8f0' }
          })),
          barWidth: '100%', barCategoryGap: '0%'
        }
      ]
    };
  }, [data]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <ReactECharts
        option={option}
        style={{ height: '100%', width: '100%' }}
        theme="light"
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
};
