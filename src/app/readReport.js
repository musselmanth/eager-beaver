// Reads an Albany County "Summary Results Report" PDF.
//
// The election-night (unofficial) report is exported straight from the county's
// election software, so it has real text we can read exactly. The certified
// (official) report is a signed scan, so for those we fall back to OCR and can
// only find the "Ballots Cast - Total" line. pdf.js and tesseract.js are only
// loaded once a report is actually posted.

import { parseReport } from './parseReport';

let ocrWorker;

// "Ballots Cast - Total 8,215" from OCR text (it sometimes reads the dash as a period, or a 0 as an O).
export function parseBallotsCast(text) {
  const m = text.match(/Ballots\W*Cast\W{0,4}Total\W{0,6}([\dO][\d,.O]*)/i);
  return m ? Number(m[1].replace(/O/gi, '0').replace(/[,.]/g, '')) : null;
}

async function ocrBallotsCast(page, pdfjs) {
  // Render at roughly the 300 dpi the page was scanned at.
  const viewport = page.getViewport({ scale: 300 / 72 });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const canvasContext = canvas.getContext('2d');
  // The scan is black ink on a transparent page, which OCR would read as all black.
  canvasContext.fillStyle = '#fff';
  canvasContext.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, canvasContext, viewport }).promise;

  const tesseract = await import('tesseract.js');
  const createWorker = tesseract.createWorker ?? tesseract.default.createWorker;
  ocrWorker ??= createWorker('eng');
  // The ballots line is in the statistics block at the top of the page, so only OCR that.
  const top = document.createElement('canvas');
  top.width = canvas.width;
  top.height = Math.round(canvas.height * 0.35);
  top.getContext('2d').drawImage(canvas, 0, 0);
  const { data } = await (await ocrWorker).recognize(top);
  return parseBallotsCast(data.text);
}

// Returns { hasText: true, ...parseReport() } for a text PDF, or
// { hasText: false, ballotsCast } (from OCR of page 1) for a scan.
export async function readReport(pdfBytes) {
  const pdfjs = await import('pdfjs-dist');
  const cdn = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}`;
  pdfjs.GlobalWorkerOptions.workerSrc = `${cdn}/build/pdf.worker.min.mjs`;

  // wasmUrl is where pdf.js finds its decoder for scanned (JBIG2) images.
  const pdf = await pdfjs.getDocument({ data: pdfBytes, wasmUrl: `${cdn}/wasm/` }).promise;
  try {
    const pages = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const { items } = await (await pdf.getPage(n)).getTextContent();
      pages.push(items.map((i) => ({ str: i.str, x: i.transform[4], y: i.transform[5] })));
    }
    const report = parseReport(pages);
    if (report.ballotsCast !== null || report.races.length) return { hasText: true, ...report };
    return { hasText: false, ballotsCast: await ocrBallotsCast(await pdf.getPage(1), pdfjs) };
  } finally {
    pdf.destroy();
  }
}
