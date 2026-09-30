import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CalendarDays,
  CircleAlert,
  Check,
  CloudSun,
  Eye,
  Flame,
  GitCompareArrows,
  House,
  LoaderCircle,
  MapPin,
  PlaneTakeoff,
  Play,
  Plus,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Snowflake,
  TrendingUp,
  X,
} from 'lucide-react';
import { ClimateChart } from './components/ClimateChart';
import { TrendChart } from './components/TrendChart';
import { CompareDashboard, type CityCompareData } from './components/CompareDashboard';
import { geocodeCities, fetchHistoricalData, type GeoCity } from './api';
import { SettingsDialog } from './components/SettingsDialog';
import { readCityList, saveLocalValue } from './utils/storage';
import { applyLivabilityPreference, type PreferenceConfig, defaultPreference } from './utils/analyzer';
import { Predictor } from './components/Predictor';
import { formatLivability, formatSeason, formatYearLabel } from './i18n/format';
import './index.css';

type ViewMode = 'daily' | 'trend' | 'compare' | 'predict';

const viewItems = [
  { key: 'daily', Icon: Eye },
  { key: 'trend', Icon: TrendingUp },
  { key: 'compare', Icon: GitCompareArrows },
  { key: 'predict', Icon: PlaneTakeoff },
] as const;

export default function App() {
  const { t, i18n } = useTranslation();
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('app.loadingDefault');
  const [notice, setNotice] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<GeoCity[]>([]);
  const [candidateQuery, setCandidateQuery] = useState('');
  const request = useRef<AbortController | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<Awaited<ReturnType<typeof fetchHistoricalData>>['data'] | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [showConfig, setShowConfig] = useState(false);
  const [cityInfo, setCityInfo] = useState<GeoCity | null>(null);
  const [compareCities, setCompareCities] = useState<CityCompareData[]>([]);
  const [preference, setPreference] = useState<PreferenceConfig>(defaultPreference);
  const [cachedCities, setCachedCities] = useState(() => readCityList('cached_cities'));
  const [recentCities, setRecentCities] = useState(() => readCityList('recent_cities', i18n.language.startsWith('zh') ? ['深圳', '北京', '海口', '昆明'] : ['Shenzhen', 'Beijing', 'Haikou', 'Kunming']));

  const dataMap = useMemo(() => rawData ? applyLivabilityPreference(rawData, preference) : null, [rawData, preference]);
  const adjustedCompareCities = useMemo(() => compareCities.map(item => ({ ...item, dataMap: applyLivabilityPreference(item.dataMap, preference) })), [compareCities, preference]);

  React.useEffect(() => () => request.current?.abort(), []);

  const cancelSearch = () => {
    request.current?.abort();
    request.current = null;
    setLoading(false);
    setCandidates([]);
    setNotice('app.searchCancelled');
  };

  const beginSearch = (message: string) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setLoadingMsg(message);
    setCandidates([]);
    setError(null);
    setNotice(null);
    return { controller, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(45000)]) };
  };

  const reportError = (err: unknown) => {
    if (err instanceof Error && err.message === 'City not found') setError('app.cityNotFound');
    else if (err instanceof Error && err.name === 'TimeoutError') setError('app.searchTimeout');
    else setError('app.fetchError');
  };

  const loadCity = async (geo: GeoCity, query: string) => {
    const { controller, signal } = beginSearch('app.loadingRemote');
    try {
      const { data, cacheStored } = await fetchHistoricalData(geo.latitude, geo.longitude, 10, signal);
      signal.throwIfAborted();
      if (Object.keys(data).length === 0) throw new Error('No weather data');
      setCityInfo(geo);
      setCity(query);
      setRawData(data);
      const years = Object.keys(data).sort((a, b) => Number(b.replace('年', '')) - Number(a.replace('年', '')));
      setSelectedYear(years[0]);
      setRecentCities(previous => {
        const next = [query, ...previous.filter(item => item !== query)].slice(0, 8);
        saveLocalValue('recent_cities', JSON.stringify(next));
        return next;
      });
      if (cacheStored) setCachedCities(previous => {
        const next = previous.includes(query) ? previous : [...previous, query];
        saveLocalValue('cached_cities', JSON.stringify(next));
        return next;
      });
    } catch (err) {
      if (!controller.signal.aborted) reportError(err);
    } finally {
      if (request.current === controller) {
        setLoading(false);
        request.current = null;
      }
    }
  };

  const executeSearch = async (searchCity: string) => {
    const query = searchCity.trim();
    if (!query) return;
    setCity(query);
    const { controller, signal } = beginSearch('app.loadingCity');
    try {
      const results = await geocodeCities(query, i18n.language, signal);
      signal.throwIfAborted();
      if (results.length === 1) await loadCity(results[0], query);
      else {
        setCandidateQuery(query);
        setCandidates(results);
      }
    } catch (err) {
      if (!controller.signal.aborted) reportError(err);
    } finally {
      if (request.current === controller) {
        setLoading(false);
        request.current = null;
      }
    }
  };

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    await executeSearch(city);
  };

  const activeData = dataMap ? dataMap[selectedYear] : null;

  const seasonStats = { '春季': 0, '夏季': 0, '秋季': 0, '冬季': 0 };
  const severeStats = { summer: 0, winter: 0 };
  const livableStats = { level1: 0, level2: 0, level3: 0, level4: 0, total: 0 };

  if (activeData) {
    activeData.forEach(d => {
      if (d.season in seasonStats) {
        seasonStats[d.season as keyof typeof seasonStats]++;
      }
      if (d.isSevereSummer) severeStats.summer++;
      if (d.isSevereWinter) severeStats.winter++;
      if (d.livability?.level === 1) livableStats.level1++;
      if (d.livability?.level === 2) livableStats.level2++;
      if (d.livability?.level === 3) livableStats.level3++;
      if (d.livability?.level === 4) livableStats.level4++;
    });
    livableStats.total = activeData.length;
  }

  const removeRecentCity = (cityName: string) => {
    setRecentCities(prev => {
      const next = prev.filter(recentCity => recentCity !== cityName);
      saveLocalValue('recent_cities', JSON.stringify(next));
      return next;
    });
  };

  const currentInCompare = cityInfo !== null && compareCities.some(item => item.id === cityInfo.id);
  const addCurrentCityToCompare = () => {
    if (!rawData || !cityInfo || currentInCompare || compareCities.length >= 8) return;
    setCompareCities(previous => previous.some(item => item.id === cityInfo.id) || previous.length >= 8 ? previous : [...previous, {
      id: cityInfo.id,
      name: previous.some(item => item.name === cityInfo.name) ? `${cityInfo.name} (${cityInfo.admin1 || cityInfo.country || cityInfo.id})` : cityInfo.name,
      location: [cityInfo.admin1, cityInfo.country].filter(Boolean).join(' · '),
      dataMap: rawData
    }]);
  };

  const removeCompareCity = (id: number | undefined) => {
    setCompareCities(previous => previous.filter(item => item.id !== id));
  };

  const selectView = (mode: ViewMode) => {
    setViewMode(mode);
    window.requestAnimationFrame(() => document.getElementById('analysis-panel')?.focus({ preventScroll: true }));
  };

  const handleTabKey = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const tabs = Array.from(event.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    const index = tabs.indexOf(event.currentTarget);
    const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
    if (next < 0) return;
    event.preventDefault();
    tabs[next].click();
    tabs[next].focus();
    tabs[next].scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  return (
    <div className={`app-container ${dataMap ? 'has-results' : 'is-empty'}`}>
      <header className="header">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            <CloudSun size={25} strokeWidth={1.9} />
          </span>
          <h1>Atmosphere</h1>
        </div>

        <div className="language-switch" role="group" aria-label={t('language.aria')}>
          <button
            type="button"
            className={`language-option ${i18n.language.startsWith('zh') ? 'active' : ''}`}
            onClick={() => i18n.changeLanguage('zh-CN')}
            aria-pressed={i18n.language.startsWith('zh')}
          >
            中文
          </button>
          <button
            type="button"
            className={`language-option ${i18n.language.startsWith('en') ? 'active' : ''}`}
            onClick={() => i18n.changeLanguage('en-US')}
            aria-pressed={i18n.language.startsWith('en')}
          >
            English
          </button>
        </div>

        <p>{t('app.tagline')}</p>

        <div className="preference-panel" role="group" aria-label={t('app.preferenceLabel')}>
          <span className="preference-title">
            <SlidersHorizontal size={15} aria-hidden="true" />
            {t('app.preferenceLabel')}
          </span>

          <label className={`preference-option preference-option--heat ${preference.hate_heat ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={preference.hate_heat}
              onChange={e => setPreference({ ...preference, hate_heat: e.target.checked })}
            />
            <Snowflake size={15} aria-hidden="true" />
            <span className="pref-label-full">{t('app.prefHeat')}</span>
            <span className="pref-label-short">{t('app.prefHeatShort')}</span>
          </label>

          <label className={`preference-option preference-option--cold ${preference.hate_cold ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={preference.hate_cold}
              onChange={e => setPreference({ ...preference, hate_cold: e.target.checked })}
            />
            <Flame size={15} aria-hidden="true" />
            <span className="pref-label-full">{t('app.prefCold')}</span>
            <span className="pref-label-short">{t('app.prefColdShort')}</span>
          </label>

          <label className={`preference-option preference-option--sensitive ${preference.sensitive ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={preference.sensitive}
              onChange={e => setPreference({ ...preference, sensitive: e.target.checked })}
            />
            <ShieldCheck size={15} aria-hidden="true" />
            <span className="pref-label-full">{t('app.prefSensitive')}</span>
            <span className="pref-label-short">{t('app.prefSensitiveShort')}</span>
          </label>
        </div>
      </header>

      <section className="search-section">
        <form onSubmit={handleSearch} className="search-bar">
          <div className="search-controls">
            <label className="search-input-shell">
              <MapPin size={18} strokeWidth={2} aria-hidden="true" />
              <input
                type="text"
                className="input-field"
                aria-label={t('app.cityInputLabel')}
                placeholder={t('app.cityPlaceholder')}
                value={city}
                autoComplete="off"
                onChange={(e) => { setCity(e.target.value); setCandidates([]); }}
              />
            </label>
            <button
              type="submit"
              className="btn search-submit"
              disabled={loading || !city.trim()}
              aria-label={loading ? t('app.analyzing') : t('app.start')}
              title={loading ? t('app.analyzing') : t('app.start')}
            >
              {loading
                ? <LoaderCircle className="spinner" size={18} strokeWidth={2.2} aria-hidden="true" />
                : <Play className="search-btn-icon" size={18} strokeWidth={2.2} aria-hidden="true" />}
              <span className="search-btn-label">{loading ? t('app.analyzing') : t('app.start')}</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary icon-button config-button"
              disabled={loading}
              onClick={() => setShowConfig(true)}
              aria-label={t('app.configTitle')}
              title={t('app.configTitle')}
            >
              <Settings size={18} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        </form>

        {recentCities.length > 0 && (
          <div className="recent-searches">
            <span className="recent-label">{t('app.recentSearches')}</span>
            {recentCities.map(recentCity => (
              <div key={recentCity} className="recent-chip">
                <button type="button" className="recent-city" onClick={() => executeSearch(recentCity)}>
                  {recentCity}
                </button>
                <button
                  type="button"
                  className="recent-remove"
                  onClick={() => removeRecentCity(recentCity)}
                  aria-label={`${t('app.remove')} ${recentCity}`}
                  title={t('app.remove')}
                >
                  <X size={13} strokeWidth={2.4} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {error && (
        <div className="status-message status-message--error" role="alert">
          <CircleAlert size={18} aria-hidden="true" />
          <span>{t(error)}</span>
          <button type="button" className="text-button" onClick={() => executeSearch(city)}>{t('predictor.retry')}</button>
        </div>
      )}

      {loading && (
        <div className="loader" role="status">
          <LoaderCircle className="spinner" size={20} aria-hidden="true" />
          <span>{t(loadingMsg)}</span>
          <button type="button" className="text-button" onClick={cancelSearch}>{t('common.cancel')}</button>
        </div>
      )}

      {notice && <p className="search-notice" role="status">{t(notice)}</p>}
      {candidates.length > 0 && (
        <section className="city-candidates card" aria-labelledby="candidate-title">
          <div className="candidate-heading"><h2 id="candidate-title">{t('app.chooseCity', { query: candidateQuery })}</h2><button type="button" className="text-button" onClick={cancelSearch}>{t('common.cancel')}</button></div>
          <p className="helper-copy">{t('app.chooseCityHelp')}</p>
          <div className="candidate-list">
            {candidates.map(candidate => <button type="button" className="candidate-button" key={candidate.id} onClick={() => loadCity(candidate, candidateQuery)}>
              <MapPin size={18} aria-hidden="true" /><span><strong>{candidate.name}</strong><small>{[candidate.admin2, candidate.admin1, candidate.country].filter(Boolean).join(' · ')}</small></span><small>{candidate.latitude.toFixed(2)}°, {candidate.longitude.toFixed(2)}°</small>
            </button>)}
          </div>
        </section>
      )}
      {!dataMap && !loading && !error && candidates.length === 0 && (
        <section className="welcome-state" aria-labelledby="welcome-title">
          <h2 id="welcome-title">{t('app.welcomeTitle')}</h2><p>{t('app.welcomeHelp')}</p>
          <div className="welcome-features"><span><CalendarDays size={17} aria-hidden="true" />{t('app.views.daily')}</span><span><GitCompareArrows size={17} aria-hidden="true" />{t('app.views.compare')}</span><span><PlaneTakeoff size={17} aria-hidden="true" />{t('app.views.predict')}</span></div>
          <small>{t('app.historyNote')}</small>
        </section>
      )}

      {dataMap && cityInfo && (
        <main className="dashboard">
          <div className="dashboard-header">
            <div className="city-title-row">
              <h2 className="city-title">
                <span className="city-name">{cityInfo.name}</span>
                <span className="city-country">{[cityInfo.admin1, cityInfo.country].filter(Boolean).join(' · ')}</span>
              </h2>
              <button type="button" className="compare-add-button" disabled={currentInCompare || compareCities.length >= 8} onClick={addCurrentCityToCompare}>
                {currentInCompare ? <Check size={15} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}
                {t(currentInCompare ? 'app.addedCompare' : compareCities.length >= 8 ? 'app.compareFull' : 'app.addCompare')}
              </button>
            </div>

            <div className="view-tabs" role="tablist" aria-label={t('app.viewSelector')}>
              {viewItems.map(({ key, Icon }) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={viewMode === key}
                  aria-controls="analysis-panel"
                  id={`view-${key}`}
                  tabIndex={viewMode === key ? 0 : -1}
                  onKeyDown={handleTabKey}
                  className={`view-tab ${viewMode === key ? 'active' : ''}`}
                  onClick={() => setViewMode(key)}
                >
                  <Icon size={16} strokeWidth={2} aria-hidden="true" />
                  <span>{t(`app.views.${key}`)}</span>
                </button>
              ))}
            </div>
          </div>

      {compareCities.length > 0 && (
        <aside className="compare-tray">
          <div className="compare-tray-header">
            <h3>
              <GitCompareArrows size={17} aria-hidden="true" />
              {t('app.compareTray')}
            </h3>
            <span>{compareCities.length}/8</span>
          </div>
          <div className="compare-tray-list">
            {compareCities.map(compareCity => (
              <div key={compareCity.id} className="compare-city-row">
                <span>{[compareCity.name, compareCity.location].filter(Boolean).join(' · ')}</span>
                <button
                  type="button"
                  onClick={() => removeCompareCity(compareCity.id)}
                  aria-label={`${t('app.remove')} ${compareCity.name}`}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
          {compareCities.length < 2 && <p className="helper-copy">{t('app.compareHelp')}</p>}
          <button
            type="button"
            className="btn compare-run-button"
            disabled={compareCities.length < 2}
            onClick={() => selectView('compare')}
          >
            <GitCompareArrows size={17} aria-hidden="true" />
            {t('app.startCompare')}
          </button>
        </aside>
      )}

          <section id="analysis-panel" role="tabpanel" aria-labelledby={`view-${viewMode}`} tabIndex={-1} className="analysis-panel">
          {viewMode === 'predict' && (
            <Predictor dataMap={dataMap} cityName={cityInfo.name} />
          )}

          {viewMode === 'daily' && (
            <>
              <section className="card year-card">
                <div className="year-header">
                  <div className="section-heading">
                    <CalendarDays size={18} strokeWidth={2} aria-hidden="true" />
                    <span>{t('app.yearDetails')}</span>
                  </div>
                  <div className="year-tabs" role="tablist" aria-label={t('app.yearDetails')}>
                    {Object.keys(dataMap).map(year => (
                      <button
                        type="button"
                        role="tab"
                        aria-selected={selectedYear === year}
                        tabIndex={selectedYear === year ? 0 : -1}
                        onKeyDown={handleTabKey}
                        className={`year-tab ${selectedYear === year ? 'active' : ''}`}
                        key={year}
                        onClick={() => setSelectedYear(year)}
                      >
                        {formatYearLabel(year, i18n.language)}
                      </button>
                    ))}
                  </div>
                </div>

                {activeData && <p className="coverage-note">{t('app.coverage', { year: formatYearLabel(selectedYear, i18n.language), count: activeData.length, start: activeData[0]?.date, end: activeData.at(-1)?.date })}{activeData.length < 365 && <strong>{t('app.partialYear')}</strong>}</p>}
                {activeData?.some(day => day.pm25Avg == null) && <p className="helper-copy air-data-note" role="status">{t('app.missingAir', { count: activeData.filter(day => day.pm25Avg == null).length })}</p>}
                <div className="stats-layout">
                  <section className="stat-group season-stat-group">
                    <h3 className="stat-heading">
                      <CalendarDays size={16} aria-hidden="true" />
                      <span>{t('app.seasonDuration')}</span>
                    </h3>
                    <div className="season-stat-grid">
                      {[
                        { season: '春季', count: seasonStats['春季'], tone: 'spring', sub: '' },
                        { season: '夏季', count: seasonStats['夏季'], tone: 'summer', sub: severeStats.summer > 0 ? t('app.seasonWarnHeat', { count: severeStats.summer }) : '' },
                        { season: '秋季', count: seasonStats['秋季'], tone: 'autumn', sub: '' },
                        { season: '冬季', count: seasonStats['冬季'], tone: 'winter', sub: severeStats.winter > 0 ? t('app.seasonWarnCold', { count: severeStats.winter }) : '' }
                      ].map(item => (
                        <div key={item.season} className={`stat-tile stat-tile--${item.tone}`}>
                          <div className="stat-tile-main">
                            <span className="stat-tile-label">{formatSeason(t, item.season)}</span>
                            <strong className="stat-tile-value">{item.count}<small>{t('common.dayUnit')}</small></strong>
                          </div>
                          {item.sub && <div className="stat-tile-note">{item.sub}</div>}
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="stat-group livability-stat-group">
                    <h3 className="stat-heading">
                      <House size={16} aria-hidden="true" />
                      <span>{t('app.livabilityTitle')}</span>
                    </h3>
                    <div className="livability-layout">
                      <div className="livability-column">
                        <div className="metric-tile metric-tile--good metric-tile--summary">
                          <span>{t(activeData && activeData.length < 365 ? 'app.observedLivablePeriod' : 'app.livablePeriod')}</span>
                          <strong>{livableStats.level1 + livableStats.level2}<small>{t('common.dayUnit')}</small></strong>
                        </div>
                        <div className="metric-pair">
                          <div className="metric-tile metric-tile--best">
                            <span>{formatLivability(t, 1)}</span>
                            <strong>{livableStats.level1}</strong>
                          </div>
                          <div className="metric-tile metric-tile--acceptable">
                            <span>{formatLivability(t, 2)}</span>
                            <strong>{livableStats.level2}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="livability-column">
                        <div className="metric-tile metric-tile--bad metric-tile--summary">
                          <span>{t(activeData && activeData.length < 365 ? 'app.observedUnlivablePeriod' : 'app.unlivablePeriod')}</span>
                          <strong>{livableStats.level3 + livableStats.level4}<small>{t('common.dayUnit')}</small></strong>
                        </div>
                        <div className="metric-pair">
                          <div className="metric-tile metric-tile--poor">
                            <span>{formatLivability(t, 3)}</span>
                            <strong>{livableStats.level3}</strong>
                          </div>
                          <div className="metric-tile metric-tile--severe">
                            <span>{formatLivability(t, 4)}</span>
                            <strong>{livableStats.level4}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </section>

              <section className="card chart-card">
                <div className="chart-scroll">
                  <div className="chart-container">
                    {activeData && <ClimateChart data={activeData} />}
                  </div>
                </div>
              </section>
            </>
          )}

          {viewMode === 'trend' && (
            <section className="card trend-card">
              <TrendChart dataMap={dataMap} />
            </section>
          )}

          {viewMode === 'compare' && (
            <CompareDashboard cities={adjustedCompareCities} />
          )}
          </section>
        </main>
      )}

      {showConfig && <SettingsDialog cachedCities={cachedCities} onClose={() => setShowConfig(false)} onClear={() => { setCachedCities([]); saveLocalValue('cached_cities', null); }} />}

    </div>
  );
}
