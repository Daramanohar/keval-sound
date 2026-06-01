import crypto from "node:crypto";

const MAX_TTL_SECONDS = {
  "mp3-stream": 2 * 60 * 60,
  "mp3-download": 15 * 60,
  "wav-stream": 4 * 60 * 60,
  "wav-download": 15 * 60,
};

function usage() {
  return [
    "Usage:",
    "  node scripts/create-media-gate-token.mjs --track-id <id> [--grant mp3-stream|mp3-download|wav-stream|wav-download] [--subject <user>] [--minutes <n>]",
    "",
    "Environment:",
    "  MEDIA_GATE_SIGNING_SECRET must be set to the same value configured as the Worker secret.",
  ].join("\n");
}

function readArgs(argv) {
  if (argv.length && argv.every((value) => !value.startsWith("--"))) {
    return {
      "track-id": argv[0],
      grant: argv[1],
      minutes: argv[2],
      subject: argv[3],
    };
  }

  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith("--")) {
      throw new Error(`Unexpected argument: ${current}`);
    }

    const key = current.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }

    args[key] = value;
    index += 1;
  }

  return args;
}

function base64Url(input) {
  return Buffer.from(input).toString("base64url");
}

function signPayload(payload, secret) {
  const payloadPart = base64Url(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", secret).update(payloadPart).digest("base64url");
  return `${payloadPart}.${signature}`;
}

function main() {
  const args = readArgs(process.argv.slice(2));
  const secret = process.env.MEDIA_GATE_SIGNING_SECRET;
  const trackId = args["track-id"];
  const access = args.grant ?? args.access ?? "mp3-stream";
  const subject = args.subject ?? "local-test-user";

  if (!secret) {
    throw new Error(`MEDIA_GATE_SIGNING_SECRET is not set.\n\n${usage()}`);
  }

  if (!trackId) {
    throw new Error(`--track-id is required.\n\n${usage()}`);
  }

  if (!MAX_TTL_SECONDS[access]) {
    throw new Error(`Unsupported --grant value: ${access}`);
  }

  const defaultMinutes = access.endsWith("-download") ? 15 : access === "wav-stream" ? 240 : 120;
  const minutes = Number(args.minutes ?? defaultMinutes);
  if (!Number.isFinite(minutes) || minutes <= 0) {
    throw new Error("--minutes must be a positive number.");
  }

  const ttlSeconds = Math.round(minutes * 60);
  if (ttlSeconds > MAX_TTL_SECONDS[access]) {
    throw new Error(`${access} tokens cannot exceed ${MAX_TTL_SECONDS[access] / 60} minutes.`);
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: subject,
    trackId,
    access,
    iat: now,
    exp: now + ttlSeconds,
    jti: crypto.randomUUID(),
  };

  const token = signPayload(payload, secret);
  const [format, actionName] = access.split("-");
  const action = actionName === "download" ? "download" : "stream";

  console.log(token);
  console.log("");
  console.log(`Example URL: https://media.kevalsound.com/v1/${format}/${action}/${encodeURIComponent(trackId)}?token=${token}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
