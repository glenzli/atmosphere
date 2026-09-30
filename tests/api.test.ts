import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchHistoricalData, geocodeCities } from '../src/api.ts';

const city = { id: 1, name: 'Springfield', latitude: 39.8, longitude: -89.6, admin1: 'Illinois', country: 'United States' };

test('geocoding returns candidates with their authoritative place identity', async t => {
  t.mock.method(globalThis, 'fetch', async (input: string) => {
    const url = new URL(input);
    assert.equal(url.searchParams.get('count'), '5');
    assert.equal(url.searchParams.get('language'), 'en');
    return Response.json({ results: [city, { ...city, id: 2, admin1: 'Massachusetts' }] });
  });
  const cities = await geocodeCities('Springfield');
  assert.equal(cities.length, 2);
  assert.equal(cities[0].name, 'Springfield');
  assert.equal(cities[1].admin1, 'Massachusetts');
});

test('cancelled translation cannot continue to geocoding', async t => {
  const controller = new AbortController();
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    calls++;
    controller.abort();
    throw new DOMException('Aborted', 'AbortError');
  });
  await assert.rejects(geocodeCities('深圳', 'zh', controller.signal), { name: 'AbortError' });
  assert.equal(calls, 1);
});

test('empty geocoding results are an explicit failure', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ results: [] }));
  await assert.rejects(geocodeCities('NoSuchCity'), /City not found/);
});

test('weather remains usable when IndexedDB is unavailable and air quality fails', async t => {
  const fill = (value: number, count = 2) => Array(count).fill(value);
  const weather = {
    daily: { time: ['2025-10-01', '2025-10-02'], temperature_2m_max: fill(26), temperature_2m_min: fill(18), temperature_2m_mean: fill(22), precipitation_sum: fill(0), wind_speed_10m_max: fill(10), wind_gusts_10m_max: fill(15) },
    hourly: { time: fill(0, 48), temperature_2m: fill(22, 48), relative_humidity_2m: fill(60, 48) }
  };
  t.mock.method(globalThis, 'fetch', async (input: string) => {
    if (input.includes('air-quality-api')) throw new TypeError('Network failed');
    return Response.json(weather);
  });
  const result = await fetchHistoricalData(39.8, -89.6);
  assert.equal(result.data['2025年'].length, 2);
  assert.equal(result.data['2025年'][0].tAvg, 22);
  assert.equal(result.data['2025年'][0].pm25Avg, null);
  assert.equal(result.data['2025年'][0].pm25Max, null);
  assert.equal(result.cacheStored, false);
  assert.ok(Number.isFinite(result.data['2025年'][0].livability.level));
});

test('partial hourly air data preserves measured zero and excludes missing or invalid samples', async t => {
  const fill = (value: number, count = 2) => Array(count).fill(value);
  const weather = {
    daily: { time: ['2025-10-01', '2025-10-02'], temperature_2m_max: fill(26), temperature_2m_min: fill(18), temperature_2m_mean: fill(22), precipitation_sum: fill(0), wind_speed_10m_max: fill(10), wind_gusts_10m_max: fill(15) },
    hourly: { time: fill(0, 48), temperature_2m: fill(22, 48), relative_humidity_2m: fill(60, 48) }
  };
  const samples = [0, 120, -1, '0', ...Array(20).fill(null), ...Array(24).fill(null)];
  t.mock.method(globalThis, 'fetch', async (input: string) => Response.json(input.includes('air-quality-api') ? { hourly: { pm2_5: samples } } : weather));
  const result = await fetchHistoricalData(39.8, -89.6);
  assert.equal(result.data['2025年'][0].pm25Avg, 60);
  assert.equal(result.data['2025年'][0].pm25Max, 120);
  assert.equal(result.data['2025年'][1].pm25Avg, null);
});

test('provider calendar dates do not shift in a browser west of UTC', async t => {
  const previousTimezone = process.env.TZ;
  process.env.TZ = 'America/Los_Angeles';
  const fill = (value: number, count = 1) => Array(count).fill(value);
  const weather = {
    daily: { time: ['2025-01-01'], temperature_2m_max: fill(26), temperature_2m_min: fill(18), temperature_2m_mean: fill(22), precipitation_sum: fill(0), wind_speed_10m_max: fill(10), wind_gusts_10m_max: fill(15) },
    hourly: { time: fill(0, 24), temperature_2m: fill(22, 24), relative_humidity_2m: fill(60, 24) }
  };
  t.mock.method(globalThis, 'fetch', async (input: string) => Response.json(input.includes('air-quality-api') ? { hourly: { pm2_5: fill(0, 24) } } : weather));
  try {
    const result = await fetchHistoricalData(39.8, -89.6);
    assert.equal(result.data['2025年'][0].date, '01-01');
    assert.equal(result.data['2025年'][0].pm25Avg, 0);
  } finally {
    if (previousTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimezone;
  }
});

test('an already aborted historical request cannot reach the network or replace a result', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; throw new Error('Unexpected fetch'); });
  await assert.rejects(fetchHistoricalData(39.8, -89.6, 10, AbortSignal.abort()), { name: 'AbortError' });
  assert.equal(calls, 0);
});
