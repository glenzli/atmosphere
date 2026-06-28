import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchEnsoStatus } from '../api';
import { generatePrediction, type EnsoStatus } from '../utils/predictor';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';
import { Mandarin } from 'flatpickr/dist/l10n/zh.js';
import { ensoLabelKey } from '../i18n/format';

interface PredictorProps {
  dataMap: Record<string, any[]>;
  cityName: string;
}

export function Predictor({ dataMap, cityName }: PredictorProps) {
  const { t, i18n } = useTranslation();
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(() => localStorage.getItem('predict_startDate') || `${currentYear}-10-01`);
  const [endDate, setEndDate] = useState(() => localStorage.getItem('predict_endDate') || `${currentYear}-10-07`);
  const [ensoStatus, setEnsoStatus] = useState<EnsoStatus>('Neutral');

  useEffect(() => {
    localStorage.setItem('predict_startDate', startDate);
    localStorage.setItem('predict_endDate', endDate);
  }, [startDate, endDate]);
  const [loadingEnso, setLoadingEnso] = useState(true);
  const [realValue, setRealValue] = useState(0);
  const [fetchError, setFetchError] = useState(false);

  const loadEnso = () => {
    setLoadingEnso(true);
    setFetchError(false);
    fetchEnsoStatus().then(res => {
      const isError = res.error === true;
      setFetchError(isError);
      
      if (!isError && (res.status === 'El Niño' || res.status === 'La Niña' || res.status === 'Neutral')) {
        setEnsoStatus(res.status as EnsoStatus);
      }
      setRealValue(res.value);
      setLoadingEnso(false);
    });
  };

  useEffect(() => {
    loadEnso();
  }, []);

  const startMMDD = startDate.substring(5) || '10-01';
  const endMMDD = endDate.substring(5) || '10-07';
  const result = generatePrediction(dataMap, startMMDD, endMMDD, ensoStatus);

  const getFeelsLikeText = (res: NonNullable<typeof result>) => {
    let text = t('predictor.summaryPrefix');
    
    // 使用体感温度 AT 做定性描述（比干球温度更贴近人体感受）
    const atHigh = res.atRange[1];
    const atLow = res.atRange[0];
    const tdHigh = res.dewPointRange[1];
    
    if (atHigh >= 35) text += t('predictor.summary.heatExtreme');
    else if (atHigh >= 30 && tdHigh >= 20) text += t('predictor.summary.muggyHot');
    else if (atHigh >= 30 && tdHigh < 16) text += t('predictor.summary.dryHot');
    else if (atLow <= 0) text += t('predictor.summary.coldExtreme');
    else if (atHigh <= 10) text += t('predictor.summary.cool');
    else if (atHigh >= 15 && atHigh <= 26 && tdHigh >= 9 && tdHigh <= 16) text += t('predictor.summary.golden', { low: atLow, high: atHigh });
    else text += t('predictor.summary.mild');

    // 露点补充描述
    if (tdHigh >= 22) text += t('predictor.summary.dewVeryHumid', { value: tdHigh });
    else if (tdHigh >= 18 && atHigh >= 25) text += t('predictor.summary.dewHumid');

    const precipScaleLabel = t(`predictor.precipScale.${res.precipScale}`);
    if (res.rainProb > 50) text += t('predictor.summary.rainHigh', { scale: precipScaleLabel });
    else if (res.rainProb > 20) text += t('predictor.summary.rainSome');
    else text += t('predictor.summary.rainLow');

    if (res.typhoonProb > 15) text += t('predictor.summary.typhoon');
    if (res.severeRainProb > 20) text += t('predictor.summary.severeRain');
    if (res.severeSmogProb > 20) text += t('predictor.summary.severeSmog');
    else if (res.smogProb > 30) text += t('predictor.summary.smog');
    
    return text;
  };

  const getPackingAdvice = (res: NonNullable<typeof result>) => {
    const advice = [];
    const atHigh = res.atRange[1];
    const tdHigh = res.dewPointRange[1];
    const tdLow = res.dewPointRange[0];
    
    // Clothing - based on AT for better accuracy
    if (atHigh >= 30) {
      advice.push(t('predictor.packing.hot'));
    } else if (atHigh >= 20) {
      advice.push(t('predictor.packing.warm'));
    } else if (atHigh >= 10) {
      advice.push(t('predictor.packing.cool'));
    } else {
      advice.push(t('predictor.packing.cold'));
    }

    // Sun protection
    if (res.rainProb < 40 && res.tMaxRange[1] >= 20) {
      advice.push(t('predictor.packing.sun'));
    }

    // Umbrella
    if (res.rainProb >= 40) {
      advice.push(t('predictor.packing.umbrellaHigh'));
    } else if (res.rainProb >= 15) {
      advice.push(t('predictor.packing.umbrellaSome'));
    }

    // Air quality
    if (res.smogProb >= 20 || res.severeSmogProb > 5) {
      advice.push(t('predictor.packing.air'));
    }
    
    // Hydration - based on dew point (muggy)
    if (tdHigh >= 20) {
      advice.push(t('predictor.packing.hydration', { value: tdHigh }));
    }
    
    // Dry skin - based on dew point
    if (tdLow < 5) {
      advice.push(t('predictor.packing.drySkin', { value: tdLow }));
    }

    return advice;
  };

  return (
    <div className="card predictor-card" style={{ padding: '2rem' }}>
      <div className="predictor-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.4rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🔮</span> {t('predictor.title', { city: cityName })}
        </h2>
        
        <div className="predictor-controls" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="predictor-control" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '0.5rem', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.9rem', color: '#475569' }}>{t('predictor.dateLabel')}</span>
            <Flatpickr
              className="predictor-date-input"
              options={{
                mode: 'range',
                dateFormat: 'Y-m-d',
                locale: i18n.language.startsWith('zh') ? Mandarin : undefined,
                defaultDate: [startDate, endDate],
              }}
              onChange={(dates) => {
                if (dates.length === 2) {
                  const formatStr = (d: Date) => {
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    return `${y}-${m}-${day}`;
                  };
                  setStartDate(formatStr(dates[0]));
                  setEndDate(formatStr(dates[1]));
                }
              }}
              style={{
                padding: '0.3rem 0.5rem',
                textAlign: 'center',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                cursor: 'pointer',
                width: '180px',
                fontSize: '0.95rem',
                outline: 'none',
                color: '#334155'
              }}
              placeholder={t('predictor.datePlaceholder')}
            />
          </div>

          <div className="predictor-control" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '0.5rem', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.9rem', color: '#475569' }}>{t('predictor.climateLabel')}</span>
            {loadingEnso ? <span style={{ fontSize: '0.8rem' }}>{t('predictor.loadingEnso')}</span> : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <select 
                  value={ensoStatus} 
                  onChange={e => setEnsoStatus(e.target.value as EnsoStatus)}
                  style={{ 
                    appearance: 'none',
                    padding: '0.4rem 2rem 0.4rem 1rem',
                    background: '#ffffff url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23475569%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E") no-repeat right 0.7rem top 50%',
                    backgroundSize: '0.65rem auto',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                    color: '#334155',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    outline: 'none',
                    transition: 'all 0.2s',
                  }}
                  title={fetchError ? t('predictor.ensoFetchErrorTitle') : t('predictor.ensoTitle', { value: realValue.toFixed(2) })}
                >
                  <option value="Neutral">{t(`predictor.enso.${ensoLabelKey('Neutral')}`)}</option>
                  <option value="El Niño">{t(`predictor.enso.${ensoLabelKey('El Niño')}`)}</option>
                  <option value="La Niña">{t(`predictor.enso.${ensoLabelKey('La Niña')}`)}</option>
                </select>
                {fetchError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '6px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>{t('predictor.fetchError')}</span>
                    <button 
                      onClick={loadEnso}
                      style={{ 
                        background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', 
                        borderRadius: '4px', padding: '0.1rem 0.5rem', fontSize: '0.75rem', 
                        cursor: 'pointer', transition: 'all 0.2s'
                      }}
                      onMouseOver={e => e.currentTarget.style.background = '#fee2e2'}
                      onMouseOut={e => e.currentTarget.style.background = '#fef2f2'}
                    >
                      {t('predictor.retry')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {!result ? (
        <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>{t('predictor.invalidData')}</div>
      ) : (
        <div className="predictor-results" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="predictor-summary" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1.2rem', borderRadius: '12px', color: '#334155', lineHeight: '1.6' }}>
            <div style={{ fontSize: '1.05rem', marginBottom: '1rem' }}>
              {getFeelsLikeText(result)}
            </div>
            <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '1rem' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>{t('predictor.packingTitle')}</div>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.95rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {getPackingAdvice(result).map((adv, i) => (
                  <li key={i}>{adv}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="predictor-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          
          <div className="predictor-metric-card" style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '1.5rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ margin: 0, color: '#d97706', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {t('predictor.tempTitle')}
            </h3>
            <div>
              <div style={{ fontSize: '0.9rem', color: '#92400e', marginBottom: '0.2rem' }}>{t('predictor.daytimeHigh')}</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#b45309' }}>
                {result.tMaxRange[0]}<span style={{ fontSize: '1.2rem', color: '#d97706', margin: '0 4px' }}>~</span>{result.tMaxRange[1]}<span style={{ fontSize: '1.2rem' }}>℃</span>
              </div>
            </div>
            <div className="metric-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#92400e', marginBottom: '0.2rem' }}>{t('predictor.nighttimeLow')}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#b45309', opacity: 0.8 }}>
                  {result.tMinRange[0]} ~ {result.tMinRange[1]} ℃
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#92400e', marginBottom: '0.2rem' }}>{t('predictor.apparentTemp')}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#b45309', opacity: 0.8 }}>
                  {result.atRange[0]} ~ {result.atRange[1]} ℃
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#92400e', marginBottom: '0.2rem' }}>{t('predictor.dewPoint')}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: result.dewPointRange[1] >= 20 ? '#dc2626' : '#b45309', opacity: 0.8 }}>
                  {result.dewPointRange[0]} ~ {result.dewPointRange[1]} ℃
                </div>
              </div>
            </div>
          </div>

          <div className="predictor-metric-card" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '1.5rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ margin: 0, color: '#2563eb', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {t('predictor.rainTitle')}
            </h3>
            <div>
              <div style={{ fontSize: '0.9rem', color: '#1e40af', marginBottom: '0.2rem' }}>{t('predictor.rainProb')}</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1d4ed8' }}>
                {result.rainProb}%
              </div>
              <div style={{ fontSize: '0.85rem', color: '#3b82f6', marginTop: '0.5rem' }}>
                {t('predictor.precipEstimate', { scale: t(`predictor.precipScale.${result.precipScale}`), value: result.precipExpected })}
              </div>
            </div>
            <div style={{ marginTop: 'auto' }}>
              <div style={{ fontSize: '0.8rem', color: '#1e40af', marginBottom: '0.2rem' }}>{t('predictor.humidityRange')}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1d4ed8', opacity: 0.8 }}>
                {result.rhRange[0]}% ~ {result.rhRange[1]}%
              </div>
            </div>
          </div>

          <div className="predictor-metric-card" style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '1.5rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ margin: 0, color: '#dc2626', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {t('predictor.riskTitle')}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#991b1b', fontSize: '0.95rem' }}>{t('predictor.riskWind')}</span>
                <span style={{ fontWeight: 600, color: result.typhoonProb > 10 ? '#dc2626' : '#991b1b' }}>{result.typhoonProb}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#991b1b', fontSize: '0.95rem' }}>{t('predictor.riskRain')}</span>
                <span style={{ fontWeight: 600, color: result.severeRainProb > 10 ? '#dc2626' : '#991b1b' }}>{result.severeRainProb}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#991b1b', fontSize: '0.95rem' }}>{t('predictor.riskHeat')}</span>
                <span style={{ fontWeight: 600, color: result.heatProb > 10 ? '#dc2626' : '#991b1b' }}>{result.heatProb}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#991b1b', fontSize: '0.95rem' }}>{t('predictor.riskCold')}</span>
                <span style={{ fontWeight: 600, color: result.coldProb > 10 ? '#dc2626' : '#991b1b' }}>{result.coldProb}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#991b1b', fontSize: '0.95rem' }}>{t('predictor.heatStress')}</span>
                <span style={{ fontWeight: 600, color: result.heatStressProb > 20 ? '#dc2626' : '#991b1b' }}>{result.heatStressProb}%</span>
              </div>
            </div>
            {result.heatStressProb > 0 && (
              <div style={{ fontSize: '0.8rem', color: '#92400e', background: '#fef3c7', padding: '0.5rem', borderRadius: '4px' }}>
                <strong>{t('predictor.wetBulbRange', { low: result.twMaxRange[0], high: result.twMaxRange[1] })}</strong>
                {result.twMaxRange[1] >= 28 ? t('predictor.wetBulbExtreme') :
                 result.twMaxRange[1] >= 24 ? t('predictor.wetBulbLimited') :
                 t('predictor.wetBulbNormal')}
              </div>
            )}
            {(result.typhoonProb > 15 || result.severeRainProb > 15 || result.heatProb > 15 || result.coldProb > 15 || result.heatStressProb > 30) && (
              <div style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: 'auto', background: '#fee2e2', padding: '0.5rem', borderRadius: '4px' }}>
                {t('predictor.highRiskTip')}
              </div>
            )}
          </div>

          <div className="predictor-metric-card" style={{ background: '#fdf4ff', border: '1px solid #f5d0fe', padding: '1.5rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ margin: 0, color: '#a21caf', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {t('predictor.airTitle')}
            </h3>
            <div>
              <div style={{ fontSize: '0.9rem', color: '#701a75', marginBottom: '0.2rem' }}>{t('predictor.pm25Expected')}</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#86198f' }}>
                {result.pm25Expected} <span style={{ fontSize: '1rem', fontWeight: 'normal' }}>μg/m³</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#a21caf', marginTop: '0.5rem' }}>
                {t('predictor.airStandard')}
              </div>
            </div>
            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#701a75', marginBottom: '0.2rem' }}>{t('predictor.smogProb')}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: result.smogProb > 20 ? '#c026d3' : '#86198f' }}>
                  {result.smogProb}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#701a75', marginBottom: '0.2rem' }}>{t('predictor.severeSmogProb')}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: result.severeSmogProb > 10 ? '#c026d3' : '#86198f' }}>
                  {result.severeSmogProb}%
                </div>
              </div>
            </div>
          </div>

          </div>
        </div>
      )}
    </div>
  );
}
