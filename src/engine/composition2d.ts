import { StudioParams } from '../types/studio';

function drawTextWithTracking(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  letterSpacingPx: number,
  align: 'left' | 'center' | 'right'
) {
  if (Math.abs(letterSpacingPx) < 0.25) {
    ctx.textAlign = align;
    ctx.fillText(text, x, y);
    return;
  }

  const chars = Array.from(text);
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const totalWidth =
    widths.reduce((acc, w) => acc + w, 0) +
    letterSpacingPx * Math.max(0, chars.length - 1);

  let cursorX = x;
  if (align === 'center') {
    cursorX = x - totalWidth / 2;
  } else if (align === 'right') {
    cursorX = x - totalWidth;
  }

  ctx.textAlign = 'left';
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], cursorX, y);
    cursorX += widths[i] + letterSpacingPx;
  }
}

/**
 * Draws procedural generative substrates inspired by the visual references
 * when no custom image or video has been uploaded yet.
 */
function drawSubstrate(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  params: StudioParams,
  timeSec: number
) {
  const { substrateKind, scale, offsetX, offsetY, bgColor } = params.media;
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, w, h);

  const cx = w * 0.5 + offsetX * w * 0.35;
  const cy = h * 0.5 + offsetY * h * 0.35;
  const minDim = Math.min(w, h) * scale;
  const t = timeSec * params.animation.speed * 0.85;

  ctx.save();

  if (substrateKind === 'splash_spheres') {
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + t * 0.35;
      const rad = minDim * (0.14 + (i % 3) * 0.085);
      const bx = cx + Math.cos(angle) * minDim * 0.22;
      const by = cy + Math.sin(angle * 1.3) * minDim * 0.28;

      const grad = ctx.createRadialGradient(
        bx - rad * 0.25,
        by - rad * 0.25,
        rad * 0.05,
        bx,
        by,
        rad
      );
      grad.addColorStop(0, '#FFFFFF');
      grad.addColorStop(0.55, '#9E9EA8');
      grad.addColorStop(1, 'rgba(10,10,14,0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(bx, by, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.88)';
    ctx.lineCap = 'round';
    for (let r = 0; r < 5; r++) {
      ctx.lineWidth = minDim * (0.015 + (r % 3) * 0.014);
      ctx.beginPath();
      for (let s = 0; s <= 32; s++) {
        const p = s / 32;
        const px = w * (0.15 + p * 0.7) + Math.sin(p * 6 + t + r) * minDim * 0.08;
        const py =
          h * (0.15 + r * 0.16) +
          Math.cos(p * 4.5 - t * 1.1 + r * 1.4) * minDim * 0.14;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  } else if (substrateKind === 'cobalt_ribbons') {
    const palette = ['#FF4D5A', '#22D3EE', '#FDE047', '#F4F4F5', '#18181B'];
    for (let layer = 0; layer < 4; layer++) {
      const yBase = h * (0.2 + layer * 0.2);
      for (let stripe = 0; stripe < 5; stripe++) {
        ctx.strokeStyle = palette[(layer + stripe) % palette.length];
        ctx.lineWidth = minDim * 0.032;
        ctx.beginPath();
        for (let i = 0; i <= 40; i++) {
          const u = i / 40;
          const x = u * w;
          const y =
            yBase +
            Math.sin(u * 5.0 + t + layer * 1.2) * minDim * 0.16 +
            (stripe - 2) * minDim * 0.028;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    const sphereCoords = [
      { x: cx - minDim * 0.18, y: cy - minDim * 0.14, r: minDim * 0.22 },
      { x: cx + minDim * 0.18, y: cy + minDim * 0.2, r: minDim * 0.18 },
    ];
    for (const sp of sphereCoords) {
      const g = ctx.createLinearGradient(sp.x - sp.r, sp.y - sp.r, sp.x + sp.r, sp.y + sp.r);
      g.addColorStop(0, '#FDE047');
      g.addColorStop(0.55, '#2563EB');
      g.addColorStop(1, '#09090B');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (substrateKind === 'liquid_monolith') {
    for (let i = 0; i < 4; i++) {
      const px = cx + Math.sin(t * 0.6 + i * 1.8) * minDim * 0.2;
      const py = cy + Math.cos(t * 0.45 + i * 2.1) * minDim * 0.25;
      const rad = minDim * (0.28 + i * 0.06);
      const grad = ctx.createRadialGradient(px, py, 0, px, py, rad);
      grad.addColorStop(0, 'rgba(255,255,255,0.42)');
      grad.addColorStop(0.45, 'rgba(130,130,150,0.16)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (substrateKind === 'halftone_field') {
    const bandCount = 9;
    for (let i = 0; i < bandCount; i++) {
      const y = ((i / bandCount + (t * 0.04) % 1) % 1) * h;
      const bh = (h / bandCount) * 0.38;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.05)';
      ctx.fillRect(0, y, w, bh);
    }
    const g = ctx.createRadialGradient(cx, cy, minDim * 0.05, cx, cy, minDim * 0.48);
    g.addColorStop(0, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.5, 'rgba(160,160,175,0.18)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, minDim * 0.48, 0, Math.PI * 2);
    ctx.fill();
  } else if (substrateKind === 'thermal_gradient') {
    const blobs = [
      { x: 0.35 + Math.sin(t * 0.5) * 0.1, y: 0.38 + Math.cos(t * 0.4) * 0.08, r: 0.42, c: '#FFFFFF' },
      { x: 0.65 + Math.cos(t * 0.6) * 0.1, y: 0.62 + Math.sin(t * 0.5) * 0.08, r: 0.38, c: '#D4D4D8' },
      { x: 0.5, y: 0.5, r: 0.3, c: '#A1A1AA' },
    ];
    for (const b of blobs) {
      const bx = b.x * w + offsetX * w * 0.25;
      const by = b.y * h + offsetY * h * 0.25;
      const br = b.r * minDim;
      const grad = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      grad.addColorStop(0, b.c);
      grad.addColorStop(0.5, 'rgba(120,120,130,0.35)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (substrateKind === 'spectral_waves') {
    // Undulating vertical thermal interference ribbons (Ref: image_7e7496da)
    ctx.fillStyle = '#080A0F';
    ctx.fillRect(0, 0, w, h);
    const cols = 7;
    for (let c = 0; c < cols; c++) {
      const xCenter = ((c + 0.5) / cols) * w;
      const ribbonGrad = ctx.createLinearGradient(
        xCenter - minDim * 0.11,
        0,
        xCenter + minDim * 0.11,
        0
      );
      ribbonGrad.addColorStop(0, 'rgba(30,30,40,0)');
      ribbonGrad.addColorStop(0.35, 'rgba(165,165,175,0.75)');
      ribbonGrad.addColorStop(0.5, 'rgba(255,255,255,1)');
      ribbonGrad.addColorStop(0.65, 'rgba(165,165,175,0.75)');
      ribbonGrad.addColorStop(1, 'rgba(30,30,40,0)');

      ctx.strokeStyle = ribbonGrad;
      ctx.lineWidth = minDim * 0.11;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let s = 0; s <= 36; s++) {
        const py = (s / 36) * h;
        const px =
          xCenter +
          Math.sin(py * 0.008 + t * 1.1 + c * 1.35) * minDim * 0.085 +
          Math.cos(py * 0.004 - t * 0.7 + c * 2.1) * minDim * 0.055;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  } else if (substrateKind === 'caustic_sphere') {
    // Luminous spherical particle/filament caustics on void black (Ref: image_f0258135)
    ctx.fillStyle = '#020203';
    ctx.fillRect(0, 0, w, h);

    const radius = minDim * 0.36;
    const radialGlow = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius * 1.05);
    radialGlow.addColorStop(0, 'rgba(255,255,255,0.04)');
    radialGlow.addColorStop(0.75, 'rgba(255,255,255,0.12)');
    radialGlow.addColorStop(0.96, 'rgba(255,255,255,0.22)');
    radialGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = radialGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.05, 0, Math.PI * 2);
    ctx.fill();

    const strands = 34;
    for (let i = 0; i < strands; i++) {
      const frac = i / strands;
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 + Math.sin(frac * Math.PI) * 0.32})`;
      ctx.lineWidth = Math.max(0.8, minDim * 0.0018);
      ctx.beginPath();
      for (let s = 0; s <= 48; s++) {
        const u = s / 48;
        const theta = (u - 0.5) * Math.PI * 0.96;
        const phi =
          (frac - 0.5) * Math.PI * 1.1 +
          Math.sin(u * 4.5 + t * 0.9 + frac * 6.0) * 0.38;
        const sx = cx + Math.sin(phi) * Math.cos(theta) * radius;
        const sy =
          cy -
          Math.sin(theta) * radius * 0.92 +
          Math.cos(phi * 2.0 + t * 0.6) * radius * 0.08;
        if (s === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }
  } else if (substrateKind === 'singularity') {
    // High-contrast light field with dense dark core & radiating filaments (Ref: image_6bbf0aab)
    ctx.fillStyle = '#F5F5F2';
    ctx.fillRect(0, 0, w, h);

    // Cross-axis hairlines
    ctx.strokeStyle = 'rgba(15, 15, 20, 0.18)';
    for (let i = -8; i <= 8; i++) {
      ctx.lineWidth = Math.max(0.6, minDim * (0.001 + (1 - Math.abs(i) / 9) * 0.002));
      const jitter = Math.sin(t + i * 1.9) * minDim * 0.015;
      ctx.beginPath();
      ctx.moveTo(0, cy + i * minDim * 0.012 + jitter);
      ctx.lineTo(w, cy + i * minDim * 0.012 - jitter);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx + i * minDim * 0.012 - jitter, 0);
      ctx.lineTo(cx + i * minDim * 0.012 + jitter, h);
      ctx.stroke();
    }

    // Radiating organic tendrils
    ctx.strokeStyle = 'rgba(10, 10, 14, 0.55)';
    for (let k = 0; k < 22; k++) {
      const ang = (k / 22) * Math.PI * 2 + Math.sin(t * 0.4 + k) * 0.15;
      ctx.lineWidth = Math.max(0.8, minDim * 0.0024);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      const len = minDim * (0.28 + (k % 4) * 0.12);
      const cpx = cx + Math.cos(ang + 0.4) * len * 0.55;
      const cpy = cy + Math.sin(ang - 0.3) * len * 0.55;
      const ex = cx + Math.cos(ang) * len;
      const ey = cy + Math.sin(ang) * len;
      ctx.quadraticCurveTo(cpx, cpy, ex, ey);
      ctx.stroke();
    }

    // Dense singularity core
    const coreRad = minDim * 0.15;
    const coreGrad = ctx.createRadialGradient(cx, cy, coreRad * 0.15, cx, cy, coreRad * 1.4);
    coreGrad.addColorStop(0, '#040406');
    coreGrad.addColorStop(0.55, 'rgba(6,6,10,0.92)');
    coreGrad.addColorStop(1, 'rgba(6,6,10,0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, coreRad * 1.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (substrateKind === 'grid_paper') {
    // Light technical paper texture with subtle exposure vignette (Ref: image_5c102fae)
    const grad = ctx.createRadialGradient(cx, cy, minDim * 0.08, cx, cy, Math.max(w, h) * 0.72);
    grad.addColorStop(0, '#F5F4F0');
    grad.addColorStop(1, '#DCDAD3');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Faint photocopy dust specks
    ctx.fillStyle = 'rgba(20, 20, 24, 0.25)';
    for (let i = 0; i < 65; i++) {
      const sx = ((Math.sin(i * 127.1) * 0.5 + 0.5) * w);
      const sy = ((Math.cos(i * 311.7) * 0.5 + 0.5) * h);
      const r = (i % 3 === 0 ? 1.8 : 0.9) * (minDim / 1000);
      ctx.fillRect(sx, sy, r, r);
    }
  }

  ctx.restore();
}

function drawUploadedMedia(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  params: StudioParams,
  source: HTMLImageElement | HTMLVideoElement
) {
  const srcW =
    source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
  const srcH =
    source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;

  if (!srcW || !srcH) return;

  const { fit, scale, offsetX, offsetY, contrast, invert, bgColor } = params.media;
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, w, h);

  const canvasRatio = w / h;
  const srcRatio = srcW / srcH;

  let drawW = w;
  let drawH = h;

  if (fit === 'cover') {
    if (srcRatio > canvasRatio) {
      drawH = h;
      drawW = h * srcRatio;
    } else {
      drawW = w;
      drawH = w / srcRatio;
    }
  } else {
    if (srcRatio > canvasRatio) {
      drawW = w;
      drawH = w / srcRatio;
    } else {
      drawH = h;
      drawW = h * srcRatio;
    }
  }

  drawW *= scale;
  drawH *= scale;

  const x = (w - drawW) * 0.5 + offsetX * w * 0.5;
  const y = (h - drawH) * 0.5 + offsetY * h * 0.5;

  ctx.save();
  ctx.filter = `contrast(${contrast.toFixed(2)}) ${invert ? 'invert(1)' : ''}`.trim();
  ctx.drawImage(source, x, y, drawW, drawH);
  ctx.restore();
}

function drawEditorialAccents(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  params: StudioParams
) {
  const minDim = Math.min(w, h);
  const accentColor = params.typography.gridColor || '#FF4D00';
  const isLightPaper = params.media.substrateKind === 'grid_paper' || params.media.substrateKind === 'singularity';
  const subtleStroke = isLightPaper ? 'rgba(15, 15, 20, 0.25)' : 'rgba(255, 255, 255, 0.34)';
  const subtleFill = isLightPaper ? 'rgba(15, 15, 20, 0.78)' : 'rgba(255, 255, 255, 0.74)';

  ctx.save();

  // Technical Swiss Engineering Grid (Ref: image_5c102fae)
  if (params.typography.technicalGrid) {
    ctx.strokeStyle = subtleStroke;
    ctx.lineWidth = Math.max(1, minDim * 0.0014);
    const step = minDim / 5;
    for (let x = step; x < w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = step; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }

  // 3D Horizon Perspective Grid (Top + Bottom wireframe planes, Ref: image_306fed3e)
  if (params.typography.perspectiveGrid) {
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = Math.max(1.4, minDim * 0.0024);

    const horizonTop = h * 0.22;
    const horizonBot = h * 0.78;
    const cx = w * 0.5;

    // Converging rays
    for (let i = -8; i <= 8; i++) {
      const spreadX = cx + i * (w * 0.14);
      // Top ceiling plane
      ctx.beginPath();
      ctx.moveTo(cx + i * (w * 0.03), horizonTop);
      ctx.lineTo(spreadX, 0);
      ctx.stroke();
      // Bottom floor plane
      ctx.beginPath();
      ctx.moveTo(cx + i * (w * 0.03), horizonBot);
      ctx.lineTo(spreadX, h);
      ctx.stroke();
    }

    // Horizontal perspective rungs
    const rungs = 5;
    for (let r = 0; r <= rungs; r++) {
      const p = Math.pow(r / rungs, 1.8);
      const yTop = horizonTop * (1 - p);
      const yBot = horizonBot + (h - horizonBot) * p;
      ctx.beginPath();
      ctx.moveTo(0, yTop);
      ctx.lineTo(w, yTop);
      ctx.moveTo(0, yBot);
      ctx.lineTo(w, yBot);
      ctx.stroke();
    }
  }

  // Orbital Ring Accent
  if (params.typography.ringAccent) {
    ctx.strokeStyle = subtleStroke;
    ctx.lineWidth = Math.max(1.2, minDim * 0.0022);
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.5, minDim * 0.36, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 4-Point Starburst Emblem (Ref: image_a8d103c6)
  if (params.typography.starAccent) {
    const sx = w * 0.2;
    const sy = h * 0.22;
    const outer = minDim * 0.11;
    const inner = outer * 0.22;
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const px = sx + Math.cos(a) * r;
      const py = sy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  // Registration Crosshairs
  if (params.typography.gridCrosshairs) {
    ctx.strokeStyle = subtleStroke;
    const pad = minDim * 0.045;
    const arm = minDim * 0.018;
    ctx.lineWidth = Math.max(1, minDim * 0.0018);

    const corners = [
      [pad, pad],
      [w - pad, pad],
      [pad, h - pad],
      [w - pad, h - pad],
    ];
    for (const [cx, cy] of corners) {
      ctx.beginPath();
      ctx.moveTo(cx - arm, cy);
      ctx.lineTo(cx + arm, cy);
      ctx.moveTo(cx, cy - arm);
      ctx.lineTo(cx, cy + arm);
      ctx.stroke();
    }
  }

  // Corner Micro-Typography
  const microSize = Math.max(10, Math.round(minDim * 0.017));
  ctx.font = `500 ${microSize}px "JetBrains Mono", monospace`;
  ctx.fillStyle = subtleFill;
  ctx.textBaseline = 'top';

  const pad = minDim * 0.055;
  if (params.typography.subtextTop.trim()) {
    ctx.textAlign = 'left';
    ctx.fillText(params.typography.subtextTop.toUpperCase(), pad, pad);
  }
  if (params.typography.subtextBottom.trim()) {
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'right';
    ctx.fillText(params.typography.subtextBottom.toUpperCase(), w - pad, h - pad);
  }

  ctx.restore();
}

function drawTypographyLayer(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  params: StudioParams,
  timeSec: number
) {
  const {
    text,
    fontFamily,
    fontWeight,
    fontSize,
    letterSpacing,
    lineHeight,
    align,
    blendMode,
    color,
    echoCount,
    echoOffsetX,
    echoOffsetY,
    perspectiveCurve,
  } = params.typography;

  if (!text.trim()) return;

  const lines = text.split('\n');
  const minDim = Math.min(w, h);
  const pxSize = Math.max(16, (fontSize / 100) * minDim);
  const trackingPx = letterSpacing * pxSize;
  const lineStep = pxSize * lineHeight;
  const totalHeight = lines.length * lineStep;
  const startY = (h - totalHeight) * 0.5 + lineStep * 0.5;

  let anchorX = w * 0.5;
  if (align === 'left') anchorX = w * 0.08;
  else if (align === 'right') anchorX = w * 0.92;

  const renderTextBlock = (
    targetCtx: CanvasRenderingContext2D,
    dx: number,
    dy: number,
    alpha: number,
    strokeOnly: boolean
  ) => {
    targetCtx.save();
    targetCtx.globalAlpha = alpha;
    targetCtx.font = `${fontWeight} ${pxSize}px "${fontFamily}", sans-serif`;
    targetCtx.textBaseline = 'middle';
    targetCtx.fillStyle = color;
    targetCtx.strokeStyle = color;
    targetCtx.lineWidth = Math.max(1.5, pxSize * 0.015);

    for (let i = 0; i < lines.length; i++) {
      const y = startY + i * lineStep + dy;
      if (strokeOnly) {
        targetCtx.textAlign = align;
        targetCtx.strokeText(lines[i], anchorX + dx, y);
      } else {
        drawTextWithTracking(
          targetCtx,
          lines[i],
          anchorX + dx,
          y,
          trackingPx,
          align
        );
      }
    }
    targetCtx.restore();
  };

  const needsWarp = Math.abs(perspectiveCurve) > 0.02;
  const waveShift =
    params.animation.playing || params.animation.motionWave > 0
      ? Math.sin(timeSec * params.animation.speed * 1.4) *
        params.animation.motionWave *
        8
      : 0;

  ctx.save();
  ctx.globalCompositeOperation =
    blendMode === 'normal' ? 'source-over' : blendMode;

  if (!needsWarp) {
    for (let e = echoCount; e >= 1; e--) {
      const frac = e / Math.max(1, echoCount);
      const alpha = Math.max(0.08, (1 - frac * 0.78) * 0.52);
      const ex = (echoOffsetX / 100) * minDim * 0.14 * e + waveShift * e * 0.5;
      const ey = (echoOffsetY / 100) * minDim * 0.14 * e;
      renderTextBlock(ctx, ex, ey, alpha, e % 2 === 1 && echoCount >= 4);
    }
    renderTextBlock(ctx, 0, 0, 1, false);
  } else {
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = w;
    tmpCanvas.height = h;
    const tmpCtx = tmpCanvas.getContext('2d');
    if (tmpCtx) {
      for (let e = echoCount; e >= 1; e--) {
        const frac = e / Math.max(1, echoCount);
        const alpha = Math.max(0.1, (1 - frac * 0.75) * 0.55);
        const ex = (echoOffsetX / 100) * minDim * 0.14 * e + waveShift * e * 0.5;
        const ey = (echoOffsetY / 100) * minDim * 0.14 * e;
        renderTextBlock(tmpCtx, ex, ey, alpha, e % 2 === 1 && echoCount >= 4);
      }
      renderTextBlock(tmpCtx, 0, 0, 1, false);

      const strips = 48;
      const stripH = h / strips;
      for (let s = 0; s < strips; s++) {
        const ny = (s / (strips - 1)) * 2 - 1;
        const curve = Math.cos(ny * Math.PI * 0.48);
        const scaleX = 1 + perspectiveCurve * (curve - 0.5) * 0.55;
        const shiftX = perspectiveCurve * Math.sin(ny * Math.PI * 0.75) * minDim * 0.14;
        const destW = Math.max(10, w * scaleX);
        const destX = (w - destW) * 0.5 + shiftX;

        ctx.drawImage(
          tmpCanvas,
          0,
          s * stripH,
          w,
          stripH + 1,
          destX,
          s * stripH,
          destW,
          stripH + 1
        );
      }
    }
  }

  ctx.restore();
}

export function renderComposition2D(
  targetCanvas: HTMLCanvasElement,
  params: StudioParams,
  mediaElement: HTMLImageElement | HTMLVideoElement | null,
  timeSec: number
): void {
  const w = Math.max(64, Math.round(params.canvas.width));
  const h = Math.max(64, Math.round(params.canvas.height));

  if (targetCanvas.width !== w || targetCanvas.height !== h) {
    targetCanvas.width = w;
    targetCanvas.height = h;
  }

  const ctx = targetCanvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, w, h);

  if (params.media.sourceType !== 'substrate' && mediaElement) {
    drawUploadedMedia(ctx, w, h, params, mediaElement);
  } else {
    drawSubstrate(ctx, w, h, params, timeSec);
  }

  drawEditorialAccents(ctx, w, h, params);
  drawTypographyLayer(ctx, w, h, params, timeSec);
}
