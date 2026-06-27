export type EnsoStatus = 'El Niño' | 'La Niña' | 'Neutral';

export interface EnsoYearSummary {
  status: EnsoStatus;
  months: number;
  warmMonths: number;
  coldMonths: number;
  min: number;
  max: number;
  avg: number;
}

// Source: NOAA/PSL Oceanic Nino Index CSV (https://psl.noaa.gov/data/correlation/oni.csv).
// Classification is calendar-year dominant ONI state for weighting historical analog years.
export const ensoYears = {
  '1950': { status: 'La Niña', months: 12, warmMonths: 0, coldMonths: 9, min: -1.53, max: -0.39, avg: -0.86 },
  '1951': { status: 'El Niño', months: 12, warmMonths: 7, coldMonths: 2, min: -0.82, max: 1.15, avg: 0.43 },
  '1952': { status: 'Neutral', months: 12, warmMonths: 1, coldMonths: 0, min: -0.08, max: 0.53, avg: 0.17 },
  '1953': { status: 'El Niño', months: 12, warmMonths: 11, coldMonths: 0, min: 0.4, max: 0.84, avg: 0.71 },
  '1954': { status: 'La Niña', months: 12, warmMonths: 1, coldMonths: 8, min: -0.9, max: 0.76, avg: -0.4 },
  '1955': { status: 'La Niña', months: 12, warmMonths: 0, coldMonths: 12, min: -1.67, max: -0.62, avg: -0.95 },
  '1956': { status: 'La Niña', months: 12, warmMonths: 0, coldMonths: 8, min: -1.11, max: -0.42, avg: -0.58 },
  '1957': { status: 'El Niño', months: 12, warmMonths: 9, coldMonths: 0, min: -0.25, max: 1.74, avg: 0.96 },
  '1958': { status: 'El Niño', months: 12, warmMonths: 9, coldMonths: 0, min: 0.39, max: 1.81, avg: 0.83 },
  '1959': { status: 'Neutral', months: 12, warmMonths: 3, coldMonths: 0, min: -0.28, max: 0.62, avg: 0.14 },
  '1960': { status: 'Neutral', months: 12, warmMonths: 0, coldMonths: 0, min: -0.1, max: 0.27, avg: 0.07 },
  '1961': { status: 'Neutral', months: 12, warmMonths: 0, coldMonths: 0, min: -0.3, max: 0.27, avg: -0.02 },
  '1962': { status: 'Neutral', months: 12, warmMonths: 0, coldMonths: 0, min: -0.43, max: -0.04, avg: -0.21 },
  '1963': { status: 'El Niño', months: 12, warmMonths: 7, coldMonths: 0, min: -0.4, max: 1.37, avg: 0.66 },
  '1964': { status: 'La Niña', months: 12, warmMonths: 2, coldMonths: 8, min: -0.82, max: 1.07, avg: -0.34 },
  '1965': { status: 'El Niño', months: 12, warmMonths: 7, coldMonths: 1, min: -0.59, max: 1.98, avg: 0.9 },
  '1966': { status: 'El Niño', months: 12, warmMonths: 4, coldMonths: 0, min: -0.3, max: 1.37, avg: 0.38 },
  '1967': { status: 'Neutral', months: 12, warmMonths: 0, coldMonths: 1, min: -0.53, max: 0.05, avg: -0.31 },
  '1968': { status: 'El Niño', months: 12, warmMonths: 5, coldMonths: 3, min: -0.74, max: 0.98, avg: 0.13 },
  '1969': { status: 'El Niño', months: 12, warmMonths: 10, coldMonths: 0, min: 0.36, max: 1.13, avg: 0.75 },
  '1970': { status: 'La Niña', months: 12, warmMonths: 1, coldMonths: 6, min: -1.15, max: 0.51, avg: -0.32 },
  '1971': { status: 'La Niña', months: 12, warmMonths: 0, coldMonths: 12, min: -1.38, max: -0.73, avg: -0.94 },
  '1972': { status: 'El Niño', months: 12, warmMonths: 8, coldMonths: 1, min: -0.71, max: 2.12, avg: 0.93 },
  '1973': { status: 'La Niña', months: 12, warmMonths: 3, coldMonths: 8, min: -2.03, max: 1.84, avg: -0.62 },
  '1974': { status: 'La Niña', months: 12, warmMonths: 0, coldMonths: 10, min: -1.84, max: -0.37, avg: -0.89 },
  '1975': { status: 'La Niña', months: 12, warmMonths: 0, coldMonths: 12, min: -1.65, max: -0.54, avg: -1.05 },
  '1976': { status: 'Neutral', months: 12, warmMonths: 4, coldMonths: 3, min: -1.56, max: 0.86, avg: -0.05 },
  '1977': { status: 'El Niño', months: 12, warmMonths: 6, coldMonths: 0, min: 0.21, max: 0.81, avg: 0.51 },
  '1978': { status: 'Neutral', months: 12, warmMonths: 1, coldMonths: 0, min: -0.42, max: 0.69, avg: -0.1 },
  '1979': { status: 'Neutral', months: 12, warmMonths: 2, coldMonths: 0, min: 0.03, max: 0.64, avg: 0.25 },
  '1980': { status: 'Neutral', months: 12, warmMonths: 1, coldMonths: 0, min: -0.07, max: 0.59, avg: 0.25 },
  '1981': { status: 'Neutral', months: 12, warmMonths: 0, coldMonths: 1, min: -0.5, max: -0.08, avg: -0.27 },
  '1982': { status: 'El Niño', months: 12, warmMonths: 8, coldMonths: 0, min: -0.05, max: 2.23, avg: 0.99 },
  '1983': { status: 'El Niño', months: 12, warmMonths: 6, coldMonths: 3, min: -1, max: 2.18, avg: 0.48 },
  '1984': { status: 'La Niña', months: 12, warmMonths: 0, coldMonths: 5, min: -1.14, max: -0.16, avg: -0.51 },
  '1985': { status: 'La Niña', months: 12, warmMonths: 0, coldMonths: 6, min: -1.04, max: -0.27, avg: -0.6 },
  '1986': { status: 'El Niño', months: 12, warmMonths: 4, coldMonths: 0, min: -0.49, max: 1.22, avg: 0.25 },
  '1987': { status: 'El Niño', months: 12, warmMonths: 12, coldMonths: 0, min: 0.95, max: 1.7, avg: 1.28 },
  '1988': { status: 'La Niña', months: 12, warmMonths: 2, coldMonths: 8, min: -1.85, max: 0.81, avg: -0.81 },
  '1989': { status: 'La Niña', months: 12, warmMonths: 0, coldMonths: 5, min: -1.69, max: -0.05, avg: -0.6 },
  '1990': { status: 'Neutral', months: 12, warmMonths: 0, coldMonths: 0, min: 0.14, max: 0.41, avg: 0.32 },
  '1991': { status: 'El Niño', months: 12, warmMonths: 7, coldMonths: 0, min: 0.22, max: 1.53, avg: 0.65 },
  '1992': { status: 'El Niño', months: 12, warmMonths: 6, coldMonths: 0, min: -0.28, max: 1.71, avg: 0.63 },
  '1993': { status: 'El Niño', months: 12, warmMonths: 4, coldMonths: 0, min: 0.04, max: 0.7, avg: 0.31 },
  '1994': { status: 'El Niño', months: 12, warmMonths: 4, coldMonths: 0, min: 0.06, max: 1.09, avg: 0.48 },
  '1995': { status: 'La Niña', months: 12, warmMonths: 3, coldMonths: 5, min: -1, max: 0.96, avg: -0.16 },
  '1996': { status: 'La Niña', months: 12, warmMonths: 0, coldMonths: 3, min: -0.9, max: -0.27, avg: -0.46 },
  '1997': { status: 'El Niño', months: 12, warmMonths: 8, coldMonths: 1, min: -0.5, max: 2.4, avg: 1.17 },
  '1998': { status: 'La Niña', months: 12, warmMonths: 4, coldMonths: 6, min: -1.57, max: 2.24, avg: -0.06 },
  '1999': { status: 'La Niña', months: 12, warmMonths: 0, coldMonths: 12, min: -1.65, max: -0.98, avg: -1.23 },
  '2000': { status: 'La Niña', months: 12, warmMonths: 0, coldMonths: 12, min: -1.66, max: -0.51, avg: -0.84 },
  '2001': { status: 'Neutral', months: 12, warmMonths: 0, coldMonths: 2, min: -0.68, max: -0.08, avg: -0.31 },
  '2002': { status: 'El Niño', months: 12, warmMonths: 7, coldMonths: 0, min: -0.15, max: 1.31, avg: 0.63 },
  '2003': { status: 'Neutral', months: 12, warmMonths: 2, coldMonths: 0, min: -0.26, max: 0.92, avg: 0.25 },
  '2004': { status: 'El Niño', months: 12, warmMonths: 5, coldMonths: 0, min: 0.17, max: 0.7, avg: 0.45 },
  '2005': { status: 'Neutral', months: 12, warmMonths: 2, coldMonths: 2, min: -0.84, max: 0.64, avg: 0.04 },
  '2006': { status: 'El Niño', months: 12, warmMonths: 4, coldMonths: 3, min: -0.85, max: 0.94, avg: 0.07 },
  '2007': { status: 'La Niña', months: 12, warmMonths: 1, coldMonths: 6, min: -1.6, max: 0.66, avg: -0.61 },
  '2008': { status: 'La Niña', months: 12, warmMonths: 0, coldMonths: 8, min: -1.64, max: -0.23, avg: -0.78 },
  '2009': { status: 'El Niño', months: 12, warmMonths: 5, coldMonths: 3, min: -0.85, max: 1.56, avg: 0.28 },
  '2010': { status: 'La Niña', months: 12, warmMonths: 3, coldMonths: 7, min: -1.64, max: 1.5, avg: -0.48 },
  '2011': { status: 'La Niña', months: 12, warmMonths: 0, coldMonths: 9, min: -1.31, max: -0.37, avg: -0.78 },
  '2012': { status: 'Neutral', months: 12, warmMonths: 0, coldMonths: 2, min: -0.72, max: 0.41, avg: -0.06 },
  '2013': { status: 'Neutral', months: 12, warmMonths: 0, coldMonths: 0, min: -0.35, max: -0.1, avg: -0.23 },
  '2014': { status: 'Neutral', months: 12, warmMonths: 3, coldMonths: 0, min: -0.32, max: 0.77, avg: 0.2 },
  '2015': { status: 'El Niño', months: 12, warmMonths: 12, coldMonths: 0, min: 0.61, max: 2.75, avg: 1.55 },
  '2016': { status: 'El Niño', months: 12, warmMonths: 4, coldMonths: 4, min: -0.64, max: 2.63, avg: 0.42 },
  '2017': { status: 'La Niña', months: 12, warmMonths: 0, coldMonths: 3, min: -0.86, max: 0.4, avg: -0.12 },
  '2018': { status: 'El Niño', months: 12, warmMonths: 4, coldMonths: 3, min: -0.77, max: 0.97, avg: 0.09 },
  '2019': { status: 'El Niño', months: 12, warmMonths: 8, coldMonths: 0, min: 0.19, max: 0.89, avg: 0.58 },
  '2020': { status: 'La Niña', months: 12, warmMonths: 3, coldMonths: 5, min: -1.2, max: 0.64, avg: -0.27 },
  '2021': { status: 'La Niña', months: 12, warmMonths: 0, coldMonths: 8, min: -0.91, max: -0.3, avg: -0.64 },
  '2022': { status: 'La Niña', months: 12, warmMonths: 0, coldMonths: 12, min: -0.97, max: -0.71, avg: -0.85 },
  '2023': { status: 'El Niño', months: 12, warmMonths: 8, coldMonths: 1, min: -0.54, max: 2.06, avg: 0.9 },
  '2024': { status: 'El Niño', months: 12, warmMonths: 4, coldMonths: 0, min: -0.42, max: 1.92, avg: 0.44 },
  '2025': { status: 'Neutral', months: 12, warmMonths: 0, coldMonths: 3, min: -0.55, max: 0.02, avg: -0.27 },
  '2026': { status: 'Neutral', months: 4, warmMonths: 0, coldMonths: 0, min: -0.37, max: 0.48, avg: 0.02 },
} as const satisfies Record<string, EnsoYearSummary>;

const ensoYearLookup: Record<string, EnsoYearSummary> = ensoYears;

export function getHistoricalEnsoStatus(year: string): EnsoStatus {
  return ensoYearLookup[year]?.status ?? 'Neutral';
}
