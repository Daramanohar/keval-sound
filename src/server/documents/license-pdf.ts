import "server-only";

import crypto from "node:crypto";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

const A4: [number, number] = [595.28, 841.89];
const COLORS = {
  ink: rgb(12 / 255, 13 / 255, 28 / 255),
  white: rgb(237 / 255, 237 / 255, 237 / 255),
  red: rgb(229 / 255, 66 / 255, 46 / 255),
  yellow: rgb(255 / 255, 235 / 255, 153 / 255),
  muted: rgb(102 / 255, 108 / 255, 125 / 255),
  line: rgb(218 / 255, 220 / 255, 227 / 255),
  pale: rgb(248 / 255, 248 / 255, 251 / 255),
};

export type LicenseCertificateData = {
  licenseNumber: string;
  orderNumber: string;
  termsVersion: string;
  issuedAt: Date;
  licenseeName: string;
  licenseeEmail: string | null;
  kevalUserId: string;
  trackTitle: string;
  packTitle: string;
  category: string;
  purchaseAmountPaise: number;
  currency: string;
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}

function formatMoney(amountPaise: number, currency: string) {
  return `${currency.toUpperCase()} ${(amountPaise / 100).toFixed(2)}`;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawWrappedText(input: {
  page: PDFPage;
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  font: PDFFont;
  size: number;
  color?: ReturnType<typeof rgb>;
  lineHeight?: number;
}) {
  const lineHeight = input.lineHeight ?? input.size * 1.45;
  const lines = wrapText(input.text, input.font, input.size, input.maxWidth);
  lines.forEach((line, index) => {
    input.page.drawText(line, {
      x: input.x,
      y: input.y - index * lineHeight,
      size: input.size,
      font: input.font,
      color: input.color ?? COLORS.ink,
    });
  });
  return input.y - lines.length * lineHeight;
}

function drawPageFrame(page: PDFPage, regular: PDFFont, bold: PDFFont, pageNumber: number) {
  const [width, height] = A4;
  page.drawRectangle({ x: 0, y: height - 94, width, height: 94, color: COLORS.ink });
  page.drawRectangle({ x: 0, y: height - 98, width, height: 4, color: COLORS.red });
  page.drawText("KEVAL", { x: 42, y: height - 50, size: 20, font: bold, color: COLORS.white });
  page.drawText("SOUND", { x: 105, y: height - 50, size: 20, font: bold, color: COLORS.red });
  page.drawText("EXCLUSIVE MUSIC LICENSING", {
    x: 42,
    y: height - 70,
    size: 7.5,
    font: regular,
    color: COLORS.yellow,
  });
  page.drawLine({ start: { x: 42, y: 38 }, end: { x: width - 42, y: 38 }, thickness: 0.7, color: COLORS.line });
  page.drawText("KEVAL SOUND | support@kevalsound.com | GSTIN 29ACWPZ8257G1ZD", {
    x: 42,
    y: 22,
    size: 7.5,
    font: regular,
    color: COLORS.muted,
  });
  page.drawText(`Page ${pageNumber} of 2`, {
    x: width - 88,
    y: 22,
    size: 7.5,
    font: regular,
    color: COLORS.muted,
  });
}

function drawField(
  page: PDFPage,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
  regular: PDFFont,
  bold: PDFFont
) {
  page.drawText(label.toUpperCase(), { x, y, size: 7, font: bold, color: COLORS.muted });
  const lines = wrapText(value || "Not provided", regular, 10, width);
  lines.slice(0, 2).forEach((line, index) => {
    page.drawText(line, { x, y: y - 17 - index * 13, size: 10, font: regular, color: COLORS.ink });
  });
}

function drawBulletList(
  page: PDFPage,
  items: string[],
  x: number,
  y: number,
  maxWidth: number,
  regular: PDFFont
) {
  let cursor = y;
  for (const item of items) {
    page.drawCircle({ x: x + 3, y: cursor + 3, size: 2, color: COLORS.red });
    cursor = drawWrappedText({
      page,
      text: item,
      x: x + 14,
      y: cursor,
      maxWidth: maxWidth - 14,
      font: regular,
      size: 9,
      color: COLORS.ink,
      lineHeight: 13,
    }) - 5;
  }
  return cursor;
}

export async function generateLicenseCertificate(data: LicenseCertificateData) {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  document.setTitle(`KEVAL SOUND License ${data.licenseNumber}`);
  document.setAuthor("KEVAL SOUND");
  document.setSubject(`Exclusive usage license for ${data.trackTitle}`);
  document.setKeywords(["KEVAL SOUND", "music license", data.licenseNumber, data.kevalUserId]);
  document.setCreationDate(data.issuedAt);
  document.setModificationDate(data.issuedAt);

  const first = document.addPage(A4);
  drawPageFrame(first, regular, bold, 1);
  first.drawText("EXCLUSIVE MUSIC LICENSE CERTIFICATE", {
    x: 42,
    y: 700,
    size: 18,
    font: bold,
    color: COLORS.ink,
  });
  first.drawText("VALID", { x: 492, y: 701, size: 10, font: bold, color: COLORS.red });
  first.drawRectangle({ x: 42, y: 658, width: 511, height: 1, color: COLORS.line });

  drawField(first, "License ID", data.licenseNumber, 42, 630, 230, regular, bold);
  drawField(first, "Order ID", data.orderNumber, 310, 630, 220, regular, bold);
  drawField(first, "Issued to", data.licenseeName, 42, 570, 230, regular, bold);
  drawField(first, "KEVAL User ID", data.kevalUserId, 310, 570, 220, regular, bold);
  drawField(first, "Email", data.licenseeEmail ?? "Not provided", 42, 510, 230, regular, bold);
  drawField(first, "Issue date", formatDate(data.issuedAt), 310, 510, 220, regular, bold);

  first.drawRectangle({ x: 42, y: 378, width: 511, height: 92, color: COLORS.pale, borderColor: COLORS.line, borderWidth: 1 });
  first.drawText("LICENSED TRACK", { x: 58, y: 448, size: 7, font: bold, color: COLORS.muted });
  first.drawText(data.trackTitle.slice(0, 76), { x: 58, y: 423, size: 16, font: bold, color: COLORS.ink });
  first.drawText(`${data.packTitle} | ${data.category}`, { x: 58, y: 401, size: 9, font: regular, color: COLORS.muted });
  first.drawText(formatMoney(data.purchaseAmountPaise, data.currency), {
    x: 458,
    y: 401,
    size: 9,
    font: bold,
    color: COLORS.red,
  });

  let cursor = drawWrappedText({
    page: first,
    text: `This certificate confirms that ${data.licenseeName} (${data.kevalUserId}) is the exclusive usage licensee of the track identified above, subject to KEVAL SOUND License Terms version ${data.termsVersion}. This is a license, not an automatic transfer of copyright ownership.`,
    x: 42,
    y: 346,
    maxWidth: 511,
    font: regular,
    size: 10,
    lineHeight: 15,
  });
  first.drawText("GRANTED RIGHTS", { x: 42, y: cursor - 12, size: 10, font: bold, color: COLORS.ink });
  cursor = drawBulletList(
    first,
    [
      "Worldwide, long-term use of the licensed track in permitted commercial and non-commercial creative projects.",
      "Synchronization with videos, films, advertisements, games, apps, podcasts, presentations, social content, and client work.",
      "Editing for timing and creative fit, including trimming, looping, fading, volume changes, and arrangement within a finished project.",
      "The track will not intentionally be sold as the same eligible exclusive license to another buyer after successful fulfillment.",
    ],
    42,
    cursor - 32,
    511,
    regular
  );
  first.drawText("Territory: Worldwide", { x: 42, y: cursor - 5, size: 8.5, font: bold, color: COLORS.muted });
  first.drawText("Duration: Long-term, subject to the license terms", { x: 310, y: cursor - 5, size: 8.5, font: bold, color: COLORS.muted });

  const second = document.addPage(A4);
  drawPageFrame(second, regular, bold, 2);
  second.drawText("TERMS SUMMARY AND VERIFICATION", { x: 42, y: 700, size: 18, font: bold, color: COLORS.ink });
  second.drawText("KEY RESTRICTIONS", { x: 42, y: 662, size: 10, font: bold, color: COLORS.ink });
  cursor = drawBulletList(
    second,
    [
      "Do not resell, redistribute, share, sublicense, or repackage the raw MP3, WAV, stems, or substantially unchanged audio as a standalone asset.",
      "Do not upload the raw track to stock music libraries, beat stores, sample libraries, file-sharing services, or competing music products.",
      "Do not claim authorship or full copyright ownership unless a separate signed copyright assignment expressly grants those rights.",
      "Do not register the raw track with Content ID or similar rights systems in a way that blocks KEVAL SOUND or other authorized platform uses.",
      "Do not use the asset for illegal, deceptive, infringing, harmful, or unauthorized AI-training purposes.",
    ],
    42,
    638,
    511,
    regular
  );

  second.drawText("RETAINED PLATFORM RIGHTS", { x: 42, y: cursor - 4, size: 10, font: bold, color: COLORS.ink });
  cursor = drawWrappedText({
    page: second,
    text: "KEVAL SOUND retains the rights needed to host, store, stream, preview, display, promote, protect, administer, and track this song through KEVAL SOUND, KEVAL Player, KEVAL RADIO, dashboards, and related services. The song may remain available for streaming after sale but is unavailable for another exclusive purchase.",
    x: 42,
    y: cursor - 28,
    maxWidth: 511,
    font: regular,
    size: 9,
    lineHeight: 14,
  });

  second.drawText("REVOCATION AND LIMITATIONS", { x: 42, y: cursor - 4, size: 10, font: bold, color: COLORS.ink });
  cursor = drawWrappedText({
    page: second,
    text: "The license may be suspended, limited, or revoked following a refund, payment reversal, successful chargeback, fraud, material breach, unauthorized redistribution, rights-clearance issue, court order, or other legal requirement. Public-performance, broadcaster, collection-society, cue-sheet, and local statutory obligations may require separate review.",
    x: 42,
    y: cursor - 28,
    maxWidth: 511,
    font: regular,
    size: 9,
    lineHeight: 14,
  });

  second.drawRectangle({ x: 42, y: 176, width: 511, height: 112, color: COLORS.ink });
  second.drawText("VERIFY THIS LICENSE", { x: 58, y: 258, size: 10, font: bold, color: COLORS.yellow });
  second.drawText(data.licenseNumber, { x: 58, y: 230, size: 17, font: bold, color: COLORS.white });
  second.drawText(`KEVAL User ID: ${data.kevalUserId}`, { x: 58, y: 208, size: 9, font: regular, color: COLORS.white });
  second.drawText("For verification or rights clarification, contact support@kevalsound.com.", {
    x: 58,
    y: 188,
    size: 8.5,
    font: regular,
    color: COLORS.white,
  });
  second.drawText("The asset-specific certificate and the full License Terms apply together.", {
    x: 42,
    y: 130,
    size: 8.5,
    font: regular,
    color: COLORS.muted,
  });
  second.drawText("Registered business: KEVAL SOUND | 1ST CROSS, HORAPET, AZAD NAGAR, CHITRADURGA, KARNATAKA, 577501", {
    x: 42,
    y: 112,
    size: 7.5,
    font: regular,
    color: COLORS.muted,
  });

  const bytes = await document.save({ useObjectStreams: false });
  return {
    bytes,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
  };
}

export function licenseFilename(trackTitle: string, licenseNumber: string) {
  const safeTitle = trackTitle.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 70);
  return `keval-sound-${safeTitle || "track"}-${licenseNumber}.pdf`;
}
