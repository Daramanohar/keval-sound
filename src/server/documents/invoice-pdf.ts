import "server-only";

import crypto from "node:crypto";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

const A4: [number, number] = [595.28, 841.89];
const COLORS = {
  ink: rgb(12 / 255, 13 / 255, 28 / 255),
  red: rgb(229 / 255, 66 / 255, 46 / 255),
  yellow: rgb(255 / 255, 235 / 255, 153 / 255),
  white: rgb(1, 1, 1),
  muted: rgb(102 / 255, 108 / 255, 125 / 255),
  line: rgb(218 / 255, 220 / 255, 227 / 255),
  pale: rgb(248 / 255, 248 / 255, 251 / 255),
};

export type InvoiceData = {
  invoiceNumber: string;
  orderNumber: string;
  issuedAt: Date;
  paymentProvider: string;
  providerPaymentId: string;
  customerName: string;
  customerEmail: string | null;
  kevalUserId: string;
  currency: string;
  subtotalPaise: number;
  taxPaise: number;
  totalPaise: number;
  items: Array<{
    title: string;
    licenseNumber: string;
    unitAmountPaise: number;
    taxPaise: number;
    totalPaise: number;
  }>;
};

function money(amountPaise: number, currency: string) {
  return `${currency.toUpperCase()} ${(amountPaise / 100).toFixed(2)}`;
}

function date(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}

function rightAlignedX(text: string, font: PDFFont, size: number, right: number) {
  return right - font.widthOfTextAtSize(text, size);
}

export async function generateInvoice(data: InvoiceData) {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const page = document.addPage(A4);
  const [width, height] = A4;

  document.setTitle(`KEVAL SOUND Invoice ${data.invoiceNumber}`);
  document.setAuthor("KEVAL SOUND");
  document.setSubject(`Paid order ${data.orderNumber}`);
  document.setCreationDate(data.issuedAt);
  document.setModificationDate(data.issuedAt);

  page.drawRectangle({ x: 0, y: height - 108, width, height: 108, color: COLORS.ink });
  page.drawRectangle({ x: 0, y: height - 112, width, height: 4, color: COLORS.red });
  page.drawText("KEVAL", { x: 42, y: height - 54, size: 22, font: bold, color: COLORS.white });
  page.drawText("SOUND", { x: 112, y: height - 54, size: 22, font: bold, color: COLORS.red });
  page.drawText("DIGITAL MUSIC LICENSING", {
    x: 42,
    y: height - 76,
    size: 7.5,
    font: regular,
    color: COLORS.yellow,
  });
  page.drawText("PAID INVOICE", {
    x: rightAlignedX("PAID INVOICE", bold, 19, width - 42),
    y: height - 58,
    size: 19,
    font: bold,
    color: COLORS.white,
  });

  page.drawText("FROM", { x: 42, y: 690, size: 7, font: bold, color: COLORS.muted });
  page.drawText("KEVAL SOUND", { x: 42, y: 671, size: 11, font: bold, color: COLORS.ink });
  page.drawText("1ST CROSS, HORAPET, AZAD NAGAR", {
    x: 42,
    y: 655,
    size: 8,
    font: regular,
    color: COLORS.muted,
  });
  page.drawText("CHITRADURGA, KARNATAKA, 577501", {
    x: 42,
    y: 642,
    size: 8,
    font: regular,
    color: COLORS.muted,
  });
  page.drawText("GSTIN 29ACWPZ8257G1ZD", { x: 42, y: 629, size: 8, font: bold, color: COLORS.ink });

  page.drawText("BILL TO", { x: 310, y: 690, size: 7, font: bold, color: COLORS.muted });
  page.drawText(data.customerName.slice(0, 52), { x: 310, y: 671, size: 11, font: bold, color: COLORS.ink });
  page.drawText(data.customerEmail?.slice(0, 52) || "Email not provided", {
    x: 310,
    y: 654,
    size: 8,
    font: regular,
    color: COLORS.muted,
  });
  page.drawText(`KEVAL User ID: ${data.kevalUserId}`, { x: 310, y: 637, size: 8, font: bold, color: COLORS.ink });

  page.drawRectangle({ x: 42, y: 562, width: 511, height: 48, color: COLORS.pale });
  const details = [
    ["INVOICE", data.invoiceNumber],
    ["ORDER", data.orderNumber],
    ["DATE", date(data.issuedAt)],
    ["PAYMENT", data.paymentProvider.toUpperCase()],
  ];
  details.forEach(([label, value], index) => {
    const x = 55 + index * 126;
    page.drawText(label, { x, y: 591, size: 6.5, font: bold, color: COLORS.muted });
    page.drawText(value.slice(0, 22), { x, y: 574, size: 8.5, font: bold, color: COLORS.ink });
  });

  page.drawRectangle({ x: 42, y: 526, width: 511, height: 24, color: COLORS.ink });
  page.drawText("LICENSED TRACK", { x: 52, y: 534, size: 7, font: bold, color: COLORS.white });
  page.drawText("LICENSE ID", { x: 310, y: 534, size: 7, font: bold, color: COLORS.white });
  page.drawText("AMOUNT", { x: 475, y: 534, size: 7, font: bold, color: COLORS.white });

  let y = 506;
  for (const item of data.items.slice(0, 20)) {
    page.drawText(item.title.slice(0, 48), { x: 52, y, size: 8.5, font: regular, color: COLORS.ink });
    page.drawText(item.licenseNumber.slice(0, 28), { x: 310, y, size: 7.5, font: regular, color: COLORS.muted });
    const amount = money(item.totalPaise, data.currency);
    page.drawText(amount, {
      x: rightAlignedX(amount, regular, 8.5, 543),
      y,
      size: 8.5,
      font: regular,
      color: COLORS.ink,
    });
    page.drawLine({ start: { x: 42, y: y - 8 }, end: { x: 553, y: y - 8 }, thickness: 0.5, color: COLORS.line });
    y -= 20;
  }

  const totalsTop = Math.max(102, y - 12);
  const totalRows = [
    ["Subtotal", money(data.subtotalPaise, data.currency)],
    ["Tax", money(data.taxPaise, data.currency)],
    ["Total paid", money(data.totalPaise, data.currency)],
  ];
  totalRows.forEach(([label, value], index) => {
    const rowY = totalsTop - index * 20;
    page.drawText(label, {
      x: 382,
      y: rowY,
      size: index === 2 ? 10 : 8.5,
      font: index === 2 ? bold : regular,
      color: index === 2 ? COLORS.ink : COLORS.muted,
    });
    page.drawText(value, {
      x: rightAlignedX(value, index === 2 ? bold : regular, index === 2 ? 10 : 8.5, 543),
      y: rowY,
      size: index === 2 ? 10 : 8.5,
      font: index === 2 ? bold : regular,
      color: index === 2 ? COLORS.red : COLORS.ink,
    });
  });

  page.drawLine({ start: { x: 42, y: 54 }, end: { x: 553, y: 54 }, thickness: 0.7, color: COLORS.line });
  page.drawText(`Razorpay payment: ${data.providerPaymentId}`, {
    x: 42,
    y: 38,
    size: 7,
    font: regular,
    color: COLORS.muted,
  });
  page.drawText("support@kevalsound.com | www.kevalsound.com", {
    x: rightAlignedX("support@kevalsound.com | www.kevalsound.com", regular, 7, 553),
    y: 38,
    size: 7,
    font: regular,
    color: COLORS.muted,
  });

  const bytes = await document.save({ useObjectStreams: false });
  return {
    bytes,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
  };
}

export function invoiceFilename(orderNumber: string) {
  const safeOrderNumber = orderNumber.replace(/[^a-z0-9-]+/gi, "-").slice(0, 70);
  return `keval-sound-invoice-${safeOrderNumber}.pdf`;
}
