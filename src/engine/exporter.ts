import { ExportSettings, StudioParams } from '../types/studio';
import { renderComposition2D } from './composition2d';
import { WebGLThermalRenderer } from './webglRenderer';

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function exportStaticImage(
  params: StudioParams,
  mediaElement: HTMLImageElement | HTMLVideoElement | null,
  settings: ExportSettings,
  timeSec: number
): Promise<void> {
  const offscreen2D = document.createElement('canvas');
  const offscreenGL = document.createElement('canvas');
  const renderer = new WebGLThermalRenderer(offscreenGL);

  const maxTex = renderer.getMaxTextureSize();
  const targetW = Math.min(maxTex, Math.round(params.canvas.width * settings.scale));
  const targetH = Math.min(maxTex, Math.round(params.canvas.height * settings.scale));

  const scaledParams: StudioParams = {
    ...params,
    canvas: {
      ...params.canvas,
      width: targetW,
      height: targetH,
    },
  };

  renderComposition2D(offscreen2D, scaledParams, mediaElement, timeSec);

  if (renderer.isAvailable()) {
    renderer.render(offscreen2D, scaledParams, timeSec);
  }

  const outputCanvas = renderer.isAvailable() ? offscreenGL : offscreen2D;

  if (settings.format === 'svg') {
    const dataUrl = outputCanvas.toDataURL('image/png');
    const w = targetW;
    const h = targetH;
    const minDim = Math.min(w, h);
    const pxSize = Math.max(16, (params.typography.fontSize / 100) * minDim);
    const lines = params.typography.text.split('\n');
    const lineStep = pxSize * params.typography.lineHeight;
    const totalH = lines.length * lineStep;
    const startY = (h - totalH) * 0.5 + lineStep * 0.5;
    const anchorX =
      params.typography.align === 'left'
        ? w * 0.08
        : params.typography.align === 'right'
        ? w * 0.92
        : w * 0.5;
    const textAnchor =
      params.typography.align === 'left'
        ? 'start'
        : params.typography.align === 'right'
        ? 'end'
        : 'middle';

    const textNodes = lines
      .map(
        (line, idx) =>
          `<text x="${anchorX}" y="${startY + idx * lineStep}" fill="${params.typography.color}" font-family="${escapeXml(
            params.typography.fontFamily
          )}, sans-serif" font-weight="${params.typography.fontWeight}" font-size="${pxSize}" letter-spacing="${
            params.typography.letterSpacing
          }em" text-anchor="${textAnchor}" dominant-baseline="central">${escapeXml(
            line
          )}</text>`
      )
      .join('\n    ');

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <image href="${dataUrl}" width="${w}" height="${h}" />
  <g opacity="0.95" style="mix-blend-mode: ${params.typography.blendMode}">
    ${textNodes}
  </g>
</svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    triggerDownload(blob, `thermokinetic-${Date.now()}.svg`);
    renderer.dispose();
    return;
  }

  const mime = settings.format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const ext = settings.format === 'jpeg' ? 'jpg' : 'png';

  await new Promise<void>((resolve, reject) => {
    outputCanvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to encode high-resolution image.'));
          return;
        }
        triggerDownload(blob, `thermokinetic-${targetW}x${targetH}.${ext}`);
        resolve();
      },
      mime,
      settings.format === 'jpeg' ? settings.jpegQuality : 1.0
    );
  });

  renderer.dispose();
}

export function getBestSupportedVideoMime(): {
  mimeType: string;
  extension: string;
  label: string;
} {
  const candidates = [
    { mimeType: 'video/mp4;codecs=avc1.42E01E', extension: 'mp4', label: 'MP4 (H.264)' },
    { mimeType: 'video/mp4', extension: 'mp4', label: 'MP4' },
    { mimeType: 'video/webm;codecs=vp9', extension: 'webm', label: 'WebM (VP9)' },
    { mimeType: 'video/webm;codecs=vp8', extension: 'webm', label: 'WebM (VP8)' },
    { mimeType: 'video/webm', extension: 'webm', label: 'WebM' },
  ];

  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c.mimeType)) {
      return c;
    }
  }

  return { mimeType: 'video/webm', extension: 'webm', label: 'WebM' };
}

export async function exportVideoLoop(
  params: StudioParams,
  mediaElement: HTMLImageElement | HTMLVideoElement | null,
  settings: ExportSettings,
  onProgress: (pct: number) => void
): Promise<void> {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('MediaRecorder API is not supported in this browser.');
  }

  const offscreen2D = document.createElement('canvas');
  const offscreenGL = document.createElement('canvas');
  const renderer = new WebGLThermalRenderer(offscreenGL);

  // Clamp video dimensions sensibly for smooth real-time encoding
  const rawW = Math.round(params.canvas.width * (settings.scale > 1 ? 1.5 : 1));
  const rawH = Math.round(params.canvas.height * (settings.scale > 1 ? 1.5 : 1));
  const maxDim = 2160;
  const downscale = Math.min(1, maxDim / Math.max(rawW, rawH));
  const targetW = Math.max(2, Math.floor((rawW * downscale) / 2) * 2);
  const targetH = Math.max(2, Math.floor((rawH * downscale) / 2) * 2);

  offscreen2D.width = targetW;
  offscreen2D.height = targetH;
  offscreenGL.width = targetW;
  offscreenGL.height = targetH;

  const videoParams: StudioParams = {
    ...params,
    canvas: {
      ...params.canvas,
      width: targetW,
      height: targetH,
    },
  };

  const { mimeType, extension } = getBestSupportedVideoMime();
  const stream = offscreenGL.captureStream(settings.fps);
  const chunks: BlobPart[] = [];

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 14_000_000,
  });

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  const totalMs = settings.durationSeconds * 1000;
  const startTime = performance.now();

  await new Promise<void>((resolve, reject) => {
    recorder.onerror = () => reject(new Error('Video recording failed.'));
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      triggerDownload(
        blob,
        `thermokinetic-${targetW}x${targetH}-${settings.fps}fps.${extension}`
      );
      resolve();
    };

    recorder.start(100);

    const step = () => {
      const elapsed = performance.now() - startTime;
      const tSec = elapsed / 1000;
      renderComposition2D(offscreen2D, videoParams, mediaElement, tSec);
      if (renderer.isAvailable()) {
        renderer.render(offscreen2D, videoParams, tSec);
      }
      onProgress(Math.min(100, Math.round((elapsed / totalMs) * 100)));

      if (elapsed < totalMs) {
        requestAnimationFrame(step);
      } else {
        onProgress(100);
        recorder.stop();
      }
    };

    requestAnimationFrame(step);
  });

  renderer.dispose();
}
