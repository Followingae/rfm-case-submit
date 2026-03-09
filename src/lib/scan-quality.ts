import type { ScanQualityResult, ScanIssue } from "@/lib/types";

// ── Helpers ──

function getGrayscale(canvas: HTMLCanvasElement): Float32Array {
  const ctx = canvas.getContext("2d")!;
  const { width, height } = canvas;
  const { data } = ctx.getImageData(0, 0, width, height);
  const gray = new Float32Array(width * height);
  for (let i = 0; i < gray.length; i++) {
    const off = i * 4;
    gray[i] = 0.299 * data[off] + 0.587 * data[off + 1] + 0.114 * data[off + 2];
  }
  return gray;
}

// ── 1. Blur Detection (Laplacian variance) ──

function detectBlur(gray: Float32Array, w: number, h: number): ScanIssue | null {
  // 3x3 Laplacian kernel: [-1,-1,-1; -1,8,-1; -1,-1,-1]
  const kernel = [-1, -1, -1, -1, 8, -1, -1, -1, -1];
  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let val = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          val += gray[(y + ky) * w + (x + kx)] * kernel[(ky + 1) * 3 + (kx + 1)];
        }
      }
      sum += val;
      sumSq += val * val;
      count++;
    }
  }

  const mean = sum / count;
  const variance = sumSq / count - mean * mean;

  if (variance < 30) {
    return { type: "blur", severity: "critical", message: `Image is blurry (sharpness ${Math.round(variance)})` };
  }
  if (variance < 80) {
    return { type: "blur", severity: "warning", message: `Image is slightly blurry (sharpness ${Math.round(variance)})` };
  }
  return null;
}

// ── 2. Resolution Check ──

function checkResolution(w: number, h: number): ScanIssue | null {
  const min = Math.min(w, h);
  if (min < 500) {
    return { type: "low-resolution", severity: "critical", message: `Very low resolution (${w}x${h})` };
  }
  if (min < 800) {
    return { type: "low-resolution", severity: "warning", message: `Low resolution (${w}x${h})` };
  }
  return null;
}

// ── 3. Overexposure / Glare ──

function checkOverexposure(gray: Float32Array): ScanIssue | null {
  let bright = 0;
  for (let i = 0; i < gray.length; i++) {
    if (gray[i] > 230) bright++;
  }
  const ratio = bright / gray.length;
  if (ratio > 0.85) {
    return { type: "overexposure", severity: "critical", message: `Severe glare/overexposure (${Math.round(ratio * 100)}% bright)` };
  }
  if (ratio > 0.7) {
    return { type: "overexposure", severity: "warning", message: `Possible glare/overexposure (${Math.round(ratio * 100)}% bright)` };
  }
  return null;
}

// ── 4. Skew Detection (Sobel + angle histogram) ──

function detectSkew(gray: Float32Array, w: number, h: number): ScanIssue | null {
  // Sobel kernels
  const bins = new Float64Array(180); // 0-179 degrees

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const gx =
        -gray[idx - w - 1] + gray[idx - w + 1] +
        -2 * gray[idx - 1] + 2 * gray[idx + 1] +
        -gray[idx + w - 1] + gray[idx + w + 1];
      const gy =
        -gray[idx - w - 1] - 2 * gray[idx - w] - gray[idx - w + 1] +
         gray[idx + w - 1] + 2 * gray[idx + w] + gray[idx + w + 1];

      const mag = Math.sqrt(gx * gx + gy * gy);
      if (mag < 30) continue; // skip weak edges

      let angle = Math.atan2(gy, gx) * (180 / Math.PI); // -180..180
      angle = ((angle % 180) + 180) % 180; // normalise to 0..179
      bins[Math.floor(angle)] += mag;
    }
  }

  // Find dominant angle
  let maxVal = 0;
  let dominant = 0;
  for (let i = 0; i < 180; i++) {
    if (bins[i] > maxVal) {
      maxVal = bins[i];
      dominant = i;
    }
  }

  // Deviation from nearest cardinal axis (0, 90, 180)
  const deviation = Math.min(
    Math.abs(dominant),
    Math.abs(dominant - 90),
    Math.abs(dominant - 180),
  );

  if (deviation > 10) {
    return { type: "skew", severity: "critical", message: `Document is skewed (~${deviation}\u00B0)` };
  }
  if (deviation > 3) {
    return { type: "skew", severity: "warning", message: `Document may be slightly skewed (~${deviation}\u00B0)` };
  }
  return null;
}

// ── Public API ──

export async function assessScanQuality(
  canvas: HTMLCanvasElement,
): Promise<ScanQualityResult> {
  const { width: w, height: h } = canvas;
  const gray = getGrayscale(canvas);

  const issues: ScanIssue[] = [];

  const blur = detectBlur(gray, w, h);
  if (blur) issues.push(blur);

  const res = checkResolution(w, h);
  if (res) issues.push(res);

  const exposure = checkOverexposure(gray);
  if (exposure) issues.push(exposure);

  const skew = detectSkew(gray, w, h);
  if (skew) issues.push(skew);

  let score = 100;
  for (const issue of issues) {
    score -= issue.severity === "critical" ? 30 : 15;
  }
  score = Math.max(0, Math.min(100, score));

  return { score, passable: score >= 40, issues };
}
