import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClimateChart } from './components/ClimateChart';
import { TrendChart } from './components/TrendChart';
import { CompareDashboard, type CityCompareData } from './components/CompareDashboard';
import { geocodeCity, fetchHistoricalData, clearCache } from './api';
import { applyLivabilityPreference, type PreferenceConfig, defaultPreference } from './utils/analyzer';
import { Predictor } from './components/Predictor';
import { formatLivability, formatSeason, formatYearLabel } from './i18n/format';
import './index.css';

export default function App() {
  const { t, i18n } = useTranslation();
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(() => t('app.loadingDefault'));
  const [error, setError] = useState<string | null>(null);
  const [dataMap, setDataMap] = useState<Record<string, any[]> | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [viewMode, setViewMode] = useState<'daily' | 'trend' | 'compare' | 'predict'>('daily');
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

  // Whenever preference changes, re-apply it to dataMap and compareCities
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
      // Override the geocoded name with the user's original input so it doesn't flip to English
      geo.name = searchCity;
      setCityInfo(geo);
      setCity(searchCity);
      
      setRecentCities(prev => {
        const next = [searchCity, ...prev.filter(c => c !== searchCity)].slice(0, 8);
        localStorage.setItem('recent_cities', JSON.stringify(next));
        return next;
      });
      
      if (cachedCities.includes(searchCity)) {
        setLoadingMsg(t('app.loadingCached'));
      } else {
        setLoadingMsg(t('app.loadingRemote'));
      }

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

  let seasonStats = { '春季': 0, '夏季': 0, '秋季': 0, '冬季': 0 };
  let severeStats = { summer: 0, winter: 0 };
  let livableStats = { level1: 0, level2: 0, level3: 0, level4: 0, total: 0 };

  if (activeData) {
    activeData.forEach(d => {
      if (d.season in seasonStats) {
        seasonStats[d.season as keyof typeof seasonStats]++;
      }
      if (d.isSevereSummer) severeStats.summer++;
      if (d.isSevereWinter) severeStats.winter++;
      if (d.livability) {
        if (d.livability.level === 1) livableStats.level1++;
        if (d.livability.level === 2) livableStats.level2++;
        if (d.livability.level === 3) livableStats.level3++;
        if (d.livability.level === 4) livableStats.level4++;
      }
    });
    livableStats.total = activeData.length;
  }

  return (
    <div className="app-container">
      <header className="header">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
          <h1>Atmosphere</h1>
          <button
            type="button"
            onClick={() => i18n.changeLanguage(i18n.language.startsWith('zh') ? 'en-US' : 'zh-CN')}
            aria-label={t('language.aria')}
            title={t('language.aria')}
            style={{
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              padding: '0.35rem 0.65rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              lineHeight: 1,
            }}
          >
            {t('language.switchTo')}
          </button>
        </div>
        <p>{t('app.tagline')}</p>
        <div className="preference-panel" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', background: '#f8fafc', padding: '0.6rem 1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', width: 'fit-content', margin: '1rem auto 0' }}>
          <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 'bold' }}>{t('app.preferenceLabel')}</span>
          
          <label className="preference-option" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', fontSize: '0.9rem', color: '#0f172a' }}>
            <input 
              type="checkbox" 
              checked={preference.hate_heat}
              onChange={e => setPreference({ ...preference, hate_heat: e.target.checked })}
              style={{ cursor: 'pointer' }}
            />
            {t('app.prefHeat')}
          </label>
          
          <label className="preference-option" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', fontSize: '0.9rem', color: '#0f172a' }}>
            <input 
              type="checkbox" 
              checked={preference.hate_cold}
              onChange={e => setPreference({ ...preference, hate_cold: e.target.checked })}
              style={{ cursor: 'pointer' }}
            />
            {t('app.prefCold')}
          </label>
          
          <label className="preference-option" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', fontSize: '0.9rem', color: '#0f172a' }}>
            <input 
              type="checkbox" 
              checked={preference.sensitive}
              onChange={e => setPreference({ ...preference, sensitive: e.target.checked })}
              style={{ cursor: 'pointer' }}
            />
            {t('app.prefSensitive')}
          </label>
        </div>
      </header>

      <form onSubmit={handleSearch} className="search-bar">
        <input
          type="text"
          className="input-field"
          placeholder={t('app.cityPlaceholder')}
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <button type="submit" className="btn" disabled={loading}>
          {loading ? t('app.analyzing') : t('app.start')}
        </button>
        <button 
          type="button" 
          className="btn btn-secondary" 
          onClick={() => setShowConfig(true)}
          title={t('app.configTitle')}
        >
          ⚙️
        </button>
      </form>

      {recentCities.length > 0 && (
        <div className="recent-searches" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', marginTop: '-1rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{t('app.recentSearches')}</span>
          {recentCities.map(c => (
            <div key={c} className="recent-chip" style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem', 
              background: '#f1f5f9', padding: '0.2rem 0.6rem', 
              borderRadius: '999px', fontSize: '0.85rem', color: '#334155' 
            }}>
              <span style={{ cursor: 'pointer' }} onClick={() => executeSearch(c)}>{c}</span>
              <span 
                style={{ cursor: 'pointer', color: '#94a3b8', marginLeft: '2px', display: 'flex', alignItems: 'center', fontWeight: 'bold' }} 
                onClick={() => {
                  setRecentCities(prev => {
                    const next = prev.filter(rc => rc !== c);
                    localStorage.setItem('recent_cities', JSON.stringify(next));
                    return next;
                  });
                }}
                title={t('app.remove')}
              >
                ×
              </span>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div style={{ color: '#ef4444', textAlign: 'center', background: '#fef2f2', padding: '1rem', borderRadius: '8px' }}>
          {error}
        </div>
      )}

      {loading && (
        <div className="loader">
          {loadingMsg}
        </div>
      )}

      {dataMap && cityInfo && (
        <div className="dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <div className="city-title-row" style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
              <h2 className="city-title" style={{ fontSize: '1.5rem', fontWeight: 600, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span>{cityInfo.name} <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 'normal' }}>{cityInfo.country}</span></span>
                {compareCities.findIndex(c => c.name === cityInfo.name) === -1 && (
                  <button 
                    onClick={() => {
                      if (compareCities.length >= 8) {
                        alert(t('app.maxCompareAlert', { count: 8 }));
                        return;
                      }
                      setCompareCities([...compareCities, { name: cityInfo.name, dataMap: applyLivabilityPreference(dataMap, preference) }]);
                    }}
                    style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 'bold' }}
                  >{t('app.addCompare')}</button>
                )}
              </h2>
            </div>
            
            <div className="view-tabs" style={{ display: 'flex', gap: '0.2rem', background: '#e2e8f0', padding: '0.35rem', borderRadius: '10px' }}>
              <button
                className="view-tab"
                onClick={() => setViewMode('daily')}
                style={{
                  padding: '0.4rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.95rem',
                  background: viewMode === 'daily' ? '#ffffff' : 'transparent',
                  color: viewMode === 'daily' ? '#0f172a' : '#64748b',
                  fontWeight: viewMode === 'daily' ? 600 : 400,
                  boxShadow: viewMode === 'daily' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >{t('app.views.daily')}</button>
              <button
                className="view-tab"
                onClick={() => setViewMode('trend')}
                style={{
                  padding: '0.4rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.95rem',
                  background: viewMode === 'trend' ? '#ffffff' : 'transparent',
                  color: viewMode === 'trend' ? '#0f172a' : '#64748b',
                  fontWeight: viewMode === 'trend' ? 600 : 400,
                  boxShadow: viewMode === 'trend' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >{t('app.views.trend')}</button>
              <button
                  className="view-tab"
                  onClick={() => setViewMode('compare')}
                  style={{
                    padding: '0.4rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.95rem',
                    background: viewMode === 'compare' ? '#ffffff' : 'transparent',
                    color: viewMode === 'compare' ? '#0f172a' : '#64748b',
                    fontWeight: viewMode === 'compare' ? 600 : 400,
                    boxShadow: viewMode === 'compare' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >{t('app.views.compare')}</button>
              <button
                className="view-tab"
                onClick={() => setViewMode('predict')}
                style={{
                  padding: '0.4rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.95rem',
                  background: viewMode === 'predict' ? '#ffffff' : 'transparent',
                  color: viewMode === 'predict' ? '#0f172a' : '#64748b',
                  fontWeight: viewMode === 'predict' ? 600 : 400,
                  boxShadow: viewMode === 'predict' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >{t('app.views.predict')}</button>
            </div>
          </div>

          {viewMode === 'predict' && (
            <Predictor dataMap={dataMap} cityName={cityInfo.name} />
          )}

          {viewMode === 'daily' && (
            <>
              <div className="card year-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="year-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155' }}>{t('app.yearDetails')}</div>
                  <div className="year-tabs" style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '0.25rem', borderRadius: '8px' }}>
                    {Object.keys(dataMap).map(year => (
                      <button
                        className="year-tab"
                        key={year}
                        onClick={() => setSelectedYear(year)}
                        style={{
                          padding: '0.25rem 0.75rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.9rem',
                          background: selectedYear === year ? '#ffffff' : 'transparent',
                          color: selectedYear === year ? '#0f172a' : '#64748b',
                          fontWeight: selectedYear === year ? 600 : 400,
                          boxShadow: selectedYear === year ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                          transition: 'all 0.2s'
                        }}
                      >{formatYearLabel(year, i18n.language)}</button>
                    ))}
                  </div>
                </div>

                <div className="stats-layout" style={{ display: 'flex', gap: '1.5rem', alignItems: 'stretch' }}>
                  <div className="stat-group season-stat-group" style={{ flex: '0 0 auto', width: '380px', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>{t('app.seasonDuration')}</span>
                    </h3>
                    <div className="season-stat-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', flex: 1 }}>
                      {[
                        { season: '春季', count: seasonStats['春季'], color: '#10b981', bg: '#ecfdf5', sub: '' },
                        { season: '夏季', count: seasonStats['夏季'], color: '#ef4444', bg: '#fef2f2', sub: severeStats.summer > 0 ? t('app.seasonWarnHeat', { count: severeStats.summer }) : '' },
                        { season: '秋季', count: seasonStats['秋季'], color: '#f59e0b', bg: '#fffbeb', sub: '' },
                        { season: '冬季', count: seasonStats['冬季'], color: '#3b82f6', bg: '#eff6ff', sub: severeStats.winter > 0 ? t('app.seasonWarnCold', { count: severeStats.winter }) : '' }
                      ].map(s => (
                        <div key={s.season} style={{ background: s.bg, padding: '0.4rem 0.75rem', borderRadius: '6px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <span style={{ color: s.color, fontWeight: 600, fontSize: '0.85rem' }}>{formatSeason(t, s.season)}</span>
                            <span style={{ fontWeight: 'bold', color: s.color, fontSize: '1rem' }}>{s.count}{t('common.dayUnit')}</span>
                          </div>
                          {s.sub && <div style={{ fontSize: '0.7rem', color: s.color, opacity: 0.8, marginTop: '2px' }}>{s.sub}</div>}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="stat-group livability-stat-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>{t('app.livabilityTitle')}</span>
                    </h3>
                    <div className="livability-layout" style={{ display: 'flex', gap: '1rem', flex: 1 }}>
                      <div className="livability-column" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ flex: 1, background: '#ecfdf5', padding: '0.4rem 0.75rem', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#059669', fontWeight: 'bold', fontSize: '0.85rem' }}>{t('app.livablePeriod')}</span>
                          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#047857' }}>{livableStats.level1 + livableStats.level2} <span style={{fontSize: '0.7rem', fontWeight: 'normal'}}>{t('common.dayUnit')}</span></span>
                        </div>
                        <div style={{ flex: 1, display: 'flex', gap: '0.5rem' }}>
                          <div style={{ flex: 1, background: '#d1fae5', padding: '0.3rem 0.5rem', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#059669', fontSize: '0.8rem' }}>{formatLivability(t, 1)}</span>
                            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#047857' }}>{livableStats.level1}</span>
                          </div>
                          <div style={{ flex: 1, background: '#dbeafe', padding: '0.3rem 0.5rem', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#2563eb', fontSize: '0.8rem' }}>{formatLivability(t, 2)}</span>
                            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#1d4ed8' }}>{livableStats.level2}</span>
                          </div>
                        </div>
                      </div>

                      <div className="livability-column" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ flex: 1, background: '#fef2f2', padding: '0.4rem 0.75rem', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#dc2626', fontWeight: 'bold', fontSize: '0.85rem' }}>{t('app.unlivablePeriod')}</span>
                          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#b91c1c' }}>{livableStats.level3 + livableStats.level4} <span style={{fontSize: '0.7rem', fontWeight: 'normal'}}>{t('common.dayUnit')}</span></span>
                        </div>
                        <div style={{ flex: 1, display: 'flex', gap: '0.5rem' }}>
                          <div style={{ flex: 1, background: '#fffbeb', padding: '0.3rem 0.5rem', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#d97706', fontSize: '0.8rem' }}>{formatLivability(t, 3)}</span>
                            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#b45309' }}>{livableStats.level3}</span>
                          </div>
                          <div style={{ flex: 1, background: '#fee2e2', padding: '0.3rem 0.5rem', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>{formatLivability(t, 4)}</span>
                            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#b91c1c' }}>{livableStats.level4}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card chart-card">
                <div className="chart-scroll">
                  <div className="chart-container">
                    {activeData && <ClimateChart data={activeData} />}
                  </div>
                </div>
              </div>
            </>
          )}

          {viewMode === 'trend' && (
            <div className="card trend-card">
              <TrendChart dataMap={dataMap} />
            </div>
          )}

          {viewMode === 'compare' && (
            <CompareDashboard cities={compareCities} />
          )}
        </div>
      )}

      {compareCities.length > 0 && (
        <div className="compare-tray" style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: 'white', padding: '1rem', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)', zIndex: 50, border: '1px solid #e2e8f0', minWidth: '250px' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>{t('app.compareTray')}</span>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{compareCities.length}/8</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            {compareCities.map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', background: '#f1f5f9', padding: '0.4rem 0.6rem', borderRadius: '6px', fontSize: '0.9rem' }}>
                <span>{c.name}</span>
                <button onClick={() => {
                  const updated = compareCities.filter(x => x.name !== c.name);
                  setCompareCities(updated);
                  if (updated.length === 0 && viewMode === 'compare') {
                    setViewMode('daily');
                  }
                }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444' }}>×</button>
              </div>
            ))}
          </div>
          <button 
            onClick={() => {
              if (compareCities.length < 2) {
                alert(t('app.minCompareAlert', { count: 2 }));
                return;
              }
              setViewMode('compare');
            }}
            style={{ width: '100%', background: '#0f172a', color: 'white', border: 'none', padding: '0.6rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >{t('app.startCompare')}</button>
        </div>
      )}

      {showConfig && (
        <div className="modal-overlay" onClick={() => setShowConfig(false)}>
          <div className="modal card" onClick={e => e.stopPropagation()}>
            <h2>{t('app.settingsTitle')}</h2>
            
            <div className="form-group" style={{ paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{t('app.cachedCities', { count: cachedCities.length })}</span>
              </label>
              <div style={{ background: '#f8fafc', padding: '0.5rem', borderRadius: '8px', maxHeight: '150px', overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                {cachedCities.length === 0 ? (
                  <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{t('common.noData')}</span>
                ) : (
                  cachedCities.map(c => (
                    <span key={c} style={{ background: '#e2e8f0', color: '#334155', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>{c}</span>
                  ))
                )}
              </div>
              <button 
                type="button"
                className="btn btn-secondary" 
                style={{ width: '100%', marginTop: '1rem', borderColor: '#ef4444', color: '#ef4444', backgroundColor: '#fef2f2' }}
                onClick={async () => {
                  await clearCache();
                  setCachedCities([]);
                  localStorage.removeItem('cached_cities');
                  alert(t('app.clearCacheDone'));
                }}
              >
                {t('app.clearCache')}
              </button>
            </div>

            <div className="form-actions" style={{ marginTop: '1rem' }}>
              <button className="btn" onClick={() => setShowConfig(false)}>{t('common.close')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
