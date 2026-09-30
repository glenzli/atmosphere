import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchEnsoStatus } from '../api';
import { generatePrediction, type EnsoStatus } from '../utils/predictor';
import Flatpickr from 'react-flatpickr';
import type { Instance } from 'flatpickr/dist/types/instance';

import 'flatpickr/dist/themes/light.css';
import { Mandarin } from 'flatpickr/dist/l10n/zh.js';
import { ensoLabelKey } from '../i18n/format';
import { CloudRain, Lightbulb, Luggage, PlaneTakeoff, ShieldAlert, ThermometerSun, Wind } from 'lucide-react';
import { palette } from '../theme/palette';
import { defaultTravelDates, formatLocalDate, validTravelDates } from '../utils/travelDates';
import { readLocalValue, saveLocalValue } from '../utils/storage';

const StableFlatpickr = memo(Flatpickr);

interface PredictorProps {
  dataMap: Record<string, any[]>;
  cityName: string;
}

export function Predictor({ dataMap, cityName }: PredictorProps) {
  const { t, i18n } = useTranslation();
  const [startDate, setStartDate] = useState(() => readLocalValue('predict_startDate') || defaultTravelDates()[0]);
  const [endDate, setEndDate] = useState(() => readLocalValue('predict_endDate') || defaultTravelDates()[1]);
  const committedDates = useRef<[string, string]>([startDate, endDate]);
  const [choosingDates, setChoosingDates] = useState(false);
  const manualEnso = useRef(false);
  const [ensoStatus, setEnsoStatus] = useState<EnsoStatus>('Neutral');

  useEffect(() => {
    saveLocalValue('predict_startDate', startDate);
    saveLocalValue('predict_endDate', endDate);
  }, [startDate, endDate]);
  const [loadingEnso, setLoadingEnso] = useState(true);
  const [realValue, setRealValue] = useState(0);
  const [fetchError, setFetchError] = useState(false);

  const applyEnso = useCallback((res: Awaited<ReturnType<typeof fetchEnsoStatus>>) => {
    const isError = res.error === true;
    setFetchError(isError);
    if (!manualEnso.current && !isError && (res.status === 'El Niño' || res.status === 'La Niña' || res.status === 'Neutral')) setEnsoStatus(res.status);
    setRealValue(Number.isFinite(res.value) ? res.value : 0);
    setLoadingEnso(false);
  }, []);

  const loadEnso = () => {
    manualEnso.current = false;
    setLoadingEnso(true);
    setFetchError(false);
    void fetchEnsoStatus().then(applyEnso);
  };

  useEffect(() => {
    const controller = new AbortController();
    void fetchEnsoStatus(controller.signal).then(res => {
      if (!controller.signal.aborted) applyEnso(res);
    });
    return () => controller.abort();
  }, [applyEnso]);

  const dateOptions = useMemo(() => ({
    mode: 'range' as const,
    dateFormat: 'Y-m-d',
    minDate: formatLocalDate(new Date()),
    disableMobile: true,
    ...(i18n.language.startsWith('zh') ? { locale: Mandarin } : {}),
    defaultDate: [startDate, endDate],
  }), [i18n.language, startDate, endDate]);

  const handleDates = useCallback((dates: Date[]) => {
    setChoosingDates(dates.length === 1);
    if (dates.length === 2) {
      const nextStart = formatLocalDate(dates[0]);
      const nextEnd = formatLocalDate(dates[1]);
      committedDates.current = [nextStart, nextEnd];
      setStartDate(nextStart);
      setEndDate(nextEnd);
    }
  }, []);

  const closeDates = useCallback((dates: Date[], _value: string, instance: Instance) => {
    // Flatpickr closes a completed range before firing its final onChange.
    if (dates.length < 2) instance.setDate(committedDates.current, false);
    setChoosingDates(false);
  }, []);

  const validDates = validTravelDates(startDate, endDate);
  const result = validDates && !choosingDates ? generatePrediction(dataMap, startDate.substring(5), endDate.substring(5), ensoStatus) : null;

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
    if ((res.severeSmogProb ?? 0) > 20) text += t('predictor.summary.severeSmog');
    else if ((res.smogProb ?? 0) > 30) text += t('predictor.summary.smog');

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
    if ((res.smogProb ?? 0) >= 20 || (res.severeSmogProb ?? 0) > 5) {
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
          <PlaneTakeoff size={22} strokeWidth={2} aria-hidden="true" />
          {t('predictor.title', { city: cityName })}
        </h2>

        <div className="predictor-controls" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="predictor-control" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: palette.surfaceSubtle, padding: '0.5rem', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.9rem', color: palette.muted }}>{t('predictor.dateLabel')}</span>
            <StableFlatpickr
              className="predictor-date-input"
              aria-label={t('predictor.dateLabel')}
              aria-describedby="travel-date-help"
              options={dateOptions}
              onChange={handleDates}
              onClose={closeDates}
              placeholder={t('predictor.datePlaceholder')}
            />
          </div>

          <div className="predictor-control" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: palette.surfaceSubtle, padding: '0.5rem', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.9rem', color: palette.muted }}>{t('predictor.climateLabel')}</span>
            {loadingEnso && <span style={{ fontSize: '0.8rem' }} role="status">{t('predictor.loadingEnso')}</span>}
            {(
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <select
                  aria-label={t('predictor.climateLabel')}
                  value={ensoStatus}
                  onChange={e => { manualEnso.current = true; setEnsoStatus(e.target.value as EnsoStatus); }}
                  style={{
                    appearance: 'none',
                    padding: '0.4rem 2rem 0.4rem 1rem',
                    background: '#ffffff url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23475569%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E") no-repeat right 0.7rem top 50%',
                    backgroundSize: '0.65rem auto',
                    border: `1px solid ${palette.axis}`,
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                    color: palette.ink,
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    minHeight: 44,
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
                    <span style={{ fontSize: '0.75rem', color: palette.alertText }}>{t('predictor.fetchError')}</span>
                    <button
                      type="button"
                      disabled={loadingEnso}
                      onClick={loadEnso}
                      style={{
                        background: '#fef2f2', border: '1px solid #fecaca', color: palette.alertText,
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

      <p id="travel-date-help" className="helper-copy predictor-date-help">{t('predictor.dateHelp')}</p>
      <p className="inference-note">{t('predictor.inferenceNote')}</p>

      {!result ? (
        <div role="status" style={{ textAlign: 'center', color: palette.muted, padding: '2rem' }}>{t(choosingDates ? 'predictor.selectEnd' : !validDates ? 'predictor.dateInvalid' : 'predictor.invalidData')}</div>
      ) : (
        <div className="predictor-results" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          <div className="predictor-summary" style={{ background: palette.surfaceSubtle, border: `1px solid ${palette.border}`, padding: '1.2rem', borderRadius: '12px', color: palette.ink, lineHeight: '1.6' }}>
            <div className="predictor-summary-copy" style={{ fontSize: '1.05rem', marginBottom: '1rem' }}>
              <Lightbulb size={18} strokeWidth={2} aria-hidden="true" />
              <span>{getFeelsLikeText(result)}</span>
            </div>
            <div style={{ borderTop: `1px dashed ${palette.axis}`, paddingTop: '1rem' }}>
              <div className="predictor-packing-title" style={{ fontWeight: 600, marginBottom: '0.5rem', color: palette.muted }}>
                <Luggage size={17} strokeWidth={2} aria-hidden="true" />
                <span>{t('predictor.packingTitle')}</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.95rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {getPackingAdvice(result).map((adv, i) => (
                  <li key={i}>{adv}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="predictor-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

          <div className="predictor-metric-card predictor-metric-card--temperature" style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '1.5rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 className="predictor-metric-title" style={{ margin: 0, color: palette.warmText, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ThermometerSun size={18} strokeWidth={2} aria-hidden="true" />
              {t('predictor.tempTitle')}
            </h3>
            <div>
              <div style={{ fontSize: '0.9rem', color: palette.warmText, marginBottom: '0.2rem' }}>{t('predictor.daytimeHigh')}</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: palette.warmText }}>
                {result.tMaxRange[0]}<span style={{ fontSize: '1.2rem', color: palette.warmText, margin: '0 4px' }}>~</span>{result.tMaxRange[1]}<span style={{ fontSize: '1.2rem' }}>℃</span>
              </div>
            </div>
            <div className="metric-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: palette.warmText, marginBottom: '0.2rem' }}>{t('predictor.nighttimeLow')}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: palette.warmText }}>
                  {result.tMinRange[0]} ~ {result.tMinRange[1]} ℃
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: palette.warmText, marginBottom: '0.2rem' }}>{t('predictor.apparentTemp')}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: palette.warmText }}>
                  {result.atRange[0]} ~ {result.atRange[1]} ℃
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: palette.warmText, marginBottom: '0.2rem' }}>{t('predictor.dewPoint')}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: result.dewPointRange[1] >= 20 ? palette.heatWarning : palette.warmText }}>
                  {result.dewPointRange[0]} ~ {result.dewPointRange[1]} ℃
                </div>
              </div>
            </div>
          </div>

          <div className="predictor-metric-card predictor-metric-card--rain" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '1.5rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 className="predictor-metric-title" style={{ margin: 0, color: palette.rainText, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CloudRain size={18} strokeWidth={2} aria-hidden="true" />
              {t('predictor.rainTitle')}
            </h3>
            <div>
              <div style={{ fontSize: '0.9rem', color: palette.rainText, marginBottom: '0.2rem' }}>{t('predictor.rainProb')}</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: palette.rain }}>
                {result.rainProb}%
              </div>
              <div style={{ fontSize: '0.85rem', color: palette.rainText, marginTop: '0.5rem' }}>
                {t('predictor.precipEstimate', { scale: t(`predictor.precipScale.${result.precipScale}`), value: result.precipExpected })}
              </div>
            </div>
            <div style={{ marginTop: 'auto' }}>
              <div style={{ fontSize: '0.8rem', color: palette.rainText, marginBottom: '0.2rem' }}>{t('predictor.humidityRange')}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: palette.rainText }}>
                {result.rhRange[0]}% ~ {result.rhRange[1]}%
              </div>
            </div>
          </div>

          <div className="predictor-metric-card predictor-metric-card--risk" style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '1.5rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 className="predictor-metric-title" style={{ margin: 0, color: palette.heatWarning, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={18} strokeWidth={2} aria-hidden="true" />
              {t('predictor.riskTitle')}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: palette.heatWarning, fontSize: '0.95rem' }}>{t('predictor.riskWind')}</span>
                <span style={{ fontWeight: 600, color: result.typhoonProb > 10 ? palette.alertText : palette.heatWarning }}>{result.typhoonProb}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: palette.heatWarning, fontSize: '0.95rem' }}>{t('predictor.riskRain')}</span>
                <span style={{ fontWeight: 600, color: result.severeRainProb > 10 ? palette.alertText : palette.heatWarning }}>{result.severeRainProb}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: palette.heatWarning, fontSize: '0.95rem' }}>{t('predictor.riskHeat')}</span>
                <span style={{ fontWeight: 600, color: result.heatProb > 10 ? palette.alertText : palette.heatWarning }}>{result.heatProb}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: palette.heatWarning, fontSize: '0.95rem' }}>{t('predictor.riskCold')}</span>
                <span style={{ fontWeight: 600, color: result.coldProb > 10 ? palette.alertText : palette.heatWarning }}>{result.coldProb}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: palette.heatWarning, fontSize: '0.95rem' }}>{t('predictor.heatStress')}</span>
                <span style={{ fontWeight: 600, color: result.heatStressProb > 20 ? palette.alertText : palette.heatWarning }}>{result.heatStressProb}%</span>
              </div>
            </div>
            {result.heatStressProb > 0 && (
              <div style={{ fontSize: '0.8rem', color: palette.warmText, background: '#fef3c7', padding: '0.5rem', borderRadius: '4px' }}>
                <strong>{t('predictor.wetBulbRange', { low: result.twMaxRange[0], high: result.twMaxRange[1] })}</strong>
                {result.twMaxRange[1] >= 28 ? t('predictor.wetBulbExtreme') :
                 result.twMaxRange[1] >= 24 ? t('predictor.wetBulbLimited') :
                 t('predictor.wetBulbNormal')}
              </div>
            )}
            {(result.typhoonProb > 15 || result.severeRainProb > 15 || result.heatProb > 15 || result.coldProb > 15 || result.heatStressProb > 30) && (
              <div style={{ fontSize: '0.8rem', color: palette.heatWarning, marginTop: 'auto', background: '#fee2e2', padding: '0.5rem', borderRadius: '4px' }}>
                {t('predictor.highRiskTip')}
              </div>
            )}
          </div>

          <div className="predictor-metric-card predictor-metric-card--air" style={{ background: '#fdf4ff', border: '1px solid #f5d0fe', padding: '1.5rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 className="predictor-metric-title" style={{ margin: 0, color: palette.airText, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Wind size={18} strokeWidth={2} aria-hidden="true" />
              {t('predictor.airTitle')}
            </h3>
            <div>
              <div style={{ fontSize: '0.9rem', color: palette.airText, marginBottom: '0.2rem' }}>{t('predictor.pm25Expected')}</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: palette.airText }}>
                {result.pm25Expected ?? '—'} <span style={{ fontSize: '1rem', fontWeight: 'normal' }}>μg/m³</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: palette.airText, marginTop: '0.5rem' }}>
                {result.pm25Expected === null ? t('common.noData') : t('predictor.airStandard')}
              </div>
            </div>
            <p className="helper-copy">{t('predictor.airCoverage', { count: result.pm25SampleDays, total: result.sampleDays })}</p>
            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: palette.airText, marginBottom: '0.2rem' }}>{t('predictor.smogProb')}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: (result.smogProb ?? 0) > 20 ? palette.airText : palette.airText }}>
                  {result.smogProb === null ? '—' : `${result.smogProb}%`}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: palette.airText, marginBottom: '0.2rem' }}>{t('predictor.severeSmogProb')}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: (result.severeSmogProb ?? 0) > 10 ? palette.airText : palette.airText }}>
                  {result.severeSmogProb === null ? '—' : `${result.severeSmogProb}%`}
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
