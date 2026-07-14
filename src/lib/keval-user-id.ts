import "server-only";

import crypto from "node:crypto";

const KEVAL_USER_ID_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const KEVAL_USER_ID_LENGTH = 12;

export function createKevalUserId() {
  const bytes = crypto.randomBytes(KEVAL_USER_ID_LENGTH);
  let value = "KVL-";

  for (const byte of bytes) {
    value += KEVAL_USER_ID_ALPHABET[byte % KEVAL_USER_ID_ALPHABET.length];
  }

  return value;
}
