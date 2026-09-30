import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generatePrediction } from '../src/utils/predictor.ts';

const day = { date: '10-01', tMax: 25, tMin: 18, tAvg: 22, twMax: 20, rhAvg: 60, at: 22, dewPoint: 14, windAvg: 80, precipAvg: 0, pm25Avg: 0 };

test('wind warnings use the daily maximum wind field produced by the API', () => {
  const result = generatePrediction({ '2025年': [day] }, '10-01', '10-01', 'Neutral')!;
  assert.equal(result.typhoonProb, 100);
  assert.equal(result.tMaxRange[0], 25);
  assert.equal(result.rainProb, 0);
});

test('missing air data cannot become zero pollution or a zero pollution probability', () => {
  for (const pm25Avg of [null, undefined, NaN]) {
    const result = generatePrediction({ '2025年': [{ ...day, pm25Avg }] }, '10-01', '10-01', 'Neutral')!;
    assert.equal(result.pm25Expected, null);
    assert.equal(result.smogProb, null);
    assert.equal(result.severeSmogProb, null);
    assert.equal(result.pm25SampleDays, 0);
    assert.equal(result.typhoonProb, 100);
  }
});

test('a measured zero remains valid and missing samples do not dilute pollution means', () => {
  const clean = generatePrediction({ '2025年': [day] }, '10-01', '10-01', 'Neutral')!;
  assert.equal(clean.pm25Expected, 0);
  assert.equal(clean.smogProb, 0);
  assert.equal(clean.pm25SampleDays, 1);
  const mixed = generatePrediction({ '2025年': [{ ...day, pm25Avg: null }, { ...day, date: '10-02', pm25Avg: 120 }] }, '10-01', '10-02', 'Neutral')!;
  assert.equal(mixed.pm25Expected, 120);
  assert.equal(mixed.smogProb, 100);
  assert.equal(mixed.pm25SampleDays, 1);
  assert.equal(mixed.sampleDays, 2);
});

test('cross-year travel uses December and January samples while empty ranges stay unavailable', () => {
  const data = { '2025年': [{ ...day, date: '12-31' }, { ...day, date: '01-01' }, { ...day, date: '07-01' }] };
  assert.equal(generatePrediction(data, '12-31', '01-01', 'Neutral')!.sampleDays, 2);
  assert.equal(generatePrediction(data, '02-01', '02-02', 'Neutral'), null);
});
