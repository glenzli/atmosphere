import type { TFunction } from 'i18next';

const seasonKeyMap: Record<string, string> = {
  '春季': 'spring',
  '夏季': 'summer',
  '秋季': 'autumn',
  '冬季': 'winter',
};

const livabilityKeyMap: Record<number, string> = {
  1: 'level1',
  2: 'level2',
  3: 'level3',
  4: 'level4',
};

export function formatSeason(t: TFunction, season: string) {
  const key = seasonKeyMap[season];
  return key ? t(`seasons.${key}`) : season;
}

export function formatLivability(t: TFunction, level?: number, fallback?: string) {
  const key = level ? livabilityKeyMap[level] : undefined;
  return key ? t(`livability.${key}`) : (fallback || '');
}

export function formatYearLabel(year: string, language: string) {
  const numericYear = year.replace('年', '');
  return language.startsWith('zh') ? `${numericYear}年` : numericYear;
}

export function formatMonthLabel(t: TFunction, value: string) {
  if (!value.endsWith('-01')) return '';
  return t('charts.month', { month: Number(value.slice(0, 2)) });
}

export function precipLevelKey(value: number) {
  if (value >= 50) return 'storm';
  if (value >= 20) return 'heavy';
  if (value >= 10) return 'moderate';
  if (value >= 1) return 'light';
  return 'none';
}

export function ensoLabelKey(value: string) {
  if (value === 'El Niño') return 'elNino';
  if (value === 'La Niña') return 'laNina';
  return 'neutral';
}
