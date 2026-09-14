import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import { resolveTargetOutputPath } from '../utils.js';

/**
 * Automatically locate Chrome or Edge executable on Windows, macOS, or Linux.
 */
export function findSystemBrowser() {
  const isWin = process.platform === 'win32';
  const isMac = process.platform === 'darwin';
  const isLinux = process.platform === 'linux';

  const candidates = [];

  if (isWin) {
    const progFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
    const progFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const localAppData = process.env['LOCALAPPDATA'] || '';

    candidates.push(
      path.join(progFiles, 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(progFilesX86, 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(progFilesX86, 'Microsoft\\Edge\\Application\\msedge.exe'),
      path.join(progFiles, 'Microsoft\\Edge\\Application\\msedge.exe'),
      path.join(localAppData, 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(localAppData, 'Microsoft\\Edge\\Application\\msedge.exe')
    );
  } else if (isMac) {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Chromium.app/Contents/MacOS/Chromium'
    );
  } else if (isLinux) {
    candidates.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/microsoft-edge'
    );
  }

  for (const p of candidates) {
    if (p && fs.existsSync(p)) {
      return p;
    }
  }

  return null;
}

/**
 * Render HTML file or HTML string to image (PNG / JPEG) using headless browser (puppeteer-core).
 */
export async function htmlToImage({
  htmlPath = null,
  htmlContent = null,
  outputPath = null,
  fullPage = true,
  width = 1280,
  height = 800,
  format = 'png',
  quality = 90,
  delayMs = 0,
  selector = null,
  deviceScaleFactor = 2,
  browserExecutablePath = null
} = {}) {
  if (!htmlPath && !htmlContent) {
    throw new Error('Either "htmlPath" or "htmlContent" must be provided.');
  }

  const browserPath = browserExecutablePath || findSystemBrowser();
  if (!browserPath) {
    throw new Error('No compatible browser (Google Chrome or Microsoft Edge) found on the system. Please install Chrome/Edge or specify "browserExecutablePath".');
  }

  const normFormat = (format && (format.toLowerCase() === 'jpg' || format.toLowerCase() === 'jpeg')) ? 'jpeg' : 'png';
  const outExt = normFormat === 'jpeg' ? 'jpg' : 'png';

  let defaultBaseName = 'render';
  if (htmlPath) {
    defaultBaseName = path.basename(htmlPath, path.extname(htmlPath));
  }
  const finalOut = resolveTargetOutputPath(defaultBaseName, outExt, outputPath, true);
  await fs.promises.mkdir(path.dirname(finalOut), { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: Number(width) || 1280,
      height: Number(height) || 800,
      deviceScaleFactor: Number(deviceScaleFactor) || 2
    });

    if (htmlPath) {
      const absPath = path.resolve(process.cwd(), htmlPath);
      if (!fs.existsSync(absPath)) {
        throw new Error(`HTML file not found: "${absPath}"`);
      }
      const fileUrl = pathToFileURL(absPath).href;
      await page.goto(fileUrl, { waitUntil: 'networkidle0' });
    } else {
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    }

    if (Number(delayMs) > 0) {
      await new Promise(resolve => setTimeout(resolve, Number(delayMs)));
    }

    let screenshotBuffer;
    if (selector) {
      const element = await page.$(selector);
      if (!element) {
        throw new Error(`Element with selector "${selector}" not found on the page.`);
      }
      screenshotBuffer = await element.screenshot({
        type: normFormat,
        ...(normFormat === 'jpeg' ? { quality: Math.min(100, Math.max(1, Number(quality) || 90)) } : {})
      });
    } else {
      screenshotBuffer = await page.screenshot({
        fullPage: Boolean(fullPage),
        type: normFormat,
        ...(normFormat === 'jpeg' ? { quality: Math.min(100, Math.max(1, Number(quality) || 90)) } : {})
      });
    }

    await fs.promises.writeFile(finalOut, screenshotBuffer);

    const stat = await fs.promises.stat(finalOut);
    return {
      success: true,
      outputPath: finalOut,
      source: htmlPath ? path.resolve(process.cwd(), htmlPath) : 'inline-html',
      format: normFormat,
      sizeBytes: stat.size,
      fullPage: Boolean(fullPage),
      width: Number(width) || 1280
    };
  } finally {
    await browser.close().catch(() => {});
  }
}
