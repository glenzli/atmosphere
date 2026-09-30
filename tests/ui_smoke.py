"""Rendered regression checks with deterministic provider fixtures.
Run the app first, then: python3 tests/ui_smoke.py
Requires Python Playwright and Chromium; this is separate from live-data screenshots.
"""
import asyncio
import datetime as dt
import json
import os
from urllib.parse import parse_qs, urlparse
from playwright.async_api import async_playwright, expect

BASE = os.environ.get('ATMOSPHERE_URL', 'http://localhost:5173')
CHROMIUM = os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium')


def weather_fixture():
    dates = []
    day = dt.date(2025, 1, 1)
    while day <= dt.date.today():
        dates.append(day.isoformat())
        day += dt.timedelta(days=1)
    fill = lambda value, size=len(dates): [value] * size
    return {
        'daily': {'time': dates, 'temperature_2m_max': fill(36), 'temperature_2m_min': fill(21), 'temperature_2m_mean': fill(25), 'precipitation_sum': fill(0), 'wind_speed_10m_max': fill(10), 'wind_gusts_10m_max': fill(15)},
        'hourly': {'time': fill('time', len(dates) * 24), 'temperature_2m': fill(25, len(dates) * 24), 'relative_humidity_2m': fill(55, len(dates) * 24)},
    }


async def main():
    checks = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=CHROMIUM, args=['--no-sandbox'])
        context = await browser.new_context(viewport={'width': 1440, 'height': 1000})
        page = await context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        state = {'fail': False, 'slow': False, 'slow_weather': False, 'enso': 'error'}
        dialogs = []
        async def unexpected_dialog(dialog):
            dialogs.append(dialog.message)
            await dialog.dismiss()
        page.on('dialog', unexpected_dialog)
        weather = weather_fixture()

        async def provider(route):
            url = route.request.url
            if 'geocoding-api' in url:
                query = parse_qs(urlparse(url).query).get('name', [''])[0]
                if state['slow'] and query == 'Slow':
                    await asyncio.sleep(1)
                if state['fail']:
                    await route.fulfill(status=503, json={'error': True})
                    return
                if query == 'Unknown':
                    await route.fulfill(json={'results': []})
                    return
                number = int(query[4:]) if query.startswith('City') and query[4:].isdigit() else 2 if query in ['Beijing', 'Beta'] else 1
                city = {'id': number, 'name': query if query.startswith('City') else 'Beta' if number == 2 else 'Alpha', 'latitude': number + 10, 'longitude': 20, 'admin1': 'Region', 'country': 'Country'}
                await route.fulfill(json={'results': [city, {**city, 'id': number + 100, 'admin1': 'Other region', 'latitude': number + 30}]})
            elif 'archive-api' in url:
                if state['slow_weather']:
                    await asyncio.sleep(1)
                await route.fulfill(json=weather)
            elif 'air-quality-api' in url:
                await route.fulfill(status=503, json={'error': True})
            elif '/api/enso' in url:
                if state['enso'] == 'slow-success':
                    await asyncio.sleep(1)
                if state['enso'] in ['success', 'slow-success']:
                    await route.fulfill(json={'status': 'El Niño', 'value': 0.8})
                else:
                    await route.fulfill(status=503, json={'error': True})
            else:
                await route.continue_()

        await page.route('**/*', provider)
        await page.goto(BASE + '/?lang=en')
        await expect(page.locator('.welcome-state')).to_be_visible()
        await expect(page.locator('.search-submit')).to_be_disabled()
        checks.append('Empty state and blank-search guard')

        async def search(query):
            await page.get_by_role('textbox', name='City name', exact=True).fill(query)
            await page.locator('.search-submit').click()
            await expect(page.locator('.city-candidates')).to_be_visible()
            await page.locator('.candidate-button').first.click()
            await expect(page.locator('.city-name')).to_have_text(query if query.startswith('City') else 'Beta' if query in ['Beta', 'Beijing'] else 'Alpha')
            await expect(page.locator('.loader')).to_have_count(0)

        await search('Alpha')
        await expect(page.locator('.coverage-note')).to_contain_text('Partial-year data')
        await expect(page.locator('.metric-tile--good')).to_contain_text('Observed livable days')
        await expect(page.locator('.air-data-note')).to_contain_text('PM2.5 is missing')
        checks.append('Candidate identity, weather success with explicit missing air-quality state, partial-year labels')
        await page.locator('.preference-option--heat').click()
        await expect(page.locator('.metric-tile--good strong')).to_have_text('0 days')
        await page.locator('.compare-add-button').click()
        await expect(page.locator('.compare-add-button')).to_be_disabled()
        await expect(page.locator('.compare-run-button')).to_be_disabled()
        checks.append('Preference recalculation, duplicate prevention, one-city guidance')
        await search('Beta')
        await expect(page.locator('.metric-tile--good strong')).to_have_text('0 days')
        checks.append('Preferences also apply to newly loaded cities')
        await page.locator('.compare-add-button').click()
        await page.locator('.compare-run-button').click()
        await expect(page.locator('.compare-dashboard canvas')).to_be_visible()
        await page.locator('.compare-city-row button').first.click()
        await expect(page.locator('.compare-empty-state')).to_be_visible()
        await page.locator('.compare-city-row button').click()
        await expect(page.locator('.compare-empty-state')).to_be_visible()
        checks.append('Compare two cities, remove to one and zero without stranded navigation')
        await page.get_by_role('tab', name='Yearly', exact=True).click()

        await page.get_by_role('textbox', name='City name', exact=True).fill('Unknown')
        await page.locator('.search-submit').click()
        await expect(page.get_by_role('alert')).to_contain_text('No matching city')
        await expect(page.locator('.city-name')).to_have_text('Beta')
        checks.append('No match keeps the previous analysis')
        state['fail'] = True
        await page.get_by_role('button', name='Retry', exact=True).click()
        await expect(page.get_by_role('alert')).to_contain_text('Failed to fetch')
        await expect(page.locator('.city-name')).to_have_text('Beta')
        state['fail'] = False
        checks.append('Network error keeps the previous analysis and offers retry')

        state['slow'] = True
        await page.get_by_role('textbox', name='City name', exact=True).fill('Slow')
        await page.locator('.search-submit').click()
        await page.locator('.loader').get_by_role('button', name='Cancel').click()
        await expect(page.locator('.search-notice')).to_contain_text('cancelled')
        await page.wait_for_timeout(1100)
        await expect(page.locator('.city-name')).to_have_text('Beta')
        await expect(page.locator('.city-candidates')).to_have_count(0)
        checks.append('Cancellation ignores late results')

        await page.get_by_role('textbox', name='City name', exact=True).fill('Slow')
        await page.locator('.search-submit').click()
        await page.get_by_role('button', name='Shenzhen', exact=True).click()
        await expect(page.locator('.city-candidates')).to_be_visible()
        await page.wait_for_timeout(1100)
        await expect(page.locator('.candidate-heading')).to_contain_text('Shenzhen')
        await page.get_by_role('button', name='Cancel', exact=True).click()
        checks.append('Repeated/interrupted search preserves the latest query')

        await page.get_by_role('button', name='Settings', exact=True).click()
        await expect(page.get_by_role('dialog')).to_be_visible()
        for _ in range(8):
            await page.keyboard.press('Tab')
            assert await page.evaluate('document.querySelector("dialog").contains(document.activeElement)')
        await page.keyboard.press('Escape')
        await expect(page.get_by_role('dialog')).to_have_count(0)
        await expect(page.locator('.config-button')).to_be_focused()
        checks.append('Settings focus trap, Escape, and focus restoration')
        await page.get_by_role('button', name='Settings', exact=True).click()
        await page.get_by_role('button', name='Clear all local cache', exact=True).click()
        await expect(page.get_by_role('dialog').get_by_role('status')).to_contain_text('cleared')
        await expect(page.get_by_role('button', name='Clear all local cache', exact=True)).to_be_disabled()
        assert await page.evaluate('JSON.parse(localStorage.getItem("recent_cities")).length > 0')
        await page.mouse.click(5, 5)
        await expect(page.get_by_role('dialog')).to_have_count(0)
        checks.append('Cache clearing feedback, repeated clear guard, history retained, backdrop close')

        state['slow_weather'] = True
        await page.get_by_role('textbox', name='City name', exact=True).fill('Alpha')
        await page.locator('.search-submit').click()
        await page.locator('.candidate-button').first.click()
        await page.locator('.loader').get_by_role('button', name='Cancel').click()
        await page.wait_for_timeout(1100)
        await expect(page.locator('.city-name')).to_have_text('Beta')
        state['slow_weather'] = False
        checks.append('Weather-download cancellation keeps the old result and ignores late data')

        yearly = page.get_by_role('tab', name='Yearly', exact=True)
        await yearly.focus()
        await page.keyboard.press('ArrowRight')
        await expect(page.get_by_role('tab', name='Trends', exact=True)).to_have_attribute('aria-selected', 'true')
        await expect(page.locator('.trend-chart canvas')).to_be_visible()
        await page.keyboard.press('End')
        await expect(page.get_by_role('tab', name='Travel', exact=True)).to_have_attribute('aria-selected', 'true')
        checks.append('Keyboard tab navigation and rendered trend view')
        await expect(page.locator('.predictor-card')).to_contain_text('Auto fetch failed')
        select = page.get_by_role('combobox', name='Current ENSO state:')
        await select.select_option('La Niña')
        await expect(select).to_have_value('La Niña')
        state['enso'] = 'success'
        await page.locator('.predictor-card').get_by_role('button', name='Retry', exact=True).click()
        await expect(select).to_have_value('El Niño')
        checks.append('ENSO absence manual fallback, retry and automatic success')
        await expect(page.locator('.predictor-metric-card--air')).to_contain_text('No data available')
        await expect(page.locator('.predictor-metric-card--air')).to_contain_text('Available PM2.5 samples: 0')
        checks.append('Air-quality absence stays unknown in the rendered travel outlook')
        if os.environ.get('ATMOSPHERE_SCREENSHOT_DIR'):
            await page.screenshot(path=os.environ['ATMOSPHERE_SCREENSHOT_DIR'] + '/after-desktop-missing-air-fixture.png', full_page=True)

        date_input = page.get_by_role('textbox', name='Travel dates:')
        committed = await date_input.input_value()
        await date_input.click()
        await page.locator('.flatpickr-calendar.open .flatpickr-day:not(.flatpickr-disabled):not(.prevMonthDay):not(.nextMonthDay)').nth(2).click()
        await expect(page.locator('.predictor-card')).to_contain_text('Choose an end date')
        await expect(page.locator('.flatpickr-calendar.open')).to_be_visible()
        await page.keyboard.press('Escape')
        await expect(date_input).to_have_value(committed)
        await expect(page.locator('.predictor-results')).to_be_visible()
        checks.append('Interrupted date range restores the committed dates and results')

        await date_input.click()
        days = page.locator('.flatpickr-calendar.open .flatpickr-day:not(.flatpickr-disabled):not(.prevMonthDay):not(.nextMonthDay)')
        await days.nth(2).click()
        await days.nth(5).click()
        await expect(page.locator('.predictor-results')).to_be_visible()
        await expect(date_input).not_to_have_value(committed)
        checks.append('Completed date range updates the outlook')

        await page.get_by_role('button', name='中文', exact=True).click()
        assert await page.evaluate('document.documentElement.lang') == 'zh-CN'
        assert 'lang=zh' in page.url
        await expect(page.locator('.inference-note')).to_contain_text('历史统计')
        await page.get_by_role('button', name='English', exact=True).click()
        checks.append('Language switch updates URL, document language, and new copy')
        for width in [320, 390, 768, 1440]:
            await page.set_viewport_size({'width': width, 'height': 844})
            assert not await page.evaluate('document.documentElement.scrollWidth > innerWidth'), width
        checks.append('No page overflow at 320, 390, 768, and 1440 pixels')
        await page.get_by_role('tab', name='Yearly', exact=True).click()
        await page.set_viewport_size({'width': 390, 'height': 844})
        for mode in ['Overview', 'Feels', 'Moisture', 'Air', 'Risk']:
            await page.get_by_role('tab', name=mode, exact=True).click()
            await expect(page.locator('.climate-chart-canvas canvas')).to_be_visible()
        checks.append('All five mobile climate modes render')
        await page.get_by_role('tab', name='Yearly', exact=True).click()
        await page.locator('.compare-add-button').click()
        for number in range(3, 10):
            await search(f'City{number}')
            await page.locator('.compare-add-button').click()
        await expect(page.locator('.compare-city-row')).to_have_count(8)
        await search('City10')
        await expect(page.locator('.compare-add-button')).to_be_disabled()
        await expect(page.locator('.compare-add-button')).to_have_text('Comparison full (8)')
        checks.append('Eight-city limit and full-capacity feedback')
        await page.locator('.compare-run-button').click()
        await expect(page.locator('.compare-chart-section .air-data-note')).to_contain_text('pollution dimension is omitted')
        checks.append('Comparison omits a pollution dimension with no complete air-data years')
        if os.environ.get('ATMOSPHERE_SCREENSHOT_DIR'):
            await page.wait_for_timeout(1200)  # Capture completed chart animation, not its initial empty frame.
            await page.screenshot(path=os.environ['ATMOSPHERE_SCREENSHOT_DIR'] + '/after-mobile-eight-cities-fixture.png', full_page=True)
        state['enso'] = 'slow-success'
        await page.get_by_role('tab', name='Travel', exact=True).click()
        await page.get_by_role('combobox', name='Current ENSO state:').select_option('La Niña')
        await page.wait_for_timeout(1100)
        await expect(page.get_by_role('combobox', name='Current ENSO state:')).to_have_value('La Niña')
        checks.append('A manual ENSO choice survives a later automatic response')
        await page.get_by_role('tab', name='Yearly', exact=True).click()
        state['enso'] = 'error'
        await page.evaluate("localStorage.setItem('predict_startDate','2026-01-01');localStorage.setItem('predict_endDate','2026-01-07')")
        await page.get_by_role('tab', name='Travel', exact=True).click()
        await expect(page.locator('.predictor-card')).to_contain_text('Choose valid dates')
        await expect(page.locator('.predictor-results')).to_have_count(0)
        checks.append('Persisted past date range remains recoverable but cannot show a misleading outlook')

        # New browser contexts exercise persistence boundaries independently of happy-path cache state.
        blocked_context = await browser.new_context()
        blocked = await blocked_context.new_page()
        blocked.on('pageerror', lambda error: errors.append(str(error)))
        await blocked.add_init_script("""
          Storage.prototype.getItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
          Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
          indexedDB.open = () => { throw new DOMException('Blocked', 'SecurityError'); };
        """)
        await blocked.route('**/*', provider)
        await blocked.goto(BASE + '/?lang=en')
        await blocked.get_by_role('textbox', name='City name', exact=True).fill('Alpha')
        await blocked.locator('.search-submit').click()
        await blocked.locator('.candidate-button').first.click()
        await expect(blocked.locator('.city-name')).to_have_text('Alpha')
        await blocked.get_by_role('button', name='Settings', exact=True).click()
        await expect(blocked.get_by_role('button', name='Clear all local cache', exact=True)).to_be_disabled()
        await blocked.keyboard.press('Escape')
        await blocked.get_by_role('tab', name='Travel', exact=True).click()
        await expect(blocked.locator('.predictor-results')).to_be_visible()
        checks.append('Blocked localStorage and IndexedDB still allow search and travel without claiming cached data')
        await blocked_context.close()

        corrupt_context = await browser.new_context()
        corrupt = await corrupt_context.new_page()
        corrupt.on('pageerror', lambda error: errors.append(str(error)))
        await corrupt.add_init_script("localStorage.setItem('recent_cities', '{invalid'); localStorage.setItem('cached_cities', JSON.stringify({invalid: true}));")
        await corrupt.route('**/*', provider)
        await corrupt.goto(BASE + '/?lang=en')
        await expect(corrupt.locator('.welcome-state')).to_be_visible()
        await expect(corrupt.get_by_role('button', name='Shenzhen', exact=True)).to_be_visible()
        await corrupt.get_by_role('button', name='Settings', exact=True).click()
        await expect(corrupt.get_by_role('button', name='Clear all local cache', exact=True)).to_be_disabled()
        checks.append('Corrupt saved city lists recover to a usable empty state')
        await corrupt_context.close()

        legacy_context = await browser.new_context()
        legacy = await legacy_context.new_page()
        legacy.on('pageerror', lambda error: errors.append(str(error)))
        await legacy.route('**/*', provider)
        await legacy.goto(BASE + '/?lang=en')
        legacy_key = 'weather_v3_11.000_20.000_10_' + dt.date.today().isoformat()
        await legacy.evaluate("""async ({key, weather}) => {
          await new Promise((resolve, reject) => {
            const request = indexedDB.open('keyval-store');
            request.onupgradeneeded = () => request.result.createObjectStore('keyval');
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
              const db = request.result;
              const transaction = db.transaction('keyval', 'readwrite');
              transaction.objectStore('keyval').put({...weather, hourly: {...weather.hourly, pm2_5: Array(weather.hourly.time.length).fill(0)}}, key);
              transaction.oncomplete = () => { db.close(); resolve(); };
            };
          });
        }""", {'key': legacy_key, 'weather': weather})
        await legacy.get_by_role('textbox', name='City name', exact=True).fill('Alpha')
        await legacy.locator('.search-submit').click()
        await legacy.locator('.candidate-button').first.click()
        await expect(legacy.locator('.air-data-note')).to_contain_text('PM2.5 is missing')
        assert await legacy.evaluate("""async key => new Promise(resolve => {
          const request = indexedDB.open('keyval-store');
          request.onsuccess = () => {
            const db = request.result;
            const read = db.transaction('keyval').objectStore('keyval').get(key);
            read.onsuccess = () => { db.close(); resolve(Boolean(read.result)); };
          };
        })""", legacy_key)
        checks.append('Legacy fabricated-zero air cache is bypassed while the old data remains intact')
        await legacy_context.close()
        assert not errors, errors
        assert not dialogs, dialogs
        checks.append('No uncaught browser exceptions or native alert dialogs')
        print(json.dumps({'passed': len(checks), 'checks': checks, 'page_errors': errors}, ensure_ascii=False, indent=2))
        await browser.close()

asyncio.run(main())
