import packCopy from "./pack-copy.json";

export interface PackCopy {
  tagline: string;
  description: string;
}

export const packCopyById = packCopy as Record<string, PackCopy>;

export function getPackCopy(packId: string): PackCopy | undefined {
  return packCopyById[packId];
}
