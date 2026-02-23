/**
 * Convert HTML to PDF using Puppeteer
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

async function convertWithPuppeteer() {
  const puppeteerScript = `
    const puppeteer = require('puppeteer');
    const path = require('path');
    const fs = require('fs');
    
    (async () => {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      
      const htmlPath = path.resolve('patent-package.html');
      const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
      
      await page.setContent(htmlContent, { 
        waitUntil: 'networkidle0',
        timeout: 60000 
      });
      
      await page.pdf({
        path: 'patent-package.pdf',
        format: 'A4',
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        },
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: '<div style="font-size:10px;text-align:center;width:100%;color:#666;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>'
      });
      
      await browser.close();
      console.log('PDF created: patent-package.pdf');
    })();
  `;
  
  fs.writeFileSync('_temp_pdf_gen.cjs', puppeteerScript);
  
  return new Promise<void>((resolve, reject) => {
    const proc = spawn('node', ['_temp_pdf_gen.cjs'], { stdio: 'inherit' });
    proc.on('close', (code) => {
      fs.unlinkSync('_temp_pdf_gen.cjs');
      if (code === 0) resolve();
      else reject(new Error(`Process exited with code ${code}`));
    });
    proc.on('error', reject);
  });
}

async function main() {
  console.log('Converting HTML to PDF...');
  
  if (!fs.existsSync('patent-package.html')) {
    console.log('HTML file not found. Run generate-patent-pdf.ts first.');
    process.exit(1);
  }
  
  try {
    await convertWithPuppeteer();
  } catch (error) {
    console.error('Puppeteer conversion failed:', error);
    console.log('\nFallback: Open patent-package.html in browser and print to PDF');
  }
}

main();
