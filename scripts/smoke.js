#!/usr/bin/env node
import { spawn } from 'child_process';
import puppeteer from 'puppeteer';
import http from 'http';

const PORT = process.env.PORT || 5000;
const URL = `http://localhost:${PORT}`;

// Helper to wait until server responds
function waitForServer(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function check() {
      http.get(url, () => resolve())
        .on('error', () => {
          if (Date.now() - start > timeout) return reject(new Error('Server did not start in time'));
          setTimeout(check, 250);
        });
    })();
  });
}

(async () => {
  console.log('📦 Starting static server...');
  const serveProc = spawn('npx', ['serve', '-s', 'dist', '-l', PORT], { stdio: 'ignore', shell: true });

  try {
    await waitForServer(URL);
    console.log('✅ Server ready at', URL);

    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    console.log('🔍 Opening app');
    await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });

    // Wait until a button containing the text "Connect" appears and click it
    await page.waitForFunction(() => {
      return [...document.querySelectorAll('button')].some(b => /connect/i.test(b.innerText));
    }, { timeout: 15000 });

    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find(b => /connect/i.test(b.innerText));
      btn?.click();
    });

    // pause 5 s to let UI settle
    await new Promise(r => setTimeout(r, 5000));

    // —————  Smoke test ends here —————
    console.log('🎉 Smoke test passed');
    await browser.close();
    serveProc.kill();
    process.exit(0);
  } catch (err) {
    console.error('🚨 Smoke test failed', err);
    serveProc.kill();
    process.exit(1);
  }
})(); 