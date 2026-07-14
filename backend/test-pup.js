const puppeteer = require('puppeteer');

async function test() {
  try {
    console.log('Launching puppeteer...');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('Puppeteer launched successfully.');
    await browser.close();
  } catch (err) {
    console.error('Puppeteer launch failed:', err.message);
  }
}

test();
