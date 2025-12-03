import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

(async () => {
  const outDir = path.resolve(process.cwd(), 'tmp');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  const url = 'http://localhost:8081/?demo=true';
  console.log('Opening', url);
  await page.goto(url, { waitUntil: 'networkidle' });

  // Wait for editor to be available
  await page.waitForSelector('text=Exportar PDF', { timeout: 10000 });

  // Trigger PDF export and capture download
  console.log('Clicking Exportar PDF...');
  const [pdfDownload] = await Promise.all([
    page.waitForEvent('download', { timeout: 20000 }),
    page.click('text=Exportar PDF')
  ]);
  const pdfPath = path.join(outDir, 'demo-export.pdf');
  await pdfDownload.saveAs(pdfPath);
  console.log('Saved PDF to', pdfPath);

  // Trigger DOCX export and capture download
  console.log('Clicking Exportar DOCX...');
  const [docxDownload] = await Promise.all([
    page.waitForEvent('download', { timeout: 20000 }),
    page.click('text=Exportar DOCX')
  ]);
  const docxPath = path.join(outDir, 'demo-export.docx');
  await docxDownload.saveAs(docxPath);
  console.log('Saved DOCX to', docxPath);

  await browser.close();
  console.log('Done.');
})();