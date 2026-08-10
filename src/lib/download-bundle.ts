"use client";

import { zip } from "fflate";

type DownloadAssetType = "MP3" | "WAV" | "LICENSE_PDF" | "INVOICE_PDF";

type GrantResponse = {
  downloadUrl?: string;
  message?: string;
};

type PackageProgress = {
  completed: number;
  total: number;
  label: string;
};

function safeFilePart(value: string, fallback: string) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 80);

  return normalized || fallback;
}

async function requestArtifact(trackId: string, assetType: DownloadAssetType) {
  const grantResponse = await fetch("/api/downloads/grants", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trackId, assetType }),
  });
  const grant = (await grantResponse.json().catch(() => ({}))) as GrantResponse;

  if (!grantResponse.ok || !grant.downloadUrl) {
    throw new Error(grant.message || `The ${assetType.toLowerCase()} download is unavailable.`);
  }

  const artifactResponse = await fetch(grant.downloadUrl, {
    credentials: "same-origin",
    cache: "no-store",
    redirect: "follow",
  });
  if (!artifactResponse.ok) {
    throw new Error(`The ${assetType.toLowerCase()} file could not be downloaded.`);
  }

  return new Uint8Array(await artifactResponse.arrayBuffer());
}

function createZip(files: Record<string, Uint8Array>) {
  return new Promise<Uint8Array>((resolve, reject) => {
    zip(files, { level: 0 }, (error, archive) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(archive);
    });
  });
}

export async function downloadTrackPackage(input: {
  trackId: string;
  title: string;
  licenseNumber: string;
  orderNumber: string;
  onProgress?: (progress: PackageProgress) => void;
}) {
  const titlePart = safeFilePart(input.title, "licensed-track");
  const licensePart = safeFilePart(input.licenseNumber, "license");
  const orderPart = safeFilePart(input.orderNumber, "order");
  const folder = `KEVAL SOUND - ${titlePart}`;
  const artifacts: Array<{
    type: DownloadAssetType;
    label: string;
    filename: string;
  }> = [
    { type: "MP3", label: "MP3 audio", filename: `01-${titlePart}.mp3` },
    { type: "WAV", label: "WAV master", filename: `02-${titlePart}.wav` },
    {
      type: "LICENSE_PDF",
      label: "license PDF",
      filename: `03-${titlePart}-license-${licensePart}.pdf`,
    },
    {
      type: "INVOICE_PDF",
      label: "invoice PDF",
      filename: `04-keval-sound-invoice-${orderPart}.pdf`,
    },
  ];

  const files: Record<string, Uint8Array> = {};
  for (const [index, artifact] of artifacts.entries()) {
    input.onProgress?.({
      completed: index,
      total: artifacts.length,
      label: `Securing ${artifact.label}`,
    });
    files[`${folder}/${artifact.filename}`] = await requestArtifact(input.trackId, artifact.type);
  }

  input.onProgress?.({
    completed: artifacts.length,
    total: artifacts.length,
    label: "Creating your licensed package",
  });
  const archive = await createZip(files);
  const archiveBuffer = new ArrayBuffer(archive.byteLength);
  new Uint8Array(archiveBuffer).set(archive);
  const blob = new Blob([archiveBuffer], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `keval-sound-${titlePart}-${licensePart}.zip`;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
