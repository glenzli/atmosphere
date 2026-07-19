import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { GitCompareArrows } from 'lucide-react';
import { comparisonColors, palette } from '../theme/palette';

export interface CityCompareData {
  name: string;
  dataMap: Record<string, any[]>;
}

interface Props {
  cities: CityCompareData[];
}

export const CompareDashboard: React.FC<Props> = ({ cities }) => {
  const { t } = useTranslation();
  const isMobile = useMediaQuery('(max-width: 640px)');

  const option = useMemo(() => {
    if (!cities || cities.length === 0) return {};

    const stats = cities.map(city => {
      const validYears = Object.keys(city.dataMap).filter(year => city.dataMap[year].length >= 350);
      const yearsCount = validYears.length || 1;
      
      let sp = 0, su = 0, au = 0, wi = 0;
      let ss = 0, sw = 0; 
      let l1 = 0, l2 = 0, l3 = 0, l4 = 0;
      let huinan = 0, rainy = 0, humid = 0, dry = 0, smog = 0;
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
          if (d.pm25Avg > 75) smog++;
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
        smog: Math.round(smog / yearsCount),
        rhAvg: Math.round(rhAvgSum / (totalDays || 1))
      };
    });

    const cityNames = stats.map(s => s.name);
    const labels = {
      level1: t('livability.level1'),
      level2: t('livability.level2'),
      level3: t('livability.level3'),
      level4: t('livability.level4'),
      spring: t('seasons.spring'),
      summer: t('seasons.summer'),
      autumn: t('seasons.autumn'),
      winter: t('seasons.winter'),
      heat: t('charts.disasters.heat'),
      cold: t('charts.disasters.cold'),
      huinan: t('charts.compare.huinan'),
      rainy: t('charts.compare.rainy'),
      humid: t('charts.compare.humid'),
      dry: t('charts.compare.dry'),
      smog: t('charts.compare.smog'),
    };

    // Compute max for radar
    const maxHuinan = Math.max(30, ...stats.map(s => s.huinan));
    const maxRainy = Math.max(60, ...stats.map(s => s.rainy));
    const maxHumid = Math.max(90, ...stats.map(s => s.humid));
    const maxDry = Math.max(90, ...stats.map(s => s.dry));
    const maxSmog = Math.max(30, ...stats.map(s => s.smog));
    const axisLabel = { color: palette.muted, fontSize: isMobile ? 10 : 12, interval: 0, rotate: isMobile ? 25 : 0 };

    return {
      color: [...comparisonColors],
      title: [
        { text: t('charts.compare.livability'), left: isMobile ? '50%' : '25%', top: isMobile ? '2%' : '5%', textAlign: 'center', textStyle: { fontSize: isMobile ? 12 : 14, color: palette.heading } },
        { text: t('charts.compare.seasons'), left: isMobile ? '50%' : '75%', top: isMobile ? '27%' : '5%', textAlign: 'center', textStyle: { fontSize: isMobile ? 12 : 14, color: palette.heading } },
        { text: isMobile ? t('charts.compare.extremesShort') : t('charts.compare.extremes'), left: isMobile ? '50%' : '25%', top: isMobile ? '52%' : '55%', textAlign: 'center', textStyle: { fontSize: isMobile ? 12 : 14, color: palette.heading } },
        { text: isMobile ? t('charts.compare.sensitiveShort') : t('charts.compare.sensitive'), left: isMobile ? '50%' : '75%', top: isMobile ? '76%' : '55%', textAlign: 'center', textStyle: { fontSize: isMobile ? 12 : 14, color: palette.heading } }
      ],
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        confine: true,
        formatter: (params: any) => {
          if (params.componentSubType === 'radar') return params.name; // Radar tooltip is handled differently
          let html = `<div style="font-weight:bold;margin-bottom:4px;">${params[0].axisValue}</div>`;
          params.forEach((p: any) => {
            let val = p.value;
            if (val < 0) val = -val; // Fix negative winter values
            html += `${p.marker} ${p.seriesName}: <b>${val}</b>${t('common.dayUnit')}<br/>`;
          });
          return html;
        }
      },
      legend: [
        { data: [labels.level1, labels.level2, labels.level3, labels.level4], top: isMobile ? '5%' : '10%', left: isMobile ? '4%' : '5%', width: isMobile ? '92%' : '40%', type: isMobile ? 'scroll' : undefined },
        { data: [labels.spring, labels.summer, labels.autumn, labels.winter], top: isMobile ? '30%' : '10%', left: isMobile ? '4%' : '55%', width: isMobile ? '92%' : '40%', type: isMobile ? 'scroll' : undefined },
        { data: [labels.heat, labels.cold], top: isMobile ? '55%' : '60%', left: isMobile ? '4%' : '5%', width: isMobile ? '92%' : '40%' }
      ],
      grid: [
        isMobile ? { left: '12%', right: '5%', top: '9%', height: '15%' } : { left: '5%', right: '55%', top: '20%', height: '25%' },
        isMobile ? { left: '12%', right: '5%', top: '34%', height: '15%' } : { left: '55%', right: '5%', top: '20%', height: '25%' },
        isMobile ? { left: '12%', right: '5%', top: '59%', height: '14%' } : { left: '5%', right: '55%', top: '70%', height: '25%' }
      ],
      radar: {
        center: isMobile ? ['50%', '90%'] : ['75%', '80%'],
        radius: isMobile ? '14%' : '30%',
        indicator: [
          { name: labels.huinan, max: maxHuinan },
          { name: labels.rainy, max: maxRainy },
          { name: labels.humid, max: maxHumid },
          { name: labels.dry, max: maxDry },
          { name: labels.smog, max: maxSmog }
        ],
        axisName: { color: palette.muted },
        splitLine: { lineStyle: { color: palette.axis } },
        splitArea: { areaStyle: { color: [palette.surfaceSubtle, palette.brandSoft] } }
      },
      xAxis: [
        { type: 'category', data: cityNames, gridIndex: 0, axisLine: { lineStyle: { color: palette.axis } }, axisLabel },
        { type: 'category', data: cityNames, gridIndex: 1, axisLine: { lineStyle: { color: palette.axis } }, axisLabel },
        { type: 'category', data: cityNames, gridIndex: 2, axisLine: { lineStyle: { color: palette.axis } }, axisLabel }
      ],
      yAxis: [
        { type: 'value', gridIndex: 0, splitLine: { lineStyle: { color: palette.grid } }, axisLabel: { color: palette.muted, fontSize: isMobile ? 10 : 12 } },
        { type: 'value', gridIndex: 1, splitLine: { lineStyle: { color: palette.grid } }, axisLabel: { color: palette.muted, fontSize: isMobile ? 10 : 12 } },
        { type: 'value', gridIndex: 2, splitLine: { lineStyle: { color: palette.grid } }, axisLabel: { color: palette.muted, fontSize: isMobile ? 10 : 12 } }
      ],
      series: [
        // Livability
        { name: labels.level1, type: 'bar', stack: 'livability', xAxisIndex: 0, yAxisIndex: 0, data: stats.map(s => s.l1), itemStyle: { color: palette.spring }, barMaxWidth: 40 },
        { name: labels.level2, type: 'bar', stack: 'livability', xAxisIndex: 0, yAxisIndex: 0, data: stats.map(s => s.l2), itemStyle: { color: palette.brand }, barMaxWidth: 40 },
        { name: labels.level3, type: 'bar', stack: 'livability', xAxisIndex: 0, yAxisIndex: 0, data: stats.map(s => s.l3), itemStyle: { color: palette.autumn }, barMaxWidth: 40 },
        { name: labels.level4, type: 'bar', stack: 'livability', xAxisIndex: 0, yAxisIndex: 0, data: stats.map(s => s.l4), itemStyle: { color: palette.summer }, barMaxWidth: 40 },
        
        // Seasons
        { name: labels.spring, type: 'bar', stack: 'seasons', xAxisIndex: 1, yAxisIndex: 1, data: stats.map(s => s.spring), itemStyle: { color: palette.spring }, barMaxWidth: 40 },
        { name: labels.summer, type: 'bar', stack: 'seasons', xAxisIndex: 1, yAxisIndex: 1, data: stats.map(s => s.summer), itemStyle: { color: palette.summer }, barMaxWidth: 40 },
        { name: labels.autumn, type: 'bar', stack: 'seasons', xAxisIndex: 1, yAxisIndex: 1, data: stats.map(s => s.autumn), itemStyle: { color: palette.autumn }, barMaxWidth: 40 },
        { name: labels.winter, type: 'bar', stack: 'seasons', xAxisIndex: 1, yAxisIndex: 1, data: stats.map(s => s.winter), itemStyle: { color: palette.winter }, barMaxWidth: 40 },

        // Extreme Weather
        { name: labels.heat, type: 'bar', xAxisIndex: 2, yAxisIndex: 2, data: stats.map(s => s.severeSummer), itemStyle: { color: palette.heatWarning, borderRadius: [4, 4, 0, 0] }, barMaxWidth: 40 },
        { name: labels.cold, type: 'bar', xAxisIndex: 2, yAxisIndex: 2, data: stats.map(s => -s.severeWinter), itemStyle: { color: palette.coldWarning, borderRadius: [0, 0, 4, 4] }, barMaxWidth: 40 },

        // Radar
        {
          type: 'radar',
          data: stats.map((s) => ({
            value: [s.huinan, s.rainy, s.humid, s.dry, s.smog],
            name: s.name,
            areaStyle: { opacity: 0.1 }
          })),
          tooltip: {
            trigger: 'item',
            formatter: (params: any) => {
              const vals = params.value;
              const unit = t('common.dayUnit');
              return `<b>${params.name}</b><br/>${labels.huinan}: ${vals[0]}${unit}<br/>${labels.rainy}: ${vals[1]}${unit}<br/>${labels.humid}: ${vals[2]}${unit}<br/>${labels.dry}: ${vals[3]}${unit}<br/>${labels.smog}: ${vals[4]}${unit}`;
            }
          }
        }
      ]
    };
  }, [cities, isMobile, t]);

  if (!cities || cities.length < 2) {
    return (
      <div className="compare-empty-state" role="status">
        <span aria-hidden="true"><GitCompareArrows size={24} strokeWidth={1.8} /></span>
        <p>{t('charts.compare.emptyState')}</p>
      </div>
    );
  }

  return (
    <div className="compare-dashboard">
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
