// MindAR anchor units: target width = 1; target height retains the compiled aspect.
export const trackingSettings = Object.freeze({
  warmupTolerance: 4,
  missTolerance: 2,
  filterMinCF: 0.01,
  filterBeta: 1000,
});

export function surfaceBounds(width, height, rect) {
  const values = [width, height, rect.x, rect.y, rect.width, rect.height];
  if (!values.every(Number.isFinite) || width <= 0 || height <= 0 ||
      rect.x < 0 || rect.y < 0 || rect.width <= 0 || rect.height <= 0 ||
      rect.x + rect.width > 1 || rect.y + rect.height > 1) {
    throw new Error('The video rectangle must be inside the tracked image.');
  }
  const aspect = height / width;
  const availableHeight = rect.height * aspect;
  const fittedWidth = Math.min(rect.width, availableHeight * 16 / 9);
  return {
    width: fittedWidth,
    height: fittedWidth * 9 / 16,
    x: rect.x + rect.width / 2 - 0.5,
    y: (0.5 - rect.y - rect.height / 2) * aspect,
  };
}

// Crop video UVs rather than stretching the video or extending beyond the paper.
export function coverUV(videoAspect, surfaceAspect) {
  if (!(videoAspect > 0 && surfaceAspect > 0)) return {x: 1, y: 1};
  return videoAspect > surfaceAspect
    ? {x: surfaceAspect / videoAspect, y: 1}
    : {x: 1, y: videoAspect / surfaceAspect};
}
