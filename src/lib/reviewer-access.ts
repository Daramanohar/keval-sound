const DEFAULT_WAV_REVIEWER_EMAILS = ["zohro@kevalsound.com"];

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function parseReviewerEmails(value: string | undefined) {
  return value
    ?.split(",")
    .map(normalizeEmail)
    .filter(Boolean);
}

export function getWavReviewerEmails() {
  const configuredEmails = parseReviewerEmails(
    process.env.NEXT_PUBLIC_WAV_REVIEWER_EMAILS ?? process.env.WAV_REVIEWER_EMAILS
  );

  return configuredEmails?.length ? configuredEmails : DEFAULT_WAV_REVIEWER_EMAILS;
}

export function isWavReviewerEmail(email: string | null | undefined) {
  if (!email) return false;
  return getWavReviewerEmails().includes(normalizeEmail(email));
}

export function createWavReviewStreamUrl(trackId: string) {
  return `/api/media/stream/wav/${encodeURIComponent(trackId)}`;
}
