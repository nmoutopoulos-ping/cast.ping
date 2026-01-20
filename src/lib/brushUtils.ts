export type BrushRange = {
  startIndex: number;
  endIndex: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Rescales a brush range when the underlying data length changes.
 * Keeps the same relative window (percent-of-series) to avoid collapsing to a tiny slice.
 */
export function rescaleBrushRange(
  prevRange: BrushRange | null,
  prevLen: number,
  nextLen: number
): BrushRange | null {
  if (nextLen < 2) return null;
  if (!prevRange || prevLen < 2) return { startIndex: 0, endIndex: nextLen - 1 };

  const prevMaxIndex = prevLen - 1;
  const nextMaxIndex = nextLen - 1;

  const startRatio = prevMaxIndex > 0 ? prevRange.startIndex / prevMaxIndex : 0;
  const endRatio = prevMaxIndex > 0 ? prevRange.endIndex / prevMaxIndex : 1;

  let startIndex = Math.round(startRatio * nextMaxIndex);
  let endIndex = Math.round(endRatio * nextMaxIndex);

  startIndex = clamp(startIndex, 0, nextMaxIndex);
  endIndex = clamp(endIndex, 0, nextMaxIndex);

  if (startIndex > endIndex) [startIndex, endIndex] = [endIndex, startIndex];

  // Ensure a non-zero window when possible
  if (startIndex === endIndex && nextLen >= 2) {
    if (endIndex < nextMaxIndex) endIndex += 1;
    else if (startIndex > 0) startIndex -= 1;
  }

  return { startIndex, endIndex };
}

export function isFullBrushRange(range: BrushRange | null, len: number): boolean {
  if (!range) return true;
  if (len < 2) return true;
  return range.startIndex <= 0 && range.endIndex >= len - 1;
}

export function getXDomainFromBrushRange(
  data: Array<{ x?: number }>,
  range: BrushRange
): [number, number] | null {
  const start = data[range.startIndex]?.x;
  const end = data[range.endIndex]?.x;
  if (typeof start !== 'number' || typeof end !== 'number') return null;
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (start <= 0 || end <= 0) return null;
  return [Math.min(start, end), Math.max(start, end)];
}
