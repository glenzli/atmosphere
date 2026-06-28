import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface Props {
  dataMap: Record<string, any[]>;
}

export const TrendChart: React.FC<Props> = ({ dataMap }) => {
  const isMobile = useMediaQuery('(max-width: 640px)');

  const option = useMemo(() => {
    if (!dataMap || Object.keys(dataMap).length === 0) return {};

    // 1. 过滤残缺年份 (要求至少 350 天)，并按时间正序排列 (从左到右: 过去 -> 现在)
    const validYears = Object.keys(dataMap)
      .filter(year => dataMap[year].length >= 350)
      .sort((a, b) => Number(a.replace('年', '')) - Number(b.replace('年', '')));

    if (validYears.length === 0) return {};

    const xAxisData = validYears;

    // 2. 统计数据提取
    const seasonData = {
      spring: [] as number[],
      summer: [] as number[],
      autumn: [] as number[],
      winter: [] as number[],
      severeSummer: [] as number[],
      severeWinter: [] as number[]
    };

    const livableData = {
      level1: [] as number[], // 极度舒适
      level2: [] as number[], // 尚可接受
      level3: [] as number[], // 较不宜居
      level4: [] as number[]  // 极端恶劣
    };

    validYears.forEach(year => {
      const yearData = dataMap[year];
      let sp = 0, su = 0, au = 0, wi = 0;
      let ss = 0, sw = 0;
      let l1 = 0, l2 = 0, l3 = 0, l4 = 0;

      yearData.forEach(d => {
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
      });

      seasonData.spring.push(sp);
      seasonData.summer.push(su);
      seasonData.autumn.push(au);
      seasonData.winter.push(wi);
      seasonData.severeSummer.push(ss);
      seasonData.severeWinter.push(sw);

      livableData.level1.push(l1);
      livableData.level2.push(l2);
      livableData.level3.push(l3);
      livableData.level4.push(l4);
    });

    const totalLivable = livableData.level1.map((v, i) => v + livableData.level2[i]);
    const totalUnlivable = livableData.level3.map((v, i) => v + livableData.level4[i]);
    const axisLabel = { color: '#64748b', fontSize: isMobile ? 10 : 12 };

    return {
      title: [
        { text: '十年气候变迁宏观趋势', left: 'center', top: 0, textStyle: { color: '#0f172a', fontSize: isMobile ? 14 : 16 } },
        { text: '📅 四季时长演变 (天)', left: isMobile ? '8%' : '4%', top: isMobile ? '7%' : '6%', textStyle: { fontSize: isMobile ? 11 : 13, color: '#64748b', fontWeight: 'normal' } },
        { text: '🏡 宜居/恶劣天数结构 (天)', left: isMobile ? '8%' : '4%', top: isMobile ? '55%' : '53%', textStyle: { fontSize: isMobile ? 11 : 13, color: '#64748b', fontWeight: 'normal' } }
      ],
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        confine: true,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e2e8f0',
        textStyle: { color: '#0f172a' }
      },
      legend: [
        { data: ['春季', '夏季', '秋季', '冬季', '高温预警', '寒冷预警'], top: isMobile ? '11%' : '6%', left: isMobile ? '8%' : undefined, right: isMobile ? '4%' : '4%', type: isMobile ? 'scroll' : undefined, width: isMobile ? '88%' : undefined },
        { data: ['极度舒适', '尚可接受', '全年宜居期', '较不宜居', '极端恶劣', '全年恶劣期'], top: isMobile ? '59%' : '53%', left: isMobile ? '8%' : undefined, right: '4%', type: 'scroll', width: isMobile ? '88%' : '60%' }
      ],
      grid: [
        { left: isMobile ? '9%' : '4%', right: '4%', top: isMobile ? '20%' : '15%', height: isMobile ? '25%' : '30%' },
        { left: isMobile ? '9%' : '4%', right: '4%', top: isMobile ? '68%' : '62%', height: isMobile ? '24%' : '30%' }
      ],
      xAxis: [
        { type: 'category', data: xAxisData, gridIndex: 0, axisLine: { lineStyle: { color: '#cbd5e1' } }, axisLabel },
        { type: 'category', data: xAxisData, gridIndex: 1, axisLine: { lineStyle: { color: '#cbd5e1' } }, axisLabel }
      ],
      yAxis: [
        { type: 'value', gridIndex: 0, splitLine: { lineStyle: { color: '#f1f5f9' } }, axisLabel },
        { type: 'value', gridIndex: 1, splitLine: { lineStyle: { color: '#f1f5f9' } }, axisLabel }
      ],
      series: [
        // Grid 0: Seasons
        { name: '春季', type: 'line', xAxisIndex: 0, yAxisIndex: 0, data: seasonData.spring, itemStyle: { color: '#10b981' }, smooth: true, symbolSize: 6 },
        { name: '夏季', type: 'line', xAxisIndex: 0, yAxisIndex: 0, data: seasonData.summer, itemStyle: { color: '#ef4444' }, smooth: true, symbolSize: 6 },
        { name: '秋季', type: 'line', xAxisIndex: 0, yAxisIndex: 0, data: seasonData.autumn, itemStyle: { color: '#f59e0b' }, smooth: true, symbolSize: 6 },
        { name: '冬季', type: 'line', xAxisIndex: 0, yAxisIndex: 0, data: seasonData.winter, itemStyle: { color: '#3b82f6' }, smooth: true, symbolSize: 6 },
        
        { name: '高温预警', type: 'line', xAxisIndex: 0, yAxisIndex: 0, data: seasonData.severeSummer, itemStyle: { color: '#991b1b' }, areaStyle: { color: 'rgba(153, 27, 27, 0.2)' }, smooth: true, symbol: 'none' },
        { name: '寒冷预警', type: 'line', xAxisIndex: 0, yAxisIndex: 0, data: seasonData.severeWinter, itemStyle: { color: '#1e3a8a' }, areaStyle: { color: 'rgba(30, 58, 138, 0.2)' }, smooth: true, symbol: 'none' },

        // Grid 1: Livability (Stacked Area for better structural perception)
        { name: '极度舒适', type: 'bar', stack: 'livable', xAxisIndex: 1, yAxisIndex: 1, data: livableData.level1, itemStyle: { color: '#10b981' }, barMaxWidth: 40 },
        { name: '尚可接受', type: 'bar', stack: 'livable', xAxisIndex: 1, yAxisIndex: 1, data: livableData.level2, itemStyle: { color: '#3b82f6' }, barMaxWidth: 40 },
        { name: '较不宜居', type: 'bar', stack: 'unlivable', xAxisIndex: 1, yAxisIndex: 1, data: livableData.level3, itemStyle: { color: '#f59e0b' }, barMaxWidth: 40 },
        { name: '极端恶劣', type: 'bar', stack: 'unlivable', xAxisIndex: 1, yAxisIndex: 1, data: livableData.level4, itemStyle: { color: '#ef4444' }, barMaxWidth: 40 },
        
        // Grid 1: Trend Lines
        { name: '全年宜居期', type: 'line', xAxisIndex: 1, yAxisIndex: 1, data: totalLivable, itemStyle: { color: '#047857' }, smooth: true, lineStyle: { width: 3, type: 'dashed' }, symbolSize: 8, z: 10 },
        { name: '全年恶劣期', type: 'line', xAxisIndex: 1, yAxisIndex: 1, data: totalUnlivable, itemStyle: { color: '#b91c1c' }, smooth: true, lineStyle: { width: 3, type: 'dashed' }, symbolSize: 8, z: 10 }
      ]
    };
  }, [dataMap, isMobile]);

  return (
    <div className="trend-chart" style={{ position: 'relative', width: '100%', height: '600px' }}>
      <ReactECharts
        option={option}
        style={{ height: '100%', width: '100%' }}
        theme="light"
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
};
