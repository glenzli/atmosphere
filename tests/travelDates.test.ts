import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultTravelDates, validTravelDates } from '../src/utils/travelDates.ts';

test('default travel dates advance across a year boundary using local calendar days', () => {
  assert.deepEqual(defaultTravelDates(new Date(2026, 11, 31, 23, 30)), ['2027-01-01', '2027-01-07']);
});

test('same-day and cross-year trips are valid', () => {
  assert.equal(validTravelDates('2026-09-30', '2026-09-30', '2026-09-30'), true);
  assert.equal(validTravelDates('2026-12-25', '2027-01-05', '2026-09-30'), true);
});

test('invalid, reversed, past, and multi-year ranges cannot produce a plausible outlook', () => {
  for (const [start, end] of [['2026-02-30', '2026-03-01'], ['oops', '2026-10-07'], ['2026-10-07', '2026-10-01'], ['2026-09-29', '2026-10-01'], ['2026-10-01', '2027-10-01']]) {
    assert.equal(validTravelDates(start, end, '2026-09-30'), false, `${start} to ${end}`);
  }
});

test('365 inclusive days are allowed and leap days are validated', () => {
  assert.equal(validTravelDates('2026-10-01', '2027-09-30', '2026-09-30'), true);
  assert.equal(validTravelDates('2028-02-29', '2028-03-01', '2028-02-01'), true);
  assert.equal(validTravelDates('2027-02-29', '2027-03-01', '2027-02-01'), false);
});
