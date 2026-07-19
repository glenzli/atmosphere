import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { formatYearLabel } from '../i18n/format';
import { palette } from '../theme/palette';

interface Props {
  dataMap: Record<string, any[]>;
}

export const TrendChart: React.FC<Props> = ({ dataMap }) => {
  const { t, i18n } = useTranslation();
  const isMobile = useMediaQuery('(max-width: 640px)');

  const option = useMemo(() => {
    if (!dataMap || Object.keys(dataMap).length === 0) return {};

    // 1. 过滤残缺年份 (要求至少 350 天)，并按时间正序排列 (从左到右: 过去 -> 现在)
    const validYears = Object.keys(dataMap)
      .filter(year => dataMap[year].length >= 350)
      .sort((a, b) => Number(a.replace('年', '')) - Number(b.replace('年', '')));

    if (validYears.length === 0) return {};

    const xAxisData = validYears.map(year => formatYearLabel(year, i18n.language));
    const labels = {
      spring: t('seasons.spring'),
      summer: t('seasons.summer'),
      autumn: t('seasons.autumn'),
      winter: t('seasons.winter'),
      severeSummer: t('charts.disasters.heat'),
      severeWinter: t('charts.disasters.cold'),
      level1: t('livability.level1'),
      level2: t('livability.level2'),
      level3: t('livability.level3'),
      level4: t('livability.level4'),
      totalLivable: t('livability.totalGood'),
      totalUnlivable: t('livability.totalBad'),
    };

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
    const axisLabel = { color: palette.muted, fontSize: isMobile ? 10 : 12 };

    return {
      title: [
        { text: t('charts.trend.main'), left: 'center', top: 0, textStyle: { color: palette.heading, fontSize: isMobile ? 14 : 16 } },
        { text: t('charts.trend.seasons'), left: isMobile ? '8%' : '4%', top: isMobile ? '7%' : '6%', textStyle: { fontSize: isMobile ? 11 : 13, color: palette.muted, fontWeight: 'normal' } },
        { text: t('charts.trend.livability'), left: isMobile ? '8%' : '4%', top: isMobile ? '55%' : '53%', textStyle: { fontSize: isMobile ? 11 : 13, color: palette.muted, fontWeight: 'normal' } }
      ],
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        confine: true,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: palette.border,
        textStyle: { color: palette.ink }
      },
      legend: [
        { data: [labels.spring, labels.summer, labels.autumn, labels.winter, labels.severeSummer, labels.severeWinter], top: isMobile ? '11%' : '6%', left: isMobile ? '8%' : undefined, right: isMobile ? '4%' : '4%', type: isMobile ? 'scroll' : undefined, width: isMobile ? '88%' : undefined },
        { data: [labels.level1, labels.level2, labels.totalLivable, labels.level3, labels.level4, labels.totalUnlivable], top: isMobile ? '59%' : '53%', left: isMobile ? '8%' : undefined, right: '4%', type: 'scroll', width: isMobile ? '88%' : '60%' }
      ],
      grid: [
        { left: isMobile ? '9%' : '4%', right: '4%', top: isMobile ? '20%' : '15%', height: isMobile ? '25%' : '30%' },
        { left: isMobile ? '9%' : '4%', right: '4%', top: isMobile ? '68%' : '62%', height: isMobile ? '24%' : '30%' }
      ],
      xAxis: [
        { type: 'category', data: xAxisData, gridIndex: 0, axisLine: { lineStyle: { color: palette.axis } }, axisLabel },
        { type: 'category', data: xAxisData, gridIndex: 1, axisLine: { lineStyle: { color: palette.axis } }, axisLabel }
      ],
      yAxis: [
        { type: 'value', gridIndex: 0, splitLine: { lineStyle: { color: palette.grid } }, axisLabel },
        { type: 'value', gridIndex: 1, splitLine: { lineStyle: { color: palette.grid } }, axisLabel }
      ],
      series: [
        // Grid 0: Seasons
        { name: labels.spring, type: 'line', xAxisIndex: 0, yAxisIndex: 0, data: seasonData.spring, itemStyle: { color: palette.spring }, smooth: true, symbolSize: 6 },
        { name: labels.summer, type: 'line', xAxisIndex: 0, yAxisIndex: 0, data: seasonData.summer, itemStyle: { color: palette.summer }, smooth: true, symbolSize: 6 },
        { name: labels.autumn, type: 'line', xAxisIndex: 0, yAxisIndex: 0, data: seasonData.autumn, itemStyle: { color: palette.autumn }, smooth: true, symbolSize: 6 },
        { name: labels.winter, type: 'line', xAxisIndex: 0, yAxisIndex: 0, data: seasonData.winter, itemStyle: { color: palette.winter }, smooth: true, symbolSize: 6 },
        
        { name: labels.severeSummer, type: 'line', xAxisIndex: 0, yAxisIndex: 0, data: seasonData.severeSummer, itemStyle: { color: palette.heatWarning }, areaStyle: { color: palette.heatWash }, smooth: true, symbol: 'none' },
        { name: labels.severeWinter, type: 'line', xAxisIndex: 0, yAxisIndex: 0, data: seasonData.severeWinter, itemStyle: { color: palette.coldWarning }, areaStyle: { color: palette.coldWash }, smooth: true, symbol: 'none' },

        // Grid 1: Livability (Stacked Area for better structural perception)
        { name: labels.level1, type: 'bar', stack: 'livable', xAxisIndex: 1, yAxisIndex: 1, data: livableData.level1, itemStyle: { color: palette.spring }, barMaxWidth: 40 },
        { name: labels.level2, type: 'bar', stack: 'livable', xAxisIndex: 1, yAxisIndex: 1, data: livableData.level2, itemStyle: { color: palette.brand }, barMaxWidth: 40 },
        { name: labels.level3, type: 'bar', stack: 'unlivable', xAxisIndex: 1, yAxisIndex: 1, data: livableData.level3, itemStyle: { color: palette.autumn }, barMaxWidth: 40 },
        { name: labels.level4, type: 'bar', stack: 'unlivable', xAxisIndex: 1, yAxisIndex: 1, data: livableData.level4, itemStyle: { color: palette.summer }, barMaxWidth: 40 },
        
        // Grid 1: Trend Lines
        { name: labels.totalLivable, type: 'line', xAxisIndex: 1, yAxisIndex: 1, data: totalLivable, itemStyle: { color: palette.spring }, smooth: true, lineStyle: { width: 3, type: 'dashed' }, symbolSize: 8, z: 10 },
        { name: labels.totalUnlivable, type: 'line', xAxisIndex: 1, yAxisIndex: 1, data: totalUnlivable, itemStyle: { color: palette.heatWarning }, smooth: true, lineStyle: { width: 3, type: 'dashed' }, symbolSize: 8, z: 10 }
      ]
    };
  }, [dataMap, i18n.language, isMobile, t]);

  return (
    <div className="trend-chart" style={{ position: 'relative', width: '100%', height: '600px' }}>
      <ReactECharts
        key={isMobile ? 'mobile' : 'desktop'}
        option={option}
        notMerge={true}
        style={{ height: '100%', width: '100%' }}
        theme="light"
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
};
