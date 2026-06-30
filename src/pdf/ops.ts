import { readFile, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { PDFDocument } from "pdf-lib";
import { outputDir } from "../util/paths";

// pdf-lib is pure JS (no native binary), so these stay zero-setup. Each op writes
// into Downloads/snaffle and resolves with the output path.

function stamp(): string {
  return new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
}

async function load(file: string): Promise<PDFDocument> {
  // ignoreEncryption lets us open the many PDFs that carry empty/owner-only
  // encryption; truly locked files still throw and surface as a task error.
  return PDFDocument.load(await readFile(file), { ignoreEncryption: true });
}

/** Combine JPEG/PNG images into one PDF, one image per page, in the given order. */
export async function imagesToPdf(files: string[]): Promise<string> {
  if (files.length === 0) throw new Error("Pick at least one image.");
  const doc = await PDFDocument.create();
  for (const f of files) {
    const bytes = await readFile(f);
    const img = extname(f).toLowerCase() === ".png" ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    const page = doc.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }
  const out = join(outputDir(), `images-${stamp()}.pdf`);
  await writeFile(out, await doc.save());
  return out;
}

/** Concatenate several PDFs into one, in the given order. */
export async function mergePdfs(files: string[]): Promise<string> {
  if (files.length < 2) throw new Error("Pick at least two PDFs to merge.");
  const doc = await PDFDocument.create();
  for (const f of files) {
    const src = await load(f);
    const pages = await doc.copyPages(src, src.getPageIndices());
    for (const p of pages) doc.addPage(p);
  }
  const out = join(outputDir(), `merged-${stamp()}.pdf`);
  await writeFile(out, await doc.save());
  return out;
}

/** Extract the given (0-based) page indices from a PDF into a new PDF. */
export async function splitPdf(file: string, indices: number[]): Promise<string> {
  if (indices.length === 0) throw new Error("No pages selected.");
  const src = await load(file);
  const doc = await PDFDocument.create();
  const pages = await doc.copyPages(src, indices);
  for (const p of pages) doc.addPage(p);
  const out = join(outputDir(), `${basename(file, extname(file))} (pages).pdf`);
  await writeFile(out, await doc.save());
  return out;
}

/** Page count, so the split screen can validate the range the user types. */
export async function pdfPageCount(file: string): Promise<number> {
  return (await load(file)).getPageCount();
}
