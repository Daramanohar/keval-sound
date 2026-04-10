import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatBPM(bpm: number): string {
  return `${bpm} BPM`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function resampleWaveform(data: number[], targetLength: number): number[] {
  if (!data.length || targetLength <= 0) return [];
  if (data.length === targetLength) return data;
  if (targetLength === 1) return [data[0]];

  return Array.from({ length: targetLength }, (_, index) => {
    const position = (index / (targetLength - 1)) * (data.length - 1);
    const startIndex = Math.floor(position);
    const endIndex = Math.min(data.length - 1, Math.ceil(position));
    const mix = position - startIndex;
    const startValue = data[startIndex];
    const endValue = data[endIndex];

    return startValue + (endValue - startValue) * mix;
  });
}

export function generateWaveformData(bars: number = 40): number[] {
  return Array.from({ length: bars }, () => Math.random() * 0.8 + 0.2);
}

export function getRandomDelay(min: number = 0, max: number = 0.5): number {
  return Math.random() * (max - min) + min;
}
