import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CalendarDays,
  CircleAlert,
  CloudSun,
  Database,
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
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';
import { ClimateChart } from './components/ClimateChart';
import { TrendChart } from './components/TrendChart';
import { CompareDashboard, type CityCompareData } from './components/CompareDashboard';
import { geocodeCity, fetchHistoricalData, clearCache } from './api';
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
  const [loadingMsg, setLoadingMsg] = useState(() => t('app.loadingDefault'));
  const [error, setError] = useState<string | null>(null);
  const [dataMap, setDataMap] = useState<Record<string, any[]> | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [showConfig, setShowConfig] = useState(false);
  const [cityInfo, setCityInfo] = useState<any>(null);
  const [compareCities, setCompareCities] = useState<CityCompareData[]>([]);
  const [preference, setPreference] = useState<PreferenceConfig>(defaultPreference);
  const [cachedCities, setCachedCities] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('cached_cities') || '[]'); } catch { return []; }
  });
  const [recentCities, setRecentCities] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('recent_cities');
      return saved ? JSON.parse(saved) : (i18n.language.startsWith('zh') ? ['深圳', '北京', '海口', '昆明'] : ['Shenzhen', 'Beijing', 'Haikou', 'Kunming']);
    } catch { return []; }
  });

  React.useEffect(() => {
    if (dataMap) {
      setDataMap(applyLivabilityPreference(dataMap, preference));
    }
    if (compareCities.length > 0) {
      setCompareCities(cities => cities.map(c => ({
        ...c,
        dataMap: applyLivabilityPreference(c.dataMap, preference)
      })));
    }
  }, [preference]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeSearch(city);
  };

  const executeSearch = async (searchCity: string) => {
    if (!searchCity.trim()) return;

    setLoading(true);
    setError(null);
    setDataMap(null);
    setCityInfo(null);
    setSelectedYear('');

    try {
      const geo = await geocodeCity(searchCity);
      geo.name = searchCity;
      setCityInfo(geo);
      setCity(searchCity);

      setRecentCities(prev => {
        const next = [searchCity, ...prev.filter(c => c !== searchCity)].slice(0, 8);
        localStorage.setItem('recent_cities', JSON.stringify(next));
        return next;
      });

      setLoadingMsg(cachedCities.includes(searchCity) ? t('app.loadingCached') : t('app.loadingRemote'));
      const { data } = await fetchHistoricalData(geo.latitude, geo.longitude, 10);

      if (!cachedCities.includes(searchCity)) {
        const newCache = [...cachedCities, searchCity];
        setCachedCities(newCache);
        localStorage.setItem('cached_cities', JSON.stringify(newCache));
      }

      setDataMap(data);
      const sortedYears = Object.keys(data).sort((a, b) => Number(b.replace('年', '')) - Number(a.replace('年', '')));
      if (sortedYears.length > 0) {
        setSelectedYear(sortedYears[0]);
      }
    } catch (err: any) {
      setError(err.message || t('app.fetchError'));
    } finally {
      setLoading(false);
    }
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
      localStorage.setItem('recent_cities', JSON.stringify(next));
      return next;
    });
  };

  const addCurrentCityToCompare = () => {
    if (!dataMap || !cityInfo) return;
    if (compareCities.length >= 8) {
      alert(t('app.maxCompareAlert', { count: 8 }));
      return;
    }
    setCompareCities([...compareCities, {
      name: cityInfo.name,
      dataMap: applyLivabilityPreference(dataMap, preference)
    }]);
  };

  const removeCompareCity = (cityName: string) => {
    const updated = compareCities.filter(item => item.name !== cityName);
    setCompareCities(updated);
    if (updated.length === 0 && viewMode === 'compare') {
      setViewMode('daily');
    }
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
                onChange={(e) => setCity(e.target.value)}
              />
            </label>
            <button
              type="submit"
              className="btn search-submit"
              disabled={loading}
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
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="loader" role="status">
          <LoaderCircle className="spinner" size={20} aria-hidden="true" />
          <span>{loadingMsg}</span>
        </div>
      )}

      {dataMap && cityInfo && (
        <main className="dashboard">
          <div className="dashboard-header">
            <div className="city-title-row">
              <h2 className="city-title">
                <span className="city-name">{cityInfo.name}</span>
                <span className="city-country">{cityInfo.country}</span>
              </h2>
              {compareCities.findIndex(item => item.name === cityInfo.name) === -1 && (
                <button type="button" className="compare-add-button" onClick={addCurrentCityToCompare}>
                  <Plus size={15} strokeWidth={2.4} aria-hidden="true" />
                  {t('app.addCompare')}
                </button>
              )}
            </div>

            <div className="view-tabs" role="tablist" aria-label={t('app.viewSelector')}>
              {viewItems.map(({ key, Icon }) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={viewMode === key}
                  className={`view-tab ${viewMode === key ? 'active' : ''}`}
                  onClick={() => setViewMode(key)}
                >
                  <Icon size={16} strokeWidth={2} aria-hidden="true" />
                  <span>{t(`app.views.${key}`)}</span>
                </button>
              ))}
            </div>
          </div>

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
                        className={`year-tab ${selectedYear === year ? 'active' : ''}`}
                        key={year}
                        onClick={() => setSelectedYear(year)}
                      >
                        {formatYearLabel(year, i18n.language)}
                      </button>
                    ))}
                  </div>
                </div>

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
                          <span>{t('app.livablePeriod')}</span>
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
                          <span>{t('app.unlivablePeriod')}</span>
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
            <CompareDashboard cities={compareCities} />
          )}
        </main>
      )}

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
              <div key={compareCity.name} className="compare-city-row">
                <span>{compareCity.name}</span>
                <button
                  type="button"
                  onClick={() => removeCompareCity(compareCity.name)}
                  aria-label={`${t('app.remove')} ${compareCity.name}`}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="btn compare-run-button"
            onClick={() => {
              if (compareCities.length < 2) {
                alert(t('app.minCompareAlert', { count: 2 }));
                return;
              }
              setViewMode('compare');
            }}
          >
            <GitCompareArrows size={17} aria-hidden="true" />
            {t('app.startCompare')}
          </button>
        </aside>
      )}

      {showConfig && (
        <div className="modal-overlay" onClick={() => setShowConfig(false)}>
          <section
            className="modal card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="settings-title">
                <Settings size={20} aria-hidden="true" />
                {t('app.settingsTitle')}
              </h2>
              <button
                type="button"
                className="icon-button modal-close"
                onClick={() => setShowConfig(false)}
                aria-label={t('common.close')}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="form-group cache-group">
              <div className="form-label">
                <Database size={16} aria-hidden="true" />
                <span>{t('app.cachedCities', { count: cachedCities.length })}</span>
              </div>
              <div className="cached-city-list">
                {cachedCities.length === 0 ? (
                  <span className="empty-state">{t('common.noData')}</span>
                ) : (
                  cachedCities.map(cachedCity => (
                    <span key={cachedCity} className="cached-city-chip">{cachedCity}</span>
                  ))
                )}
              </div>
              <button
                type="button"
                className="btn btn-danger"
                onClick={async () => {
                  await clearCache();
                  setCachedCities([]);
                  localStorage.removeItem('cached_cities');
                  alert(t('app.clearCacheDone'));
                }}
              >
                <Trash2 size={17} aria-hidden="true" />
                {t('app.clearCache')}
              </button>
            </div>

            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setShowConfig(false)}>{t('common.close')}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
