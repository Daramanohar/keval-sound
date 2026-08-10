import "server-only";

import crypto from "node:crypto";

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function randomCode(length: number) {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
}

function utcDateStamp(date = new Date()) {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

export function createOrderNumber(date = new Date()) {
  return `KVL-ORD-${utcDateStamp(date)}-${randomCode(10)}`;
}

export function createLicenseNumber(licenseeName: string, date = new Date()) {
  const prefix = licenseeName.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 4).padEnd(4, "X");
  return `KVL-${prefix}-${date.getUTCFullYear()}-${randomCode(12)}`;
}
