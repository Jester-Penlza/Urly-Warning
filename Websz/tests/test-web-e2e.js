import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer';

const SITE_ORIGIN = 'http://127.0.0.1:4173';
const SITE_URL = `${SITE_ORIGIN}/Urly-Warning/#/home`;
const API_HEALTH_URL = 'http://127.0.0.1:5050/health';

const children = [];
let browser;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function startNode(args) {
  const child = spawn(process.execPath, args, {
    cwd: process.cwd(),
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.push(child);
  return child;
}

async function waitForUrl(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError?.message || 'not ready'}`);
}

async function clickButtonByText(page, selector, text) {
  const clicked = await page.$$eval(selector, (elements, expected) => {
    const target = elements.find((element) => element.textContent?.includes(expected));
    if (!target) return false;
    target.click();
    return true;
  }, text);
  assert(clicked, `Could not find ${selector} containing "${text}"`);
}

async function waitForHash(page, expectedHash) {
  await page.waitForFunction((hash) => window.location.hash === hash, {}, expectedHash);
  await page.waitForSelector('.main__title');
}

async function run() {
  console.log('Starting scanner API and production preview...');
  startNode(['scanner/scan-server.js']);
  startNode([
    'node_modules/vite/bin/vite.js',
    'preview',
    '--host', '127.0.0.1',
    '--port', '4173',
    '--base', '/Urly-Warning/',
  ]);
  await Promise.all([waitForUrl(API_HEALTH_URL), waitForUrl(`${SITE_ORIGIN}/Urly-Warning/`)]);

  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(message.text());
  });

  await page.goto(SITE_URL, { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'networkidle0' });
  try {
    await page.waitForSelector('#scannerInput');
  } catch (error) {
    const bodyText = await page.$eval('body', (element) => element.innerText.slice(0, 1_000)).catch(() => '');
    throw new Error(`${error.message}\nURL: ${page.url()}\nBody: ${bodyText}\nBrowser errors: ${pageErrors.join(' | ')}`);
  }

  const homeTitle = await page.$eval('.main__title', (element) => element.textContent.trim());
  assert(homeTitle === 'Link Safety Checker', `Unexpected home title: ${homeTitle}`);
  console.log('PASS home page and scanner controls load');

  for (const [route, title] of [['about', 'About'], ['services', 'Services'], ['contact', 'Contact']]) {
    await page.$eval(`a.menu__link[href="#/${route}"]`, (link) => link.click());
    await waitForHash(page, `#/${route}`);
    const routeTitle = await page.$eval('.main__title', (element) => element.textContent.trim());
    assert(routeTitle === title, `Expected ${title} page, received ${routeTitle}`);
  }
  await page.$eval('a.menu__link[href="#/"]', (link) => link.click());
  await waitForHash(page, '#/home');
  await page.waitForSelector('#scannerInput');
  console.log('PASS Home, About, Services, and Contact navigation');

  await page.goto(`${SITE_ORIGIN}/Urly-Warning/#/login`, { waitUntil: 'networkidle0' });
  await waitForHash(page, '#/home');
  await page.goto(`${SITE_ORIGIN}/Urly-Warning/#/does-not-exist`, { waitUntil: 'networkidle0' });
  await waitForHash(page, '#/home');
  console.log('PASS removed auth routes and unknown routes redirect to home');

  await page.click('#themeToggle');
  const themeBeforeSlider = await page.evaluate(() => ({
    isDark: document.body.classList.contains('theme-dark'),
    isLight: document.body.classList.contains('theme-light'),
    saved: localStorage.getItem('themePreference'),
  }));
  assert(themeBeforeSlider.saved === (themeBeforeSlider.isDark ? 'dark' : 'light'), 'Theme choice was not persisted');

  await page.click('[aria-label="Open Configuration Settings"]');
  await page.waitForSelector('.config-panel.open');
  await clickButtonByText(page, '.config-tabs button', 'Security');
  await page.waitForSelector('.sensitivity-slider');
  await page.$eval('.sensitivity-slider', (slider) => {
    const nativeValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    nativeValueSetter.call(slider, '175');
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    slider.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForFunction(() => document.querySelector('.slider-current')?.textContent?.includes('175%'));
  const afterSlider = await page.evaluate(() => {
    const config = JSON.parse(localStorage.getItem('urlScanner_config_v3'));
    return {
      isDark: document.body.classList.contains('theme-dark'),
      isLight: document.body.classList.contains('theme-light'),
      savedTheme: localStorage.getItem('themePreference'),
      httpWeight: config.heuristics.weights.httpNotEncrypted,
    };
  });
  assert(afterSlider.isDark === themeBeforeSlider.isDark && afterSlider.isLight === themeBeforeSlider.isLight,
    'Changing sensitivity changed the active light/dark theme');
  assert(afterSlider.savedTheme === themeBeforeSlider.saved, 'Changing sensitivity changed the saved theme');
  assert(afterSlider.httpWeight === 150, `Expected capped sensitivity weight 150, received ${afterSlider.httpWeight}`);

  await page.evaluate(() => {
    window.confirm = () => true;
    window.alert = () => {};
  });
  await clickButtonByText(page, '.config-footer button', 'Reset to Defaults');
  await page.waitForFunction(() => document.querySelector('.slider-current')?.textContent?.includes('100%'));
  const resetWeight = await page.evaluate(() => JSON.parse(localStorage.getItem('urlScanner_config_v3')).heuristics.weights.httpNotEncrypted);
  assert(resetWeight === 100, `Reset retained a mutated default weight: ${resetWeight}`);
  console.log('PASS theme toggle, sensitivity cap, theme isolation, and true default reset');

  await page.$eval('.config-header .close-button', (button) => button.click());
  await page.waitForFunction(() => !document.querySelector('.config-panel')?.classList.contains('open'));
  await page.type('#scannerInput', 'https://example.com');
  await page.click('#scanBtn');
  await page.waitForSelector('#results .scanner-result', { timeout: 45_000 });
  await page.waitForFunction(() => document.querySelector('#historyList')?.textContent?.includes('example.com'));
  const scanState = await page.evaluate(() => ({
    resultText: document.querySelector('#results')?.textContent || '',
    historyText: document.querySelector('#historyList')?.textContent || '',
    detailRows: document.querySelectorAll('.scanner-result__row').length,
    hasBreakdown: Boolean(document.querySelector('.scanner-result__score-breakdown')),
    hasRecommendations: Boolean(document.querySelector('.scanner-result__recommendations')),
  }));
  assert(scanState.resultText.includes('example.com'), 'Scan result does not identify the scanned URL');
  assert(scanState.historyText.includes('example.com'), 'Completed scan was not added to local history');
  assert(scanState.detailRows >= 5, `Detailed scan output is incomplete (${scanState.detailRows} rows)`);
  assert(scanState.hasBreakdown, 'Safety score breakdown is missing');
  assert(scanState.hasRecommendations, 'Safety recommendations are missing');

  await page.click('[aria-label="Open Configuration Settings"]');
  await clickButtonByText(page, '.config-tabs button', 'Display');
  const toggledOff = await page.$$eval('.config-item label', (labels) => {
    const label = labels.find((item) => item.textContent?.includes('Show Score Breakdown'));
    const checkbox = label?.querySelector('input[type="checkbox"]');
    if (!checkbox) return false;
    checkbox.click();
    return true;
  });
  assert(toggledOff, 'Show Score Breakdown setting was not found');
  await page.waitForFunction(() => document.querySelector('.scanner-result__score-breakdown')?.style.display === 'none');
  await page.$$eval('.config-item label', (labels) => {
    const label = labels.find((item) => item.textContent?.includes('Show Score Breakdown'));
    label?.querySelector('input[type="checkbox"]')?.click();
  });
  await page.waitForFunction(() => document.querySelector('.scanner-result__score-breakdown')?.style.display === 'block');
  await page.$eval('.config-header .close-button', (button) => button.click());
  console.log('PASS live scan, detailed breakdown, recommendations, history, and display controls');

  await page.click('#restartBtn');
  const restartState = await page.evaluate(() => ({
    input: document.querySelector('#scannerInput')?.value,
    results: document.querySelector('#results')?.children.length,
  }));
  assert(restartState.input === '' && restartState.results === 0, 'Restart did not clear the current scan');
  console.log('PASS scanner restart');

  assert(pageErrors.length === 0, `Browser page errors: ${pageErrors.join(' | ')}`);
  console.log('All web end-to-end checks passed.');
}

try {
  await run();
} finally {
  if (browser) await browser.close();
  for (const child of children) {
    if (!child.killed) child.kill();
  }
}
