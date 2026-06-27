import { useState, useEffect } from 'react';
import { fetchEnsoStatus } from '../api';
import { generatePrediction, type EnsoStatus } from '../utils/predictor';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';
import { Mandarin } from 'flatpickr/dist/l10n/zh.js';

interface PredictorProps {
  dataMap: Record<string, any[]>;
  cityName: string;
}

export function Predictor({ dataMap, cityName }: PredictorProps) {
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
    let text = '💡 综合结论：';
    
    // 使用体感温度 AT 做定性描述（比干球温度更贴近人体感受）
    const atHigh = res.atRange[1];
    const atLow = res.atRange[0];
    const tdHigh = res.dewPointRange[1];
    
    if (atHigh >= 35) text += '体感温度极高，典型"桑拿天"，极易中暑，日间不宜长时间在户外。';
    else if (atHigh >= 30 && tdHigh >= 20) text += '体感闷热潮湿，户外活动易大量出汗，建议选择清晨或傍晚出行。';
    else if (atHigh >= 30 && tdHigh < 16) text += '日间高温但空气干爽，阴凉处体感尚可，注意防晒补水。';
    else if (atLow <= 0) text += '体感极其寒冷，可能遭遇刺骨寒风，务必准备重装御寒衣物。';
    else if (atHigh <= 10) text += '体感偏冷，需要添加保暖衣物。';
    else if (atHigh >= 15 && atHigh <= 26 && tdHigh >= 9 && tdHigh <= 16) text += '体感温度非常舒适（AT ' + atLow + '~' + atHigh + '°C），是黄金旅游窗口期！';
    else text += '气温总体适中，体感尚可。';

    // 露点补充描述
    if (tdHigh >= 22) text += ' 空气极其潮湿黏腻（露点高达' + tdHigh + '°C），汗液难以蒸发。';
    else if (tdHigh >= 18 && atHigh >= 25) text += ' 空气偏潮，体感略闷。';

    if (res.rainProb > 50) text += ` 降雨极其频繁（${res.precipScale}），出行需随时备好雨具。`;
    else if (res.rainProb > 20) text += ` 偶有阵雨，对行程影响不大。`;
    else text += ` 多数为晴好天气，非常适合出游。`;

    if (res.typhoonProb > 15) text += ` ⚠️ 该时期属于台风高发期，请密切关注航班和海岛游轮状态！`;
    if (res.severeRainProb > 20) text += ` ⚠️ 容易出现极端暴雨导致内涝。`;
    if (res.severeSmogProb > 20) text += ` ⚠️ 该时期极易遭遇重度雾霾天气。`;
    else if (res.smogProb > 30) text += ` 空气质量可能不佳，偶有轻至中度污染。`;
    
    return text;
  };

  const getPackingAdvice = (res: NonNullable<typeof result>) => {
    const advice = [];
    const atHigh = res.atRange[1];
    const tdHigh = res.dewPointRange[1];
    const tdLow = res.dewPointRange[0];
    
    // Clothing - based on AT for better accuracy
    if (atHigh >= 30) {
      advice.push('👕 穿衣：以透气排汗的短袖、短裤/裙为主。');
    } else if (atHigh >= 20) {
      advice.push('🧥 穿衣：早晚微凉，建议带一件薄外套或长袖衬衫。');
    } else if (atHigh >= 10) {
      advice.push('🧥 穿衣：气温较低，建议穿着毛衣加防风外套或轻薄羽绒服。');
    } else {
      advice.push('🧣 穿衣：严寒天气，需备加厚羽绒服、保暖内衣、手套及围巾。');
    }

    // Sun protection
    if (res.rainProb < 40 && res.tMaxRange[1] >= 20) {
      advice.push('🕶️ 防晒：紫外线可能较强，请备好高倍数防晒霜、墨镜和遮阳帽。');
    }

    // Umbrella
    if (res.rainProb >= 40) {
      advice.push('☂️ 雨具：降雨概率较高，务必随身携带雨伞或便携雨衣。');
    } else if (res.rainProb >= 15) {
      advice.push('🌂 雨具：有局部阵雨可能，建议带一把晴雨伞备用。');
    }

    // Air quality
    if (res.smogProb >= 20 || res.severeSmogProb > 5) {
      advice.push('😷 防护：空气质量可能较差，建议老人儿童及敏感人群备好 N95/KN95 口罩。');
    }
    
    // Hydration - based on dew point (muggy)
    if (tdHigh >= 20) {
      advice.push('💧 补水：露点高达' + tdHigh + '°C，体感极闷，需备好大容量水壶防中暑。');
    }
    
    // Dry skin - based on dew point
    if (tdLow < 5) {
      advice.push('🧴 保湿：露点极低（' + tdLow + '°C），空气干燥，建议携带润唇膏和保湿霜。');
    }

    return advice;
  };

  return (
    <div className="card" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.4rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🔮</span> {cityName} 旅行气候预测
        </h2>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '0.5rem', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.9rem', color: '#475569' }}>出行日期:</span>
            <Flatpickr
              options={{
                mode: 'range',
                dateFormat: 'Y-m-d',
                locale: Mandarin,
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
              placeholder="选择日期区间"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '0.5rem', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.9rem', color: '#475569' }}>今年宏观气候:</span>
            {loadingEnso ? <span style={{ fontSize: '0.8rem' }}>获取中...</span> : (
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
                  title={fetchError ? '自动获取失败，当前为手动选择模式' : `当前 NOAA Nino 3.4 异常值: ${realValue.toFixed(2)}`}
                >
                  <option value="Neutral">中性 (Neutral)</option>
                  <option value="El Niño">厄尔尼诺 (El Niño)</option>
                  <option value="La Niña">拉尼娜 (La Niña)</option>
                </select>
                {fetchError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '6px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>自动获取失败，请手动选择</span>
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
                      重试
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {!result ? (
        <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>日期格式有误或数据不足</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1.2rem', borderRadius: '12px', color: '#334155', lineHeight: '1.6' }}>
            <div style={{ fontSize: '1.05rem', marginBottom: '1rem' }}>
              {getFeelsLikeText(result)}
            </div>
            <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '1rem' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>🎒 行前备装建议：</div>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.95rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {getPackingAdvice(result).map((adv, i) => (
                  <li key={i}>{adv}</li>
                ))}
              </ul>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '1.5rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ margin: 0, color: '#d97706', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🌡️ 气温与体感展望
            </h3>
            <div>
              <div style={{ fontSize: '0.9rem', color: '#92400e', marginBottom: '0.2rem' }}>日间最高温区间</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#b45309' }}>
                {result.tMaxRange[0]}<span style={{ fontSize: '1.2rem', color: '#d97706', margin: '0 4px' }}>~</span>{result.tMaxRange[1]}<span style={{ fontSize: '1.2rem' }}>℃</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#92400e', marginBottom: '0.2rem' }}>夜间最低温</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#b45309', opacity: 0.8 }}>
                  {result.tMinRange[0]} ~ {result.tMinRange[1]} ℃
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#92400e', marginBottom: '0.2rem' }}>体感温度 (AT)</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#b45309', opacity: 0.8 }}>
                  {result.atRange[0]} ~ {result.atRange[1]} ℃
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#92400e', marginBottom: '0.2rem' }}>露点 (闷热指标)</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: result.dewPointRange[1] >= 20 ? '#dc2626' : '#b45309', opacity: 0.8 }}>
                  {result.dewPointRange[0]} ~ {result.dewPointRange[1]} ℃
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '1.5rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ margin: 0, color: '#2563eb', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🌧️ 降水概率推演
            </h3>
            <div>
              <div style={{ fontSize: '0.9rem', color: '#1e40af', marginBottom: '0.2rem' }}>综合降水概率</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1d4ed8' }}>
                {result.rainProb}%
              </div>
              <div style={{ fontSize: '0.85rem', color: '#3b82f6', marginTop: '0.5rem' }}>
                * 预估强度: <strong>{result.precipScale}</strong> (日均 {result.precipExpected}mm)
              </div>
            </div>
            <div style={{ marginTop: 'auto' }}>
              <div style={{ fontSize: '0.8rem', color: '#1e40af', marginBottom: '0.2rem' }}>预计相对湿度区间</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1d4ed8', opacity: 0.8 }}>
                {result.rhRange[0]}% ~ {result.rhRange[1]}%
              </div>
            </div>
          </div>

          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '1.5rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ margin: 0, color: '#dc2626', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ⚠️ 极端灾害排雷
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#991b1b', fontSize: '0.95rem' }}>🌪️ 遭遇大风预警</span>
                <span style={{ fontWeight: 600, color: result.typhoonProb > 10 ? '#dc2626' : '#991b1b' }}>{result.typhoonProb}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#991b1b', fontSize: '0.95rem' }}>🌧️ 遭遇暴雨预警</span>
                <span style={{ fontWeight: 600, color: result.severeRainProb > 10 ? '#dc2626' : '#991b1b' }}>{result.severeRainProb}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#991b1b', fontSize: '0.95rem' }}>🌡️ 遭遇高温预警</span>
                <span style={{ fontWeight: 600, color: result.heatProb > 10 ? '#dc2626' : '#991b1b' }}>{result.heatProb}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#991b1b', fontSize: '0.95rem' }}>❄️ 遭遇寒冷预警</span>
                <span style={{ fontWeight: 600, color: result.coldProb > 10 ? '#dc2626' : '#991b1b' }}>{result.coldProb}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#991b1b', fontSize: '0.95rem' }}>🥵 热应激风险 (Tw≥26°C)</span>
                <span style={{ fontWeight: 600, color: result.heatStressProb > 20 ? '#dc2626' : '#991b1b' }}>{result.heatStressProb}%</span>
              </div>
            </div>
            {result.heatStressProb > 0 && (
              <div style={{ fontSize: '0.8rem', color: '#92400e', background: '#fef3c7', padding: '0.5rem', borderRadius: '4px' }}>
                💡 湿球温度区间: <strong>{result.twMaxRange[0]}~{result.twMaxRange[1]}°C</strong>
                {result.twMaxRange[1] >= 28 ? ' — 汗液蒸发严重受阻，户外活动极其危险' :
                 result.twMaxRange[1] >= 24 ? ' — 蒸发散热受限，户外运动需控制强度' :
                 ' — 蒸发散热正常'}
              </div>
            )}
            {(result.typhoonProb > 15 || result.severeRainProb > 15 || result.heatProb > 15 || result.coldProb > 15 || result.heatStressProb > 30) && (
              <div style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: 'auto', background: '#fee2e2', padding: '0.5rem', borderRadius: '4px' }}>
                提示：当前时期极端气候风险较高，建议准备应急预案。
              </div>
            )}
          </div>

          <div style={{ background: '#fdf4ff', border: '1px solid #f5d0fe', padding: '1.5rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ margin: 0, color: '#a21caf', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              😷 空气质量研判
            </h3>
            <div>
              <div style={{ fontSize: '0.9rem', color: '#701a75', marginBottom: '0.2rem' }}>预期 PM2.5 均值</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#86198f' }}>
                {result.pm25Expected} <span style={{ fontSize: '1rem', fontWeight: 'normal' }}>μg/m³</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#a21caf', marginTop: '0.5rem' }}>
                * 国标日均: 优&lt;35, 良&lt;75, 污染&gt;75
              </div>
            </div>
            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#701a75', marginBottom: '0.2rem' }}>污染天概率 (AQI&gt;100)</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: result.smogProb > 20 ? '#c026d3' : '#86198f' }}>
                  {result.smogProb}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#701a75', marginBottom: '0.2rem' }}>重雾霾概率 (AQI&gt;200)</div>
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
