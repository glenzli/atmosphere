import React, { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { formatLivability, formatMonthLabel, formatSeason, precipLevelKey } from '../i18n/format';

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

type MobileClimateMode = 'overview' | 'thermal' | 'water' | 'air' | 'risk';

const mobileClimateModes: Array<{ key: MobileClimateMode; labelKey: string }> = [
  { key: 'overview', labelKey: 'overview' },
  { key: 'thermal', labelKey: 'thermal' },
  { key: 'water', labelKey: 'water' },
  { key: 'air', labelKey: 'air' },
  { key: 'risk', labelKey: 'risk' },
];

export const ClimateChart: React.FC<Props> = ({ data }) => {
  const { t } = useTranslation();
  const isMobile = useMediaQuery('(max-width: 640px)');
  const [mobileMode, setMobileMode] = useState<MobileClimateMode>('overview');

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

    const scatterTyphoon: [number, number][] = [];
    const scatterRainstorm: [number, number][] = [];
    const scatterSevereHeat: [number, number][] = [];
    const scatterSevereCold: [number, number][] = [];

    data.forEach((d, i) => {
      if (d.windAvg >= 62) scatterTyphoon.push([i, 3]);
      if (d.precipAvg >= 50) scatterRainstorm.push([i, 2]);
      if (d.tMax >= 38 || d.twMax >= 28) scatterSevereHeat.push([i, 1]);
      if ((d.tAvg <= 5 && d.rhAvg >= 80) || d.tMin <= -5) scatterSevereCold.push([i, 0]);
    });


    const markAreas = [];
    let currentSeason = data[0].season;
    let currentStart = data[0].date;
    let currentColor = data[0].seasonColor;

    for (let i = 1; i < data.length; i++) {
      if (data[i].season !== currentSeason) {
        markAreas.push([
          { name: formatSeason(t, currentSeason), xAxis: currentStart, itemStyle: { color: currentColor } },
          { xAxis: data[i - 1].date }
        ]);
        currentSeason = data[i].season;
        currentStart = data[i].date;
        currentColor = data[i].seasonColor;
      }
    }
    markAreas.push([
      { name: formatSeason(t, currentSeason), xAxis: currentStart, itemStyle: { color: currentColor } },
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
    const sectionTitleSize = isMobile ? 11 : 13;
    const chartTitleSize = isMobile ? 14 : 16;
    const axisLabelStyle = { color: '#64748b', fontSize: isMobile ? 10 : 12, margin: isMobile ? 3 : 8 };
    const dateAxisLabel = isMobile
      ? {
          ...axisLabelStyle,
          formatter: (value: string) => formatMonthLabel(t, value)
        }
      : axisLabelStyle;
    const grid = isMobile ? [
      { left: '12%', right: '4%', top: '8%', height: '18%' },
      { left: '12%', right: '4%', top: '31%', height: '15%' },
      { left: '12%', right: '4%', top: '51%', height: '10%' },
      { left: '12%', right: '4%', top: '64%', height: '7%' },
      { left: '12%', right: '4%', top: '75%', height: '7%' },
      { left: '12%', right: '4%', top: '96%', height: '3%' },
      { left: '12%', right: '4%', top: '87%', height: '5%' }
    ] : [
      { left: '4%', right: '4%', top: '4%', height: '22%' },
      { left: '4%', right: '4%', top: '29%', height: '18%' },
      { left: '4%', right: '4%', top: '50%', height: '10%' },
      { left: '4%', right: '4%', top: '63%', height: '8%' },
      { left: '4%', right: '4%', top: '74%', height: '7%' },
      { left: '4%', right: '4%', top: '96%', height: '3%' },
      { left: '4%', right: '4%', top: '88%', height: '5%' }
    ];

    const formatPointTooltip = (params: any) => {
      let html = `<div style="margin-bottom:4px;font-weight:bold;border-bottom:1px solid #cbd5e1;padding-bottom:4px">${params[0].axisValue}</div>`;
      const dataIndex = params[0].dataIndex;
      const pointData = data[dataIndex];
      html += `${t('charts.climate.tooltip.season')}: <b>${formatSeason(t, pointData.season)}</b><br/>`;

      if (pointData.isHuinan) {
        html += `<span style="color:#0284c7;font-weight:bold">${t('charts.climate.tooltip.huinan')}</span><br/>`;
      } else if (pointData.isHumidSpell) {
        html += `<span style="color:#16a34a;font-weight:bold">${t('charts.climate.tooltip.humid')}</span><br/>`;
      } else if (pointData.isDrySpell) {
        html += `<span style="color:#ca8a04;font-weight:bold">${t('charts.climate.tooltip.dry')}</span><br/>`;
      }

      if (pointData.isRainySeason) {
        html += `<span style="color:#0284c7;font-weight:bold">${t('charts.climate.tooltip.rainy')}</span><br/>`;
      }

      const disasters = [];
      if (pointData.windAvg >= 62) disasters.push(t('charts.disasters.wind'));
      if (pointData.precipAvg >= 50) disasters.push(t('charts.disasters.rainstorm'));
      if (pointData.tMax >= 38 || pointData.twMax >= 28) disasters.push(t('charts.disasters.heat'));
      if ((pointData.tAvg <= 5 && pointData.rhAvg >= 80) || pointData.tMin <= -5) disasters.push(t('charts.disasters.cold'));

      if (disasters.length > 0) {
        html += `<div style="margin-top:4px;padding-top:4px;border-top:1px dashed #cbd5e1;color:#ef4444;font-weight:bold">
          ${t('charts.climate.tooltip.disasterTrigger')}: ${disasters.join(' | ')}
        </div>`;
      }

      if (pointData.livability) {
        html += `${t('charts.climate.tooltip.livability')}: <span style="color:${pointData.livability.color};font-weight:bold">${formatLivability(t, pointData.livability.level, pointData.livability.label)}</span><br/>`;
      }

      if (pointData.tMax !== undefined && pointData.tMin !== undefined) {
        html += `${t('charts.climate.tooltip.dryBulb')}: <b>${pointData.tMin}</b>°C ~ <b style="color:#ef4444">${pointData.tMax}</b>°C<br/>`;
      }
      if (pointData.twMax !== undefined && pointData.twMin !== undefined) {
        html += `${t('charts.climate.tooltip.wetBulb')}: <b>${pointData.twMin}</b>°C ~ <b style="color:#ef4444">${pointData.twMax}</b>°C<br/>`;
      }
      if (pointData.rhMax !== undefined && pointData.rhMin !== undefined) {
        html += `${t('charts.climate.tooltip.humidity')}: <b>${pointData.rhMin}</b>% ~ <b style="color:#0ea5e9">${pointData.rhMax}</b>%<br/>`;
      }

      const precipLevel = t(`charts.precipLevels.${precipLevelKey(pointData.precipAvg)}`);
      html += `${t('charts.climate.tooltip.precip')}: <b>${precipLevel}</b> (${pointData.precipAvg} mm)<br/>`;

      if (pointData.pm25Avg !== undefined) {
        let pmColor = '#10b981';
        if (pointData.pm25Avg > 150) pmColor = '#8b5cf6';
        else if (pointData.pm25Avg > 115) pmColor = '#ef4444';
        else if (pointData.pm25Avg > 75) pmColor = '#f97316';
        else if (pointData.pm25Avg > 35) pmColor = '#f59e0b';
        html += `${t('charts.climate.tooltip.air')}: <b style="color:${pmColor}">${pointData.pm25Avg}</b> (${t('charts.climate.tooltip.peak')}: ${pointData.pm25Max})<br/>`;
      }

      return html;
    };

    const tooltip = {
      trigger: 'axis',
      confine: true,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e2e8f0',
      textStyle: { color: '#0f172a' },
      formatter: formatPointTooltip
    };

    const monthAxisLabel = {
      color: '#64748b',
      fontSize: 10,
      formatter: (value: string) => formatMonthLabel(t, value)
    };

    const mobileXAxis = (gridIndex: number, showLabel = false) => ({
      type: 'category',
      data: dates,
      gridIndex,
      axisLine: { lineStyle: { color: '#cbd5e1' } },
      axisTick: { show: false },
      axisLabel: showLabel ? monthAxisLabel : { show: false }
    });

    const mobileYAxis = (gridIndex: number, extra: Record<string, any> = {}) => ({
      type: 'value',
      gridIndex,
      axisLine: { lineStyle: { color: '#cbd5e1' } },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLabel: { color: '#64748b', fontSize: 10, margin: 3 },
      ...extra
    });

    const livabilityRibbon = (xAxisIndex: number, yAxisIndex: number) => ({
      name: t('livability.ribbon'),
      type: 'bar',
      xAxisIndex,
      yAxisIndex,
      data: data.map(d => ({
        value: 1,
        itemStyle: { color: d.livability ? d.livability.color : '#e2e8f0' }
      })),
      barWidth: '100%',
      barCategoryGap: '0%'
    });

    const mobileTemperatureBand = (xAxisIndex: number, yAxisIndex: number) => [
      {
        name: t('charts.climate.series.tempBase'),
        type: 'line',
        xAxisIndex,
        yAxisIndex,
        data: tMin,
        lineStyle: { opacity: 0 },
        stack: `temp-band-${xAxisIndex}`,
        symbol: 'none'
      },
      {
        name: t('charts.climate.series.tempBand'),
        type: 'line',
        xAxisIndex,
        yAxisIndex,
        data: tDiff,
        lineStyle: { opacity: 0 },
        areaStyle: { color: 'rgba(148, 163, 184, 0.16)' },
        stack: `temp-band-${xAxisIndex}`,
        symbol: 'none'
      }
    ];

    const mobileWetBulbBand = (xAxisIndex: number, yAxisIndex: number) => [
      {
        name: t('charts.climate.series.wetBase'),
        type: 'line',
        xAxisIndex,
        yAxisIndex,
        data: twMin,
        lineStyle: { opacity: 0 },
        stack: `wet-band-${xAxisIndex}`,
        symbol: 'none'
      },
      {
        name: t('charts.climate.series.wetBand'),
        type: 'line',
        xAxisIndex,
        yAxisIndex,
        data: twDiff,
        lineStyle: { opacity: 0 },
        areaStyle: { color: 'rgba(16, 185, 129, 0.12)' },
        stack: `wet-band-${xAxisIndex}`,
        symbol: 'none'
      }
    ];

    const mobileHumidityBand = (xAxisIndex: number, yAxisIndex: number) => [
      {
        name: t('charts.climate.series.humidityBase'),
        type: 'line',
        xAxisIndex,
        yAxisIndex,
        data: rhMin,
        lineStyle: { opacity: 0 },
        stack: `humidity-band-${xAxisIndex}`,
        symbol: 'none'
      },
      {
        name: t('charts.climate.series.humidityBand'),
        type: 'line',
        xAxisIndex,
        yAxisIndex,
        data: rhDiff,
        lineStyle: { opacity: 0 },
        areaStyle: { color: 'rgba(14, 165, 233, 0.12)' },
        stack: `humidity-band-${xAxisIndex}`,
        symbol: 'none'
      }
    ];

    const mobileTitle = (title: string, subtitle: string, secondTitle?: string, thirdTitle?: string) => [
      { text: title, left: 'center', top: 0, textStyle: { color: '#0f172a', fontSize: 14, fontWeight: 700 } },
      { text: subtitle, left: '12%', top: '8%', textStyle: { fontSize: 11, color: '#64748b', fontWeight: 'normal' } },
      ...(secondTitle ? [{ text: secondTitle, left: '12%', top: '49%', textStyle: { fontSize: 11, color: '#64748b', fontWeight: 'normal' } }] : []),
      ...(thirdTitle ? [{ text: thirdTitle, left: '12%', top: '86%', textStyle: { fontSize: 11, color: '#64748b', fontWeight: 'normal' } }] : [])
    ];

    if (isMobile) {
      const baseMobile = {
        tooltip,
        legend: { show: false },
        axisPointer: { link: [{ xAxisIndex: 'all' }] }
      };

      if (mobileMode === 'overview') {
        return {
          ...baseMobile,
          title: mobileTitle(
            t('charts.climate.mobileTitles.overview.0'),
            t('charts.climate.mobileTitles.overview.1'),
            t('charts.climate.mobileTitles.overview.2'),
            t('charts.climate.mobileTitles.overview.3')
          ),
          grid: [
            { left: '12%', right: '5%', top: '15%', height: '26%' },
            { left: '12%', right: '12%', top: '56%', height: '22%' },
            { left: '12%', right: '5%', top: '91%', height: '5%' }
          ],
          xAxis: [mobileXAxis(0), mobileXAxis(1), mobileXAxis(2, true)],
          yAxis: [
            mobileYAxis(0),
            mobileYAxis(1),
            mobileYAxis(1, { position: 'right', axisLabel: { color: '#a21caf', fontSize: 10, margin: 3 }, splitLine: { show: false } }),
            { type: 'value', gridIndex: 2, show: false, max: 1 }
          ],
          series: [
            ...mobileTemperatureBand(0, 0),
            {
              name: t('charts.climate.series.tempAvg'),
              type: 'line',
              xAxisIndex: 0,
              yAxisIndex: 0,
              data: tAvg,
              smooth: true,
              symbol: 'none',
              lineStyle: { color: '#64748b', width: 2 },
              markArea: { data: temperatureMarkAreas, label: { show: false } }
            },
            {
              name: t('charts.climate.series.wetFeel'),
              type: 'line',
              xAxisIndex: 0,
              yAxisIndex: 0,
              data: twAvg,
              smooth: true,
              symbol: 'none',
              lineStyle: { color: '#f59e0b', width: 2 }
            },
            {
              name: t('charts.climate.series.precip'),
              type: 'bar',
              xAxisIndex: 1,
              yAxisIndex: 1,
              data: precipAvg,
              barWidth: '80%',
              itemStyle: { color: '#38bdf8' },
              markArea: { data: rainySeasonAreas }
            },
            {
              name: 'PM2.5',
              type: 'line',
              xAxisIndex: 1,
              yAxisIndex: 2,
              data: pm25Avg,
              smooth: true,
              symbol: 'none',
              lineStyle: { color: '#a21caf', width: 2 }
            },
            livabilityRibbon(2, 3)
          ]
        };
      }

      if (mobileMode === 'thermal') {
        return {
          ...baseMobile,
          title: mobileTitle(
            t('charts.climate.mobileTitles.thermal.0'),
            t('charts.climate.mobileTitles.thermal.1'),
            t('charts.climate.mobileTitles.thermal.2')
          ),
          grid: [
            { left: '12%', right: '5%', top: '15%', height: '31%' },
            { left: '12%', right: '5%', top: '57%', height: '31%' }
          ],
          xAxis: [mobileXAxis(0), mobileXAxis(1, true)],
          yAxis: [mobileYAxis(0), mobileYAxis(1)],
          series: [
            ...mobileTemperatureBand(0, 0),
            {
              name: t('charts.climate.series.tempAverage'),
              type: 'line',
              xAxisIndex: 0,
              yAxisIndex: 0,
              data: tAvg,
              smooth: true,
              symbol: 'none',
              lineStyle: { color: '#64748b', width: 2 },
              markArea: { data: temperatureMarkAreas, label: { show: false } }
            },
            {
              name: t('charts.climate.series.tempMax'),
              type: 'line',
              xAxisIndex: 0,
              yAxisIndex: 0,
              data: tMax,
              symbol: 'none',
              lineStyle: { color: '#ef4444', width: 1, type: 'dashed' }
            },
            ...mobileWetBulbBand(1, 1),
            {
              name: t('charts.climate.series.wetFeel'),
              type: 'line',
              xAxisIndex: 1,
              yAxisIndex: 1,
              data: twAvg,
              smooth: true,
              symbol: 'none',
              lineStyle: { color: '#f59e0b', width: 2 }
            },
            {
              name: t('charts.climate.series.wetMax'),
              type: 'line',
              xAxisIndex: 1,
              yAxisIndex: 1,
              data: twMax,
              symbol: 'none',
              lineStyle: { color: '#ef4444', width: 1, type: 'dashed' }
            }
          ]
        };
      }

      if (mobileMode === 'water') {
        return {
          ...baseMobile,
          title: mobileTitle(
            t('charts.climate.mobileTitles.water.0'),
            t('charts.climate.mobileTitles.water.1'),
            t('charts.climate.mobileTitles.water.2')
          ),
          grid: [
            { left: '12%', right: '5%', top: '15%', height: '31%' },
            { left: '12%', right: '5%', top: '57%', height: '31%' }
          ],
          xAxis: [mobileXAxis(0), mobileXAxis(1, true)],
          yAxis: [mobileYAxis(0, { max: 100, min: 0 }), mobileYAxis(1)],
          series: [
            ...mobileHumidityBand(0, 0),
            {
              name: t('charts.climate.series.humidityAvg'),
              type: 'line',
              xAxisIndex: 0,
              yAxisIndex: 0,
              data: rhAvg,
              smooth: true,
              symbol: 'none',
              lineStyle: { color: '#0ea5e9', width: 2 },
              markArea: { data: humidityMarkAreas }
            },
            {
              name: t('charts.climate.series.precip'),
              type: 'bar',
              xAxisIndex: 1,
              yAxisIndex: 1,
              data: precipAvg,
              barWidth: '80%',
              itemStyle: {
                color: (params: any) => {
                  const val = params.value;
                  if (val < 1) return 'rgba(226, 232, 240, 0.35)';
                  if (val < 5) return '#bae6fd';
                  if (val < 15) return '#38bdf8';
                  return '#0284c7';
                }
              },
              markArea: { data: rainySeasonAreas }
            }
          ]
        };
      }

      if (mobileMode === 'air') {
        return {
          ...baseMobile,
          title: mobileTitle(
            t('charts.climate.mobileTitles.air.0'),
            t('charts.climate.mobileTitles.air.1'),
            t('charts.climate.mobileTitles.air.2')
          ),
          grid: [
            { left: '12%', right: '5%', top: '15%', height: '45%' },
            { left: '12%', right: '5%', top: '80%', height: '8%' }
          ],
          xAxis: [mobileXAxis(0), mobileXAxis(1, true)],
          yAxis: [mobileYAxis(0), { type: 'value', gridIndex: 1, show: false, max: 1 }],
          series: [
            {
              name: 'PM2.5',
              type: 'bar',
              xAxisIndex: 0,
              yAxisIndex: 0,
              data: pm25Avg,
              barWidth: '80%',
              itemStyle: {
                color: (params: any) => {
                  const val = params.value;
                  if (val <= 35) return '#10b981';
                  if (val <= 75) return '#f59e0b';
                  if (val <= 115) return '#f97316';
                  if (val <= 150) return '#ef4444';
                  return '#8b5cf6';
                }
              }
            },
            {
              name: t('charts.climate.series.pm25Peak'),
              type: 'line',
              xAxisIndex: 0,
              yAxisIndex: 0,
              data: pm25Max,
              smooth: true,
              symbol: 'none',
              lineStyle: { color: '#86198f', width: 1, type: 'dashed' }
            },
            livabilityRibbon(1, 1)
          ]
        };
      }

      return {
        ...baseMobile,
        title: mobileTitle(
          t('charts.climate.mobileTitles.risk.0'),
          t('charts.climate.mobileTitles.risk.1'),
          t('charts.climate.mobileTitles.risk.2')
        ),
        grid: [
          { left: '16%', right: '5%', top: '16%', height: '42%' },
          { left: '12%', right: '5%', top: '82%', height: '8%' }
        ],
        xAxis: [mobileXAxis(0), mobileXAxis(1, true)],
        yAxis: [
          {
            type: 'value',
            gridIndex: 0,
            min: -0.5,
            max: 3.5,
            splitLine: { show: true, lineStyle: { type: 'dashed', color: '#f1f5f9' } },
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
              formatter: (val: number) => {
                if (val === 0) return t('charts.disasters.coldShort');
                if (val === 1) return t('charts.disasters.heatShort');
                if (val === 2) return t('charts.disasters.rainstormShort');
                if (val === 3) return t('charts.disasters.windShort');
                return '';
              },
              color: '#64748b',
              fontSize: 10,
              margin: 2
            }
          },
          { type: 'value', gridIndex: 1, show: false, max: 1 }
        ],
        series: [
          { name: t('charts.disasters.coldShort'), type: 'scatter', xAxisIndex: 0, yAxisIndex: 0, data: scatterSevereCold, symbolSize: 6, itemStyle: { color: '#0ea5e9' } },
          { name: t('charts.disasters.heatShort'), type: 'scatter', xAxisIndex: 0, yAxisIndex: 0, data: scatterSevereHeat, symbolSize: 6, itemStyle: { color: '#ef4444' } },
          { name: t('charts.disasters.rainstormShort'), type: 'scatter', xAxisIndex: 0, yAxisIndex: 0, data: scatterRainstorm, symbolSize: 6, itemStyle: { color: '#1d4ed8' } },
          { name: t('charts.disasters.windShort'), type: 'scatter', xAxisIndex: 0, yAxisIndex: 0, data: scatterTyphoon, symbolSize: 6, itemStyle: { color: '#8b5cf6' } },
          livabilityRibbon(1, 1)
        ]
      };
    }

    return {
      title: [
        {
          text: t('charts.climate.titles.main'),
          left: isMobile ? '12%' : 'center',
          top: isMobile ? '0.8%' : 0,
          textStyle: { color: '#0f172a', fontSize: chartTitleSize }
        },
        {
          text: isMobile ? t('charts.climate.titles.dryBulbShort') : t('charts.climate.titles.dryBulb'),
          left: isMobile ? '12%' : '4%',
          top: isMobile ? '4.2%' : '1%',
          textStyle: { fontSize: sectionTitleSize, color: '#64748b', fontWeight: 'normal' }
        },
        {
          text: isMobile ? t('charts.climate.titles.wetBulbShort') : t('charts.climate.titles.wetBulb'),
          left: isMobile ? '12%' : '4%',
          top: isMobile ? '27.2%' : '26%',
          textStyle: { fontSize: sectionTitleSize, color: '#64748b', fontWeight: 'normal' }
        },
        {
          text: isMobile ? t('charts.climate.titles.humidityShort') : t('charts.climate.titles.humidity'),
          left: isMobile ? '12%' : '4%',
          top: isMobile ? '47.2%' : '47%',
          textStyle: { fontSize: sectionTitleSize, color: '#64748b', fontWeight: 'normal' }
        },
        {
          text: isMobile ? t('charts.climate.titles.precipShort') : t('charts.climate.titles.precip'),
          left: isMobile ? '12%' : '4%',
          top: isMobile ? '60.5%' : '60%',
          textStyle: { fontSize: sectionTitleSize, color: '#64748b', fontWeight: 'normal' }
        },
        {
          text: isMobile ? t('charts.climate.titles.airShort') : t('charts.climate.titles.air'),
          left: isMobile ? '12%' : '4%',
          top: isMobile ? '71.5%' : '71%',
          textStyle: { fontSize: sectionTitleSize, color: '#64748b', fontWeight: 'normal' }
        },
        {
          text: isMobile ? t('charts.climate.titles.disastersShort') : t('charts.climate.titles.disasters'),
          left: isMobile ? '12%' : '4%',
          top: isMobile ? '83.2%' : '84%',
          textStyle: { fontSize: sectionTitleSize, color: '#ef4444', fontWeight: 'bold' }
        },
        {
          text: t('charts.climate.titles.livability'),
          left: isMobile ? '12%' : '4%',
          top: isMobile ? '93.5%' : '94%',
          textStyle: { fontSize: sectionTitleSize, color: '#64748b', fontWeight: 'normal' }
        }
      ],
      tooltip,
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
      dataZoom: isMobile ? [
        { type: 'inside', xAxisIndex: [0, 1, 2, 3, 4, 5, 6], filterMode: 'none' }
      ] : [],
      grid,
      xAxis: [
        { type: 'category', data: dates, gridIndex: 0, axisLine: { lineStyle: { color: '#cbd5e1' } }, axisLabel: { show: false }, axisTick: { show: false } },
        { type: 'category', data: dates, gridIndex: 1, axisLine: { lineStyle: { color: '#cbd5e1' } }, axisLabel: { show: false }, axisTick: { show: false } },
        { type: 'category', data: dates, gridIndex: 2, axisLine: { lineStyle: { color: '#cbd5e1' } }, axisLabel: { show: false }, axisTick: { show: false } },
        { type: 'category', data: dates, gridIndex: 3, axisLine: { lineStyle: { color: '#cbd5e1' } }, axisLabel: { show: false }, axisTick: { show: false } },
        { type: 'category', data: dates, gridIndex: 4, axisLine: { lineStyle: { color: '#cbd5e1' } }, axisLabel: { show: false }, axisTick: { show: false } },
        { type: 'category', data: dates, gridIndex: 5, axisLine: { lineStyle: { color: '#cbd5e1' } }, axisLabel: dateAxisLabel },
        { type: 'category', data: dates, gridIndex: 6, show: false }
      ],
      yAxis: [
        { type: 'value', gridIndex: 0, axisLine: { lineStyle: { color: '#cbd5e1' } }, splitLine: { lineStyle: { color: '#f1f5f9' } }, axisLabel: axisLabelStyle },
        { type: 'value', gridIndex: 1, axisLine: { lineStyle: { color: '#cbd5e1' } }, splitLine: { lineStyle: { color: '#f1f5f9' } }, axisLabel: axisLabelStyle },
        { type: 'value', gridIndex: 2, max: 100, min: 0, axisLine: { lineStyle: { color: '#cbd5e1' } }, splitLine: { lineStyle: { color: '#f1f5f9' } }, axisLabel: axisLabelStyle },
        { type: 'value', gridIndex: 3, axisLine: { lineStyle: { color: '#cbd5e1' } }, splitLine: { lineStyle: { color: '#f1f5f9' } }, axisLabel: axisLabelStyle },
        { type: 'value', gridIndex: 4, axisLine: { lineStyle: { color: '#cbd5e1' } }, splitLine: { lineStyle: { color: '#f1f5f9' } }, axisLabel: axisLabelStyle },
        { type: 'value', gridIndex: 5, show: false, max: 1 },
        { 
          type: 'value', 
          gridIndex: 6, 
          min: -0.5, 
          max: 3.5, 
          splitLine: { show: true, lineStyle: { type: 'dashed', color: '#f1f5f9' } },
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            formatter: (val: number) => {
              if (val === 0) return isMobile ? t('charts.disasters.coldShort') : t('charts.disasters.cold');
              if (val === 1) return isMobile ? t('charts.disasters.heatShort') : t('charts.disasters.heat');
              if (val === 2) return isMobile ? t('charts.disasters.rainstormShort') : t('charts.disasters.rainstorm');
              if (val === 3) return isMobile ? t('charts.disasters.windShort') : t('charts.disasters.wind');
              return '';
            },
            color: '#64748b',
            fontSize: isMobile ? 9 : 10,
            margin: 2
          }
        }
      ],
      series: [
        // Grid 0: Dry Bulb Track
        { // 0
          name: t('charts.climate.series.tempBase'), type: 'line', xAxisIndex: 0, yAxisIndex: 0,
          data: tMin, lineStyle: { opacity: 0 }, stack: 't-band', symbol: 'none'
        },
        { // 1
          name: t('charts.climate.series.tempBand'), type: 'line', xAxisIndex: 0, yAxisIndex: 0,
          data: tDiff, lineStyle: { opacity: 0 }, areaStyle: { color: 'rgba(148, 163, 184, 0.15)' }, stack: 't-band', symbol: 'none'
        },
        { // 2: mapped visualMap
          name: t('charts.climate.series.tempAvg'), type: 'line', xAxisIndex: 0, yAxisIndex: 0,
          data: tAvg, smooth: true, lineStyle: { width: 2, type: 'solid' }, symbol: 'none',
          markArea: {
            data: temperatureMarkAreas,
            label: isMobile
              ? { show: false }
              : { color: '#64748b', fontWeight: 'bold', position: 'insideTop', padding: [10, 0, 0, 0] }
          }
        },
        { // 3: mapped visualMap
          name: t('charts.climate.series.tempMax'), type: 'line', xAxisIndex: 0, yAxisIndex: 0,
          data: tMax, lineStyle: { width: 1, type: 'dashed' }, symbol: 'none'
        },
        { // 4: mapped visualMap
          name: t('charts.climate.series.tempMin'), type: 'line', xAxisIndex: 0, yAxisIndex: 0,
          data: tMin, lineStyle: { width: 1, type: 'dashed' }, symbol: 'none'
        },
        
        // Grid 1: Wet Bulb Track
        { // 5
          name: t('charts.climate.series.wetBase'), type: 'line', xAxisIndex: 1, yAxisIndex: 1,
          data: twMin, lineStyle: { opacity: 0 }, stack: 'tw-band', symbol: 'none'
        },
        { // 6
          name: t('charts.climate.series.wetBand'), type: 'line', xAxisIndex: 1, yAxisIndex: 1,
          data: twDiff, lineStyle: { opacity: 0 }, areaStyle: { color: 'rgba(16, 185, 129, 0.1)' }, stack: 'tw-band', symbol: 'none'
        },
        { // 7: mapped visualMap
          name: t('charts.climate.series.wetAvg'), type: 'line', xAxisIndex: 1, yAxisIndex: 1,
          data: twAvg, smooth: true, lineStyle: { width: 3, type: 'solid' }, symbol: 'none'
        },
        { // 8: mapped visualMap
          name: t('charts.climate.series.wetMax'), type: 'line', xAxisIndex: 1, yAxisIndex: 1,
          data: twMax, lineStyle: { width: 1, type: 'dashed' }, symbol: 'none'
        },
        { // 9: mapped visualMap
          name: t('charts.climate.series.wetMin'), type: 'line', xAxisIndex: 1, yAxisIndex: 1,
          data: twMin, lineStyle: { width: 1, type: 'dashed' }, symbol: 'none'
        },

        // Grid 2: Humidity Track
        { // 10
          name: t('charts.climate.series.humidityBase'), type: 'line', xAxisIndex: 2, yAxisIndex: 2,
          data: rhMin, lineStyle: { opacity: 0 }, stack: 'rh-band', symbol: 'none'
        },
        { // 11
          name: t('charts.climate.series.humidityDiff'), type: 'line', xAxisIndex: 2, yAxisIndex: 2,
          data: rhDiff, lineStyle: { opacity: 0 }, areaStyle: { color: 'rgba(14, 165, 233, 0.1)' }, stack: 'rh-band', symbol: 'none'
        },
        { // 12: mapped visualMap
          name: t('charts.climate.series.humidityAvg'), type: 'line', xAxisIndex: 2, yAxisIndex: 2,
          data: rhAvg, smooth: true, lineStyle: { width: 2, type: 'solid' }, symbol: 'none',
          markArea: { data: humidityMarkAreas }
        },
        { // 13: mapped visualMap
          name: t('charts.climate.series.humidityMax'), type: 'line', xAxisIndex: 2, yAxisIndex: 2,
          data: rhMax, lineStyle: { width: 1, type: 'dashed' }, symbol: 'none'
        },
        { // 14: mapped visualMap
          name: t('charts.climate.series.humidityMin'), type: 'line', xAxisIndex: 2, yAxisIndex: 2,
          data: rhMin, lineStyle: { width: 1, type: 'dashed' }, symbol: 'none'
        },

        // Grid 3: Precipitation Track
        { // 15
          name: t('charts.climate.series.precipAvg'), type: 'bar', xAxisIndex: 3, yAxisIndex: 3,
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
          name: t('charts.climate.series.pm25Peak'), type: 'line', xAxisIndex: 4, yAxisIndex: 4,
          data: pm25Max, lineStyle: { width: 1, type: 'dashed' }, symbol: 'none'
        },

        // Grid 5: Livability Ribbon
        { // 18
          name: t('livability.ribbon'), type: 'bar', xAxisIndex: 5, yAxisIndex: 5,
          data: data.map(d => ({
            value: 1, itemStyle: { color: d.livability ? d.livability.color : '#e2e8f0' }
          })),
          barWidth: '100%', barCategoryGap: '0%'
        },
        // Grid 6: Disaster Scatter
        {
          name: t('charts.disasters.coldShort'), type: 'scatter', xAxisIndex: 6, yAxisIndex: 6,
          data: scatterSevereCold, symbolSize: 6, itemStyle: { color: '#0ea5e9' }
        },
        {
          name: t('charts.disasters.heatShort'), type: 'scatter', xAxisIndex: 6, yAxisIndex: 6,
          data: scatterSevereHeat, symbolSize: 6, itemStyle: { color: '#ef4444' }
        },
        {
          name: t('charts.disasters.rainstormShort'), type: 'scatter', xAxisIndex: 6, yAxisIndex: 6,
          data: scatterRainstorm, symbolSize: 6, itemStyle: { color: '#1d4ed8' }
        },
        {
          name: t('charts.disasters.windShort'), type: 'scatter', xAxisIndex: 6, yAxisIndex: 6,
          data: scatterTyphoon, symbolSize: 6, itemStyle: { color: '#8b5cf6' }
        }
      ]
    };
  }, [data, isMobile, mobileMode, t]);

  return (
    <div className="climate-chart-shell">
      {isMobile && (
        <div className="mobile-chart-modes" role="tablist" aria-label={t('charts.climate.modeLabel')}>
          {mobileClimateModes.map(mode => (
            <button
              key={mode.key}
              type="button"
              className={`mobile-chart-mode ${mobileMode === mode.key ? 'active' : ''}`}
              onClick={() => setMobileMode(mode.key)}
              role="tab"
              aria-selected={mobileMode === mode.key}
            >
              {t(`charts.climate.modes.${mode.labelKey}`)}
            </button>
          ))}
        </div>
      )}
      <div className="climate-chart-canvas">
        <ReactECharts
          option={option}
          style={{ height: '100%', width: '100%' }}
          theme="light"
          opts={{ renderer: 'canvas' }}
        />
      </div>
    </div>
  );
};
