const puppeteer = require('puppeteer');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));

  console.log('Navigating to http://localhost:5175...');
  await page.goto('http://localhost:5175');
  
  console.log('Waiting for 2 seconds...');
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('Pressing F2 to switch to Admin Dashboard...');
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2' }));
  });
  
  console.log('Waiting for 2 seconds...');
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('Done. Closing...');
  await browser.close();
})();
