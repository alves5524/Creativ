import { MockupParams, MockupTemplateMeta } from '../types/mockup';

export const MOCKUP_TEMPLATES: MockupTemplateMeta[] = [
  {
    id: 'framed_poster',
    name: 'Gallery Frame',
    category: 'Print',
    description: 'Brutalist gallery frame with directional shadow & passe-partout option',
    defaultBackdrop: '#1A1B1F',
    defaultObject: '#0D0D10',
    defaultMaterial: 'matte',
  },
  {
    id: 'wheatpaste_wall',
    name: 'Wheatpaste Poster',
    category: 'Street',
    description: 'Concrete wall paste-up with paper crease highlights & edge wear',
    defaultBackdrop: '#27272A',
    defaultObject: '#E4E4E7',
    defaultMaterial: 'matte',
  },
  {
    id: 'vinyl_sleeve',
    name: '12" Vinyl Sleeve',
    category: 'Music',
    description: 'Square LP jacket with sliding vinyl record & concentric groove sheen',
    defaultBackdrop: '#141519',
    defaultObject: '#0A0A0C',
    defaultMaterial: 'glossy',
  },
  {
    id: 'heavyweight_tee',
    name: 'Heavyweight Tee',
    category: 'Apparel',
    description: 'Boxy streetwear t-shirt with chest print & organic cotton fold shading',
    defaultBackdrop: '#18181B',
    defaultObject: '#111114',
    defaultMaterial: 'cotton',
  },
  {
    id: 'canvas_tote',
    name: 'Canvas Tote Bag',
    category: 'Apparel',
    description: 'Woven cotton tote with stitched straps & soft ambient drop shadow',
    defaultBackdrop: '#1E1F24',
    defaultObject: '#EAE6DF',
    defaultMaterial: 'cotton',
  },
  {
    id: 'obsidian_phone',
    name: 'Obsidian Device',
    category: 'Digital',
    description: 'Titanium smartphone frame with OLED glass glare for motion previews',
    defaultBackdrop: '#0C0D10',
    defaultObject: '#1C1D22',
    defaultMaterial: 'oled',
  },
  {
    id: 'zine_spread',
    name: 'Editorial Zine',
    category: 'Print',
    description: 'Open monograph spread with center spine gutter & soft page curl',
    defaultBackdrop: '#17181C',
    defaultObject: '#F4F3EF',
    defaultMaterial: 'matte',
  },
];

export const DEFAULT_MOCKUP_PARAMS: MockupParams = {
  template: 'framed_poster',
  backdropColor: '#1A1B1F',
  objectColor: '#0D0D10',
  frameStyle: 'black',
  material: 'matte',
  artworkScale: 1.0,
  artworkOffsetX: 0,
  artworkOffsetY: 0,
  shadowDepth: 0.72,
  surfaceTexture: 0.45,
  specularSheen: 0.35,
  lightAngle: 315,
  vignette: 0.42,
  outputWidth: 1600,
  outputHeight: 1600,
};

function drawArtworkInRect(
  ctx: CanvasRenderingContext2D,
  artwork: HTMLCanvasElement | HTMLImageElement,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
  params: MockupParams,
  blendMode: GlobalCompositeOperation = 'source-over'
) {
  const artW = artwork instanceof HTMLImageElement ? artwork.naturalWidth : artwork.width;
  const artH = artwork instanceof HTMLImageElement ? artwork.naturalHeight : artwork.height;
  if (!artW || !artH) return;

  ctx.save();
  ctx.beginPath();
  ctx.rect(rx, ry, rw, rh);
  ctx.clip();

  const rectRatio = rw / rh;
  const artRatio = artW / artH;

  let drawW = rw;
  let drawH = rh;
  if (artRatio > rectRatio) {
    drawH = rh;
    drawW = rh * artRatio;
  } else {
    drawW = rw;
    drawH = rw / artRatio;
  }

  drawW *= params.artworkScale;
  drawH *= params.artworkScale;

  const dx = rx + (rw - drawW) * 0.5 + params.artworkOffsetX * rw;
  const dy = ry + (rh - drawH) * 0.5 + params.artworkOffsetY * rh;

  ctx.globalCompositeOperation = blendMode;
  ctx.drawImage(artwork, dx, dy, drawW, drawH);
  ctx.restore();
}

function drawNoiseOverlay(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  intensity: number,
  seedOffset = 0
) {
  if (intensity <= 0.01) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  // Subtle deterministic paper/cotton/concrete micro-texture lines & specks
  const count = Math.round(140 * intensity);
  for (let i = 0; i < count; i++) {
    const px = x + ((Math.sin((i + seedOffset) * 12.9898) * 43758.5453) % 1 + 1) % 1 * w;
    const py = y + ((Math.sin((i + seedOffset) * 78.233) * 43758.5453) % 1 + 1) % 1 * h;
    ctx.fillStyle = i % 2 === 0
      ? `rgba(255,255,255,${0.06 * intensity})`
      : `rgba(0,0,0,${0.09 * intensity})`;
    ctx.fillRect(px, py, 2, 2);
  }
  ctx.restore();
}

function drawSpecularSheen(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  strength: number,
  angleDeg: number
) {
  if (strength <= 0.01) return;
  const rad = (angleDeg * Math.PI) / 180;
  const gx = Math.cos(rad) * w * 0.5;
  const gy = Math.sin(rad) * h * 0.5;
  const cx = x + w * 0.5;
  const cy = y + h * 0.5;

  const grad = ctx.createLinearGradient(cx - gx, cy - gy, cx + gx, cy + gy);
  grad.addColorStop(0, `rgba(255,255,255,${0.26 * strength})`);
  grad.addColorStop(0.32, `rgba(255,255,255,${0.06 * strength})`);
  grad.addColorStop(0.45, 'rgba(255,255,255,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.08)');

  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

export function renderMockupScene(
  targetCanvas: HTMLCanvasElement,
  artwork: HTMLCanvasElement | HTMLImageElement | null,
  params: MockupParams
): void {
  const w = params.outputWidth;
  const h = params.outputHeight;
  if (targetCanvas.width !== w || targetCanvas.height !== h) {
    targetCanvas.width = w;
    targetCanvas.height = h;
  }

  const ctx = targetCanvas.getContext('2d');
  if (!ctx) return;

  const minDim = Math.min(w, h);
  const lightRad = (params.lightAngle * Math.PI) / 180;
  const shadowDirX = -Math.cos(lightRad) * minDim * 0.032 * params.shadowDepth;
  const shadowDirY = -Math.sin(lightRad) * minDim * 0.032 * params.shadowDepth;

  // 1. Studio Backdrop + Directional Light Gradient
  ctx.fillStyle = params.backdropColor;
  ctx.fillRect(0, 0, w, h);

  const lx = w * 0.5 + Math.cos(lightRad) * w * 0.35;
  const ly = h * 0.5 + Math.sin(lightRad) * h * 0.35;
  const roomLight = ctx.createRadialGradient(lx, ly, minDim * 0.05, w * 0.5, h * 0.5, minDim * 0.9);
  roomLight.addColorStop(0, 'rgba(255,255,255,0.12)');
  roomLight.addColorStop(0.6, 'rgba(255,255,255,0.02)');
  roomLight.addColorStop(1, `rgba(0,0,0,${0.48 * params.vignette})`);
  ctx.fillStyle = roomLight;
  ctx.fillRect(0, 0, w, h);

  drawNoiseOverlay(ctx, 0, 0, w, h, params.surfaceTexture * 0.65, 11);

  if (!artwork) return;

  // 2. Render Selected Mockup Scene
  if (params.template === 'framed_poster') {
    const posterW = minDim * 0.54;
    const posterH = minDim * 0.72;
    const px = (w - posterW) * 0.5;
    const py = (h - posterH) * 0.5;
    const frameThick = params.frameStyle === 'frameless' ? 0 : minDim * 0.024;
    const matThick = params.frameStyle === 'frameless' ? 0 : minDim * 0.035;

    // Cast Wall Shadow
    ctx.save();
    ctx.shadowColor = `rgba(0,0,0,${0.72 * params.shadowDepth})`;
    ctx.shadowBlur = minDim * 0.065;
    ctx.shadowOffsetX = shadowDirX;
    ctx.shadowOffsetY = shadowDirY + minDim * 0.02;
    ctx.fillStyle = '#000';
    ctx.fillRect(px - frameThick, py - frameThick, posterW + frameThick * 2, posterH + frameThick * 2);
    ctx.restore();

    // Frame Bezel
    if (params.frameStyle !== 'frameless') {
      const frameColors = {
        black: '#121316',
        aluminum: '#9CA3AF',
        oak: '#8C6239',
      };
      ctx.fillStyle = frameColors[params.frameStyle];
      ctx.fillRect(
        px - frameThick,
        py - frameThick,
        posterW + frameThick * 2,
        posterH + frameThick * 2
      );

      // Inner frame bevel
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = Math.max(1, minDim * 0.002);
      ctx.strokeRect(
        px - frameThick + 1,
        py - frameThick + 1,
        posterW + frameThick * 2 - 2,
        posterH + frameThick * 2 - 2
      );
    }

    // Passe-partout mat board
    ctx.fillStyle = '#F2F0EB';
    ctx.fillRect(px, py, posterW, posterH);

    // Artwork print area
    const ax = px + matThick;
    const ay = py + matThick;
    const aw = posterW - matThick * 2;
    const ah = posterH - matThick * 2;

    drawArtworkInRect(ctx, artwork, ax, ay, aw, ah, params);
    drawNoiseOverlay(ctx, ax, ay, aw, ah, params.surfaceTexture * 0.5, 29);

    if (params.material === 'glossy' || params.material === 'oled') {
      drawSpecularSheen(ctx, px, py, posterW, posterH, params.specularSheen, params.lightAngle);
    }
  } else if (params.template === 'wheatpaste_wall') {
    const posterW = minDim * 0.62;
    const posterH = minDim * 0.8;
    const px = (w - posterW) * 0.5;
    const py = (h - posterH) * 0.5;

    // Subtle paste-up edge lift shadow
    ctx.save();
    ctx.shadowColor = `rgba(0,0,0,${0.65 * params.shadowDepth})`;
    ctx.shadowBlur = minDim * 0.03;
    ctx.shadowOffsetX = shadowDirX * 0.4;
    ctx.shadowOffsetY = shadowDirY * 0.4;
    ctx.fillStyle = '#EAEAEA';
    ctx.fillRect(px, py, posterW, posterH);
    ctx.restore();

    drawArtworkInRect(ctx, artwork, px, py, posterW, posterH, params);

    // Paper fold creases (diagonal & horizontal wheatpaste wrinkles)
    ctx.save();
    ctx.beginPath();
    ctx.rect(px, py, posterW, posterH);
    ctx.clip();

    const folds = [
      [px, py + posterH * 0.28, px + posterW, py + posterH * 0.34],
      [px, py + posterH * 0.66, px + posterW, py + posterH * 0.61],
      [px + posterW * 0.42, py, px + posterW * 0.49, py + posterH],
    ];
    for (const [x1, y1, x2, y2] of folds) {
      const fg = ctx.createLinearGradient(x1, y1 - 8, x1, y1 + 10);
      fg.addColorStop(0, 'rgba(0,0,0,0)');
      fg.addColorStop(0.45, `rgba(0,0,0,${0.22 * params.surfaceTexture})`);
      fg.addColorStop(0.55, `rgba(255,255,255,${0.2 * params.surfaceTexture})`);
      fg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.strokeStyle = fg;
      ctx.lineWidth = minDim * 0.012;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.restore();

    drawNoiseOverlay(ctx, px, py, posterW, posterH, params.surfaceTexture, 41);
  } else if (params.template === 'vinyl_sleeve') {
    const sleeveSize = minDim * 0.56;
    const sx = w * 0.38 - sleeveSize * 0.5;
    const sy = (h - sleeveSize) * 0.5;
    const discRadius = sleeveSize * 0.46;
    const discCx = sx + sleeveSize * 0.94;
    const discCy = sy + sleeveSize * 0.5;

    // Vinyl Disc Shadow + Disc Body
    ctx.save();
    ctx.shadowColor = `rgba(0,0,0,${0.7 * params.shadowDepth})`;
    ctx.shadowBlur = minDim * 0.05;
    ctx.shadowOffsetX = shadowDirX * 0.7;
    ctx.shadowOffsetY = shadowDirY * 0.7;
    ctx.fillStyle = '#09090B';
    ctx.beginPath();
    ctx.arc(discCx, discCy, discRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Vinyl Grooves + Anisotropic Specular Sheen
    ctx.save();
    ctx.beginPath();
    ctx.arc(discCx, discCy, discRadius, 0, Math.PI * 2);
    ctx.clip();

    const grooveGrad = ctx.createConicGradient(lightRad, discCx, discCy);
    grooveGrad.addColorStop(0, 'rgba(255,255,255,0.02)');
    grooveGrad.addColorStop(0.15, `rgba(255,255,255,${0.28 * params.specularSheen})`);
    grooveGrad.addColorStop(0.3, 'rgba(255,255,255,0.02)');
    grooveGrad.addColorStop(0.65, `rgba(255,255,255,${0.22 * params.specularSheen})`);
    grooveGrad.addColorStop(0.8, 'rgba(255,255,255,0.02)');
    grooveGrad.addColorStop(1, 'rgba(255,255,255,0.02)');
    ctx.fillStyle = grooveGrad;
    ctx.fillRect(discCx - discRadius, discCy - discRadius, discRadius * 2, discRadius * 2);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let r = discRadius * 0.36; r < discRadius * 0.96; r += minDim * 0.008) {
      ctx.beginPath();
      ctx.arc(discCx, discCy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Center label using artwork crop
    ctx.beginPath();
    ctx.arc(discCx, discCy, discRadius * 0.32, 0, Math.PI * 2);
    ctx.clip();
    drawArtworkInRect(
      ctx,
      artwork,
      discCx - discRadius * 0.32,
      discCy - discRadius * 0.32,
      discRadius * 0.64,
      discRadius * 0.64,
      params
    );
    // Spindle hole
    ctx.fillStyle = params.backdropColor;
    ctx.beginPath();
    ctx.arc(discCx, discCy, discRadius * 0.04, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Sleeve Shadow + Jacket
    ctx.save();
    ctx.shadowColor = `rgba(0,0,0,${0.8 * params.shadowDepth})`;
    ctx.shadowBlur = minDim * 0.06;
    ctx.shadowOffsetX = shadowDirX;
    ctx.shadowOffsetY = shadowDirY;
    ctx.fillStyle = params.objectColor;
    ctx.fillRect(sx, sy, sleeveSize, sleeveSize);
    ctx.restore();

    drawArtworkInRect(ctx, artwork, sx, sy, sleeveSize, sleeveSize, params);

    // Subtle ringwear & spine crease
    ctx.save();
    ctx.strokeStyle = `rgba(255,255,255,${0.08 * params.surfaceTexture})`;
    ctx.lineWidth = minDim * 0.008;
    ctx.beginPath();
    ctx.arc(sx + sleeveSize * 0.5, sy + sleeveSize * 0.5, sleeveSize * 0.45, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(sx + sleeveSize * 0.015, sy, minDim * 0.003, sleeveSize);
    ctx.restore();

    drawSpecularSheen(ctx, sx, sy, sleeveSize, sleeveSize, params.specularSheen * 0.7, params.lightAngle);
  } else if (params.template === 'heavyweight_tee') {
    const cx = w * 0.5;
    const cy = h * 0.52;
    const bodyW = minDim * 0.44;
    const bodyH = minDim * 0.64;

    const traceTeePath = () => {
      ctx.beginPath();
      // Left collar to shoulder
      ctx.moveTo(cx - bodyW * 0.22, cy - bodyH * 0.5);
      ctx.quadraticCurveTo(cx, cy - bodyH * 0.39, cx + bodyW * 0.22, cy - bodyH * 0.5);
      // Right shoulder & sleeve
      ctx.lineTo(cx + bodyW * 0.52, cy - bodyH * 0.43);
      ctx.lineTo(cx + bodyW * 0.84, cy - bodyH * 0.16);
      ctx.lineTo(cx + bodyW * 0.65, cy + bodyH * 0.04);
      ctx.lineTo(cx + bodyW * 0.5, cy - bodyH * 0.12);
      // Right torso down to hem
      ctx.lineTo(cx + bodyW * 0.52, cy + bodyH * 0.5);
      ctx.lineTo(cx - bodyW * 0.52, cy + bodyH * 0.5);
      // Left torso up to armpit
      ctx.lineTo(cx - bodyW * 0.5, cy - bodyH * 0.12);
      ctx.lineTo(cx - bodyW * 0.65, cy + bodyH * 0.04);
      ctx.lineTo(cx - bodyW * 0.84, cy - bodyH * 0.16);
      ctx.lineTo(cx - bodyW * 0.52, cy - bodyH * 0.43);
      ctx.closePath();
    };

    // Garment shadow
    ctx.save();
    ctx.shadowColor = `rgba(0,0,0,${0.75 * params.shadowDepth})`;
    ctx.shadowBlur = minDim * 0.06;
    ctx.shadowOffsetX = shadowDirX;
    ctx.shadowOffsetY = shadowDirY;
    traceTeePath();
    ctx.fillStyle = params.objectColor;
    ctx.fill();
    ctx.restore();

    ctx.save();
    traceTeePath();
    ctx.clip();

    // Chest artwork print area
    const printW = bodyW * 0.62;
    const printH = bodyH * 0.5;
    const printX = cx - printW * 0.5;
    const printY = cy - bodyH * 0.28;
    drawArtworkInRect(ctx, artwork, printX, printY, printW, printH, params);

    // Ribbed collar detail
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = minDim * 0.012;
    ctx.beginPath();
    ctx.moveTo(cx - bodyW * 0.22, cy - bodyH * 0.5);
    ctx.quadraticCurveTo(cx, cy - bodyH * 0.38, cx + bodyW * 0.22, cy - bodyH * 0.5);
    ctx.stroke();

    // Soft cotton drape folds over torso & print
    for (let f = -2; f <= 2; f++) {
      const fx = cx + f * bodyW * 0.16;
      const fg = ctx.createLinearGradient(fx - bodyW * 0.06, 0, fx + bodyW * 0.06, 0);
      fg.addColorStop(0, 'rgba(0,0,0,0)');
      fg.addColorStop(0.5, `rgba(0,0,0,${0.18 * params.surfaceTexture})`);
      fg.addColorStop(1, 'rgba(255,255,255,0.04)');
      ctx.fillStyle = fg;
      ctx.fillRect(fx - bodyW * 0.06, cy - bodyH * 0.45, bodyW * 0.12, bodyH);
    }

    drawNoiseOverlay(ctx, cx - bodyW, cy - bodyH * 0.5, bodyW * 2, bodyH, params.surfaceTexture * 0.7, 57);
    ctx.restore();
  } else if (params.template === 'canvas_tote') {
    const bagW = minDim * 0.52;
    const bagH = minDim * 0.56;
    const bx = (w - bagW) * 0.5;
    const by = h * 0.58 - bagH * 0.5;

    // Woven Handles
    ctx.save();
    ctx.strokeStyle = params.objectColor;
    ctx.lineWidth = minDim * 0.032;
    ctx.lineCap = 'round';
    ctx.shadowColor = `rgba(0,0,0,${0.55 * params.shadowDepth})`;
    ctx.shadowBlur = minDim * 0.03;
    ctx.shadowOffsetX = shadowDirX * 0.5;
    ctx.shadowOffsetY = shadowDirY * 0.5;
    ctx.beginPath();
    ctx.moveTo(bx + bagW * 0.25, by + minDim * 0.02);
    ctx.bezierCurveTo(
      bx + bagW * 0.24,
      by - bagH * 0.42,
      bx + bagW * 0.76,
      by - bagH * 0.42,
      bx + bagW * 0.75,
      by + minDim * 0.02
    );
    ctx.stroke();
    ctx.restore();

    // Tote Body
    ctx.save();
    ctx.shadowColor = `rgba(0,0,0,${0.72 * params.shadowDepth})`;
    ctx.shadowBlur = minDim * 0.06;
    ctx.shadowOffsetX = shadowDirX;
    ctx.shadowOffsetY = shadowDirY;
    ctx.fillStyle = params.objectColor;
    ctx.fillRect(bx, by, bagW, bagH);
    ctx.restore();

    const printPad = bagW * 0.12;
    drawArtworkInRect(
      ctx,
      artwork,
      bx + printPad,
      by + printPad,
      bagW - printPad * 2,
      bagH - printPad * 2,
      params
    );

    // Top stitched seam
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx + 6, by + minDim * 0.025, bagW - 12, 1);
    ctx.restore();

    drawNoiseOverlay(ctx, bx, by, bagW, bagH, params.surfaceTexture * 0.85, 73);
  } else if (params.template === 'obsidian_phone') {
    const phoneW = minDim * 0.38;
    const phoneH = minDim * 0.78;
    const px = (w - phoneW) * 0.5;
    const py = (h - phoneH) * 0.5;
    const radius = minDim * 0.055;
    const bezel = minDim * 0.015;

    const roundRectPath = (x: number, y: number, rw: number, rh: number, r: number) => {
      ctx.beginPath();
      ctx.roundRect(x, y, rw, rh, r);
    };

    // Titanium Chassis Shadow + Body
    ctx.save();
    ctx.shadowColor = `rgba(0,0,0,${0.85 * params.shadowDepth})`;
    ctx.shadowBlur = minDim * 0.075;
    ctx.shadowOffsetX = shadowDirX;
    ctx.shadowOffsetY = shadowDirY + minDim * 0.02;
    roundRectPath(px, py, phoneW, phoneH, radius);
    ctx.fillStyle = params.objectColor;
    ctx.fill();
    ctx.restore();

    // Metallic rim highlight
    ctx.save();
    roundRectPath(px, py, phoneW, phoneH, radius);
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // OLED Screen Clip
    ctx.save();
    roundRectPath(
      px + bezel,
      py + bezel,
      phoneW - bezel * 2,
      phoneH - bezel * 2,
      radius - bezel * 0.65
    );
    ctx.clip();

    drawArtworkInRect(
      ctx,
      artwork,
      px + bezel,
      py + bezel,
      phoneW - bezel * 2,
      phoneH - bezel * 2,
      params
    );

    // Dynamic Island Pill
    const islandW = phoneW * 0.28;
    const islandH = minDim * 0.022;
    ctx.fillStyle = '#050507';
    ctx.beginPath();
    ctx.roundRect(
      px + (phoneW - islandW) * 0.5,
      py + bezel + minDim * 0.014,
      islandW,
      islandH,
      islandH * 0.5
    );
    ctx.fill();

    drawSpecularSheen(
      ctx,
      px + bezel,
      py + bezel,
      phoneW - bezel * 2,
      phoneH - bezel * 2,
      params.specularSheen,
      params.lightAngle
    );
    ctx.restore();
  } else if (params.template === 'zine_spread') {
    const spreadW = minDim * 0.78;
    const spreadH = minDim * 0.54;
    const sx = (w - spreadW) * 0.5;
    const sy = (h - spreadH) * 0.5;

    ctx.save();
    ctx.shadowColor = `rgba(0,0,0,${0.78 * params.shadowDepth})`;
    ctx.shadowBlur = minDim * 0.06;
    ctx.shadowOffsetX = shadowDirX;
    ctx.shadowOffsetY = shadowDirY;
    ctx.fillStyle = params.objectColor;
    ctx.fillRect(sx, sy, spreadW, spreadH);
    ctx.restore();

    const pageW = spreadW * 0.5;
    // Left page: editorial metadata sheet, Right page: full-bleed artwork (or full spread)
    drawArtworkInRect(ctx, artwork, sx, sy, spreadW, spreadH, params);

    // Center Spine Gutter Shading
    const spineGrad = ctx.createLinearGradient(
      sx + pageW - minDim * 0.045,
      sy,
      sx + pageW + minDim * 0.045,
      sy
    );
    spineGrad.addColorStop(0, 'rgba(0,0,0,0)');
    spineGrad.addColorStop(0.46, 'rgba(0,0,0,0.42)');
    spineGrad.addColorStop(0.5, 'rgba(0,0,0,0.62)');
    spineGrad.addColorStop(0.55, 'rgba(255,255,255,0.14)');
    spineGrad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = spineGrad;
    ctx.fillRect(sx + pageW - minDim * 0.045, sy, minDim * 0.09, spreadH);

    drawNoiseOverlay(ctx, sx, sy, spreadW, spreadH, params.surfaceTexture * 0.6, 91);
  }
}
