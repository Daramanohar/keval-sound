import "server-only";

import type { Prisma } from "@prisma/client";

function indianFiscalYear(date: Date) {
  const indiaTime = new Date(date.getTime() + 330 * 60_000);
  const year = indiaTime.getUTCFullYear();
  const startYear = indiaTime.getUTCMonth() >= 3 ? year : year - 1;
  const shortStart = String(startYear % 100).padStart(2, "0");
  const shortEnd = String((startYear + 1) % 100).padStart(2, "0");
  return {
    key: `${startYear}-${shortEnd}`,
    label: `${shortStart}-${shortEnd}`,
  };
}

export async function allocateInvoiceNumber(
  tx: Prisma.TransactionClient,
  issuedAt: Date,
  livemode: boolean
) {
  const fiscalYear = indianFiscalYear(issuedAt);
  const mode = livemode ? "LIVE" : "TEST";
  const sequence = await tx.invoiceSequence.upsert({
    where: { key: `${mode}:${fiscalYear.key}` },
    create: {
      key: `${mode}:${fiscalYear.key}`,
      nextValue: 2,
    },
    update: { nextValue: { increment: 1 } },
    select: { nextValue: true },
  });
  const value = sequence.nextValue - 1;
  if (value > 999_999) {
    throw new Error(`Invoice sequence exhausted for ${mode} ${fiscalYear.key}.`);
  }
  const prefix = livemode ? "KVL" : "TST";
  return `${prefix}/${fiscalYear.label}/${String(value).padStart(6, "0")}`;
}
