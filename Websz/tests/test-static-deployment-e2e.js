import puppeteer from 'puppeteer';

const deploymentUrl = process.env.URLY_DEPLOYMENT_URL
  || 'https://jester-penlza.github.io/Urly-Warning/?v=latest#/home';

let browser;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });

  await page.goto(deploymentUrl, { waitUntil: 'networkidle0', timeout: 60_000 });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('urlScanner_config_v2', JSON.stringify({
      scanning: { maxConcurrentRequests: 3 },
      display: {
        showDetailedAnalysis: false,
        showScoreBreakdown: false,
        showRecommendations: false,
      },
    }));
  });
  await page.reload({ waitUntil: 'networkidle0', timeout: 60_000 });
  await page.waitForSelector('#scannerInput', { timeout: 30_000 });

  await page.type('#scannerInput', 'https://example.com');
  await page.click('#scanBtn');
  await page.waitForSelector('#results .scanner-result', { timeout: 45_000 });
  await page.waitForFunction(() => document.querySelector('.breakdown-grid')?.children.length >= 1, {
    timeout: 30_000,
  });

  const result = await page.evaluate(() => {
    const config = JSON.parse(localStorage.getItem('urlScanner_config_v3') || '{}');
    const body = document.querySelector('.scanner-result__body');
    const breakdown = document.querySelector('.scanner-result__score-breakdown');
    const recommendations = document.querySelector('.scanner-result__recommendations');
    return {
      url: window.location.href,
      resultText: document.querySelector('#results')?.textContent || '',
      detailRows: document.querySelectorAll('.scanner-result__row').length,
      breakdownItems: document.querySelectorAll('.breakdown-item').length,
      recommendationItems: recommendations?.children.length || 0,
      bodyDisplay: body?.style.display || '',
      breakdownDisplay: breakdown?.style.display || '',
      recommendationsDisplay: recommendations?.style.display || '',
      displayConfig: config.display || null,
    };
  });

  assert(result.resultText.includes('example.com'), 'The static scan did not render its URL');
  assert(result.detailRows >= 5, `Expected detailed rows, received ${result.detailRows}`);
  assert(result.breakdownItems >= 4, `Expected fallback score breakdown, received ${result.breakdownItems} items`);
  assert(result.recommendationItems >= 2, 'Expected static-scan recommendations');
  assert(result.bodyDisplay !== 'none', 'Detailed analysis is hidden');
  assert(result.breakdownDisplay !== 'none', 'Score breakdown is hidden');
  assert(result.recommendationsDisplay !== 'none', 'Recommendations are hidden');
  assert(result.displayConfig?.showDetailedAnalysis === true, 'Legacy detailed-analysis setting was not migrated');
  assert(result.displayConfig?.showScoreBreakdown === true, 'Legacy score-breakdown setting was not migrated');
  assert(result.displayConfig?.showRecommendations === true, 'Legacy recommendations setting was not migrated');

  console.log(JSON.stringify(result, null, 2));
  console.log('Static GitHub Pages scan breakdown passed.');
} finally {
  if (browser) await browser.close();
}
