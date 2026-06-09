import React, { useState } from 'react';
import { ClimateChart } from './components/ClimateChart';
import { TrendChart } from './components/TrendChart';
import { CompareDashboard, type CityCompareData } from './components/CompareDashboard';
import { geocodeCity, fetchHistoricalData, clearCache } from './api';
import './index.css';

export default function App() {
  const [city, setCity] = useState('');
  const [waqiToken, setWaqiToken] = useState(() => localStorage.getItem('waqi_token') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataMap, setDataMap] = useState<Record<string, any[]> | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [viewMode, setViewMode] = useState<'daily' | 'trend' | 'compare'>('daily');
  const [showConfig, setShowConfig] = useState(false);
  const [cityInfo, setCityInfo] = useState<any>(null);
  const [compareCities, setCompareCities] = useState<CityCompareData[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!city.trim()) return;

    setLoading(true);
    setError(null);
    setDataMap(null);
    setCityInfo(null);
    setSelectedYear('');

    try {
      const geo = await geocodeCity(city);
      setCityInfo(geo);
      const data = await fetchHistoricalData(geo.latitude, geo.longitude, 10, waqiToken || undefined);
      
      setDataMap(data);
      
      const sortedYears = Object.keys(data).sort((a, b) => Number(b.replace('年', '')) - Number(a.replace('年', '')));
      if (sortedYears.length > 0) {
        setSelectedYear(sortedYears[0]);
      }
    } catch (err: any) {
      setError(err.message || '获取数据失败，请检查网络或重试');
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
        <h1>Atmosphere 气象宜居分析仪</h1>
        <p>输入全球任意城市，基于过去10年气象数据推演真实体感宜居度</p>
      </header>

      <form onSubmit={handleSearch} className="search-bar">
        <input
          type="text"
          className="input-field"
          placeholder="例如：深圳、北京、Vancouver..."
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <button type="submit" className="btn" disabled={loading}>
          {loading ? '分析中...' : '开始推演'}
        </button>
        <button 
          type="button" 
          className="btn btn-secondary" 
          onClick={() => setShowConfig(true)}
          title="配置 WAQI Token"
        >
          ⚙️
        </button>
      </form>

      {error && (
        <div style={{ color: '#ef4444', textAlign: 'center', background: '#fef2f2', padding: '1rem', borderRadius: '8px' }}>
          {error}
        </div>
      )}

      {loading && (
        <div className="loader">
          正在从 Open-Meteo 抓取并计算过去10年的逐小时海量数据，请稍候...
        </div>
      )}

      {dataMap && cityInfo && (
        <div className="dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span>{cityInfo.name} <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 'normal' }}>{cityInfo.country}</span></span>
                {compareCities.findIndex(c => c.name === cityInfo.name) === -1 && (
                  <button 
                    onClick={() => {
                      if (compareCities.length >= 4) {
                        alert('最多支持对比 4 个城市');
                        return;
                      }
                      setCompareCities([...compareCities, { name: cityInfo.name, dataMap: dataMap }]);
                    }}
                    style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 'bold' }}
                  >+ 加入对比</button>
                )}
              </h2>
            </div>
            
            <div style={{ display: 'flex', gap: '0.2rem', background: '#e2e8f0', padding: '0.35rem', borderRadius: '10px' }}>
              <button
                onClick={() => setViewMode('daily')}
                style={{
                  padding: '0.4rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.95rem',
                  background: viewMode === 'daily' ? '#ffffff' : 'transparent',
                  color: viewMode === 'daily' ? '#0f172a' : '#64748b',
                  fontWeight: viewMode === 'daily' ? 600 : 400,
                  boxShadow: viewMode === 'daily' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >👁 逐年气象细察</button>
              <button
                onClick={() => setViewMode('trend')}
                style={{
                  padding: '0.4rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.95rem',
                  background: viewMode === 'trend' ? '#ffffff' : 'transparent',
                  color: viewMode === 'trend' ? '#0f172a' : '#64748b',
                  fontWeight: viewMode === 'trend' ? 600 : 400,
                  boxShadow: viewMode === 'trend' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >📈 宏观十年趋势</button>
              <button
                  onClick={() => setViewMode('compare')}
                  style={{
                    padding: '0.4rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.95rem',
                    background: viewMode === 'compare' ? '#ffffff' : 'transparent',
                    color: viewMode === 'compare' ? '#0f172a' : '#64748b',
                    fontWeight: viewMode === 'compare' ? 600 : 400,
                    boxShadow: viewMode === 'compare' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >⚔️ 跨城对比 PK</button>
            </div>
          </div>

          {viewMode === 'daily' && (
            <>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155' }}>年份详情</div>
                  <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '0.25rem', borderRadius: '8px' }}>
                    {Object.keys(dataMap).map(year => (
                      <button
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
                      >{year}</button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'stretch' }}>
                  <div className="stat-group" style={{ flex: '0 0 auto', width: '380px', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>📅 四季时长分布</span>
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', flex: 1 }}>
                      {[
                        { label: '春季', count: seasonStats['春季'], color: '#10b981', bg: '#ecfdf5', sub: '' },
                        { label: '夏季', count: seasonStats['夏季'], color: '#ef4444', bg: '#fef2f2', sub: severeStats.summer > 0 ? `含酷夏${severeStats.summer}天` : '' },
                        { label: '秋季', count: seasonStats['秋季'], color: '#f59e0b', bg: '#fffbeb', sub: '' },
                        { label: '冬季', count: seasonStats['冬季'], color: '#3b82f6', bg: '#eff6ff', sub: severeStats.winter > 0 ? `含寒冬${severeStats.winter}天` : '' }
                      ].map(s => (
                        <div key={s.label} style={{ background: s.bg, padding: '0.4rem 0.75rem', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                            <span style={{ color: s.color, fontWeight: 600, fontSize: '0.85rem' }}>{s.label}</span>
                            {s.sub && <span style={{ fontSize: '0.7rem', color: s.color, opacity: 0.8 }}>({s.sub})</span>}
                          </div>
                          <span style={{ fontWeight: 'bold', color: s.color, fontSize: '1rem' }}>{s.count}天</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="stat-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>🏡 极值宜居模型评估</span>
                    </h3>
                    <div style={{ display: 'flex', gap: '1rem', flex: 1 }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ flex: 1, background: '#ecfdf5', padding: '0.4rem 0.75rem', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#059669', fontWeight: 'bold', fontSize: '0.85rem' }}>全年宜居期</span>
                          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#047857' }}>{livableStats.level1 + livableStats.level2} <span style={{fontSize: '0.7rem', fontWeight: 'normal'}}>天</span></span>
                        </div>
                        <div style={{ flex: 1, display: 'flex', gap: '0.5rem' }}>
                          <div style={{ flex: 1, background: '#d1fae5', padding: '0.3rem 0.5rem', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#059669', fontSize: '0.8rem' }}>极度舒适</span>
                            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#047857' }}>{livableStats.level1}</span>
                          </div>
                          <div style={{ flex: 1, background: '#dbeafe', padding: '0.3rem 0.5rem', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#2563eb', fontSize: '0.8rem' }}>尚可接受</span>
                            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#1d4ed8' }}>{livableStats.level2}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ flex: 1, background: '#fef2f2', padding: '0.4rem 0.75rem', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#dc2626', fontWeight: 'bold', fontSize: '0.85rem' }}>气候恶劣期</span>
                          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#b91c1c' }}>{livableStats.level3 + livableStats.level4} <span style={{fontSize: '0.7rem', fontWeight: 'normal'}}>天</span></span>
                        </div>
                        <div style={{ flex: 1, display: 'flex', gap: '0.5rem' }}>
                          <div style={{ flex: 1, background: '#fffbeb', padding: '0.3rem 0.5rem', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#d97706', fontSize: '0.8rem' }}>较不宜居</span>
                            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#b45309' }}>{livableStats.level3}</span>
                          </div>
                          <div style={{ flex: 1, background: '#fee2e2', padding: '0.3rem 0.5rem', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>不宜居(极端)</span>
                            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#b91c1c' }}>{livableStats.level4}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="chart-container">
                  {activeData && <ClimateChart data={activeData} />}
                </div>
              </div>
            </>
          )}

          {viewMode === 'trend' && (
            <div className="card">
              <TrendChart dataMap={dataMap} />
            </div>
          )}

          {viewMode === 'compare' && (
            <CompareDashboard cities={compareCities} />
          )}
        </div>
      )}

      {compareCities.length > 0 && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: 'white', padding: '1rem', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)', zIndex: 50, border: '1px solid #e2e8f0', minWidth: '250px' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>⚔️ 跨城对比托盘</span>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{compareCities.length}/4</span>
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
                alert('至少需要 2 个城市进行对比');
                return;
              }
              setViewMode('compare');
            }}
            style={{ width: '100%', background: '#0f172a', color: 'white', border: 'none', padding: '0.6rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >开始全维度 PK</button>
        </div>
      )}

      {showConfig && (
        <div className="modal-overlay" onClick={() => setShowConfig(false)}>
          <div className="modal card" onClick={e => e.stopPropagation()}>
            <h2>⚙️ 系统配置</h2>
            <div className="form-group">
              <label>WAQI API Token (用于获取空气质量)</label>
              <input
                type="text"
                className="input-field"
                value={waqiToken}
                onChange={(e) => setWaqiToken(e.target.value)}
                placeholder="在此输入您的 token..."
              />
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>
                如果不填，宜居度模型将不会加入空气质量惩罚。
              </p>
            </div>
            
            <div className="form-group" style={{ marginTop: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
              <label>本地气象数据缓存</label>
              <button 
                type="button"
                className="btn btn-secondary" 
                style={{ width: '100%', marginTop: '0.5rem', borderColor: '#ef4444', color: '#ef4444', backgroundColor: '#fef2f2' }}
                onClick={async () => {
                  await clearCache();
                  alert('全部城市历史气象缓存已清理完毕！');
                }}
              >
                🗑️ 强制清空全部本地缓存
              </button>
            </div>

            <div className="form-actions" style={{ marginTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowConfig(false)}>取消</button>
              <button className="btn" onClick={() => {
                localStorage.setItem('waqi_token', waqiToken);
                setShowConfig(false);
              }}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
