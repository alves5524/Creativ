import { BUILTIN_GOOGLE_FONTS, THERMAL_PALETTES } from '../data/presets';
import {
  FontEntry,
  MotionBlurMode,
  StudioParams,
  SubstrateKind,
  ThermalPaletteId,
  TypographyBlendMode,
} from '../types/studio';

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function jitter(value: number, range: number, min: number, max: number): number {
  const delta = (Math.random() * 2 - 1) * range;
  return clamp(Number((value + delta).toFixed(2)), min, max);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Gentle Randomize: keeps the user's font, text, media, and core blur/thermal identity,
 * while subtly shifting angles, thermal bias, aberration, grain, melt, and echo offsets.
 */
export function gentleRandomize(current: StudioParams): StudioParams {
  const paletteIds = Object.keys(THERMAL_PALETTES).filter(
    (k) => k !== 'custom'
  ) as ThermalPaletteId[];

  const maybeShiftPalette =
    Math.random() < 0.35 ? pick(paletteIds) : current.thermal.palette;

  return {
    ...current,
    media: {
      ...current.media,
      contrast: jitter(current.media.contrast, 0.25, 0.7, 2.0),
    },
    typography: {
      ...current.typography,
      letterSpacing: jitter(current.typography.letterSpacing, 0.04, -0.1, 0.25),
      echoOffsetX: Math.round(jitter(current.typography.echoOffsetX, 12, -50, 50)),
      echoOffsetY: Math.round(jitter(current.typography.echoOffsetY, 12, -50, 50)),
      perspectiveCurve: jitter(current.typography.perspectiveCurve, 0.18, -0.9, 0.9),
    },
    thermal: {
      ...current.thermal,
      palette: maybeShiftPalette,
      intensity: jitter(current.thermal.intensity, 0.18, 0.2, 1.0),
      temperatureBias: jitter(current.thermal.temperatureBias, 0.12, -0.35, 0.35),
      contrast: jitter(current.thermal.contrast, 0.25, 0.7, 2.1),
      isolines: jitter(current.thermal.isolines, 0.15, 0.0, 0.8),
      glow: jitter(current.thermal.glow, 0.18, 0.0, 0.9),
    },
    motionBlur: {
      ...current.motionBlur,
      amount: jitter(current.motionBlur.amount, 0.18, 0.05, 0.85),
      angle: Math.round((current.motionBlur.angle + (Math.random() * 60 - 30) + 360) % 360),
      trailDecay: jitter(current.motionBlur.trailDecay, 0.18, 0.2, 0.95),
      spectralEcho: jitter(current.motionBlur.spectralEcho, 0.2, 0.0, 1.0),
    },
    optics: {
      ...current.optics,
      chromaticAberration: jitter(current.optics.chromaticAberration, 0.22, 0.0, 1.0),
      prismAngle: Math.round((current.optics.prismAngle + (Math.random() * 80 - 40) + 360) % 360),
      displacementAmount: jitter(current.optics.displacementAmount, 0.14, 0.0, 0.75),
      pixelMelt: jitter(current.optics.pixelMelt, 0.15, 0.0, 0.85),
      scanlineMix: jitter(current.optics.scanlineMix, 0.15, 0.0, 0.85),
      bayerDither: jitter(current.optics.bayerDither, 0.15, 0.0, 0.85),
      ditherGrain: jitter(current.optics.ditherGrain, 0.12, 0.05, 0.85),
    },
  };
}

/**
 * Aggressive Randomize: boldly remixes thermal LUTs, motion blur algorithms,
 * optical XOR blend modes, typography fonts/warps, grids, pixel melt, and substrates.
 */
export function aggressiveRandomize(
  current: StudioParams,
  availableFonts: FontEntry[] = BUILTIN_GOOGLE_FONTS
): StudioParams {
  const palettes: ThermalPaletteId[] = [
    'ironbow',
    'inferno',
    'flir_arctic',
    'neon_ir',
    'cobalt_crimson',
    'mono_heat',
    'acid_thermal',
    'amber_xerox',
    'riso_infrared',
  ];
  const blurModes: MotionBlurMode[] = [
    'directional',
    'radial',
    'spin',
    'slit_scan',
    'cross_axis',
    'crt_streak',
  ];
  const blendModes: TypographyBlendMode[] = [
    'difference',
    'exclusion',
    'normal',
    'screen',
    'overlay',
  ];
  const substrates: SubstrateKind[] = [
    'splash_spheres',
    'cobalt_ribbons',
    'liquid_monolith',
    'halftone_field',
    'thermal_gradient',
    'spectral_waves',
    'caustic_sphere',
    'singularity',
    'grid_paper',
  ];
  const bgColors = ['#040406', '#070812', '#0B1CF2', '#0D0409', '#050507', '#EAEAE6'];
  const gridColors = ['#FF4D00', '#FF2A14', '#F43F5E', '#38BDF8', '#FFFFFF'];

  const chosenFont = availableFonts.length > 0 ? pick(availableFonts) : null;
  const chosenWeight = chosenFont
    ? pick(chosenFont.weights)
    : current.typography.fontWeight;

  const chosenMode = pick(blurModes);
  const chosenPalette = pick(palettes);

  return {
    ...current,
    media: {
      ...current.media,
      substrateKind:
        current.media.sourceType === 'substrate'
          ? pick(substrates)
          : current.media.substrateKind,
      contrast: Number((0.9 + Math.random() * 1.1).toFixed(2)),
      invert: Math.random() < 0.22,
      bgColor: pick(bgColors),
    },
    typography: {
      ...current.typography,
      fontFamily: chosenFont ? chosenFont.family : current.typography.fontFamily,
      fontWeight: chosenWeight,
      fontSize: Math.round(16 + Math.random() * 22),
      letterSpacing: Number((-0.07 + Math.random() * 0.18).toFixed(2)),
      lineHeight: Number((0.76 + Math.random() * 0.35).toFixed(2)),
      align: pick(['left', 'center', 'right']),
      blendMode: pick(blendModes),
      echoCount: Math.floor(Math.random() * 9),
      echoOffsetX: Math.round(-45 + Math.random() * 90),
      echoOffsetY: Math.round(-45 + Math.random() * 90),
      perspectiveCurve:
        Math.random() < 0.45 ? Number((-0.75 + Math.random() * 1.5).toFixed(2)) : 0,
      ringAccent: Math.random() < 0.5,
      gridCrosshairs: Math.random() < 0.6,
      technicalGrid: Math.random() < 0.35,
      perspectiveGrid: Math.random() < 0.35,
      starAccent: Math.random() < 0.3,
      gridColor: pick(gridColors),
    },
    thermal: {
      ...current.thermal,
      enabled: Math.random() < 0.9,
      palette: chosenPalette,
      intensity: Number((0.45 + Math.random() * 0.55).toFixed(2)),
      temperatureBias: Number((-0.25 + Math.random() * 0.5).toFixed(2)),
      contrast: Number((0.9 + Math.random() * 1.2).toFixed(2)),
      isolines: Math.random() < 0.45 ? Number((Math.random() * 0.65).toFixed(2)) : 0,
      glow: Number((Math.random() * 0.7).toFixed(2)),
    },
    motionBlur: {
      ...current.motionBlur,
      mode: chosenMode,
      amount: Number((0.15 + Math.random() * 0.72).toFixed(2)),
      angle: Math.floor(Math.random() * 360),
      samples: chosenMode === 'slit_scan' || chosenMode === 'cross_axis' ? 24 : 20,
      slitFrequency: Math.floor(3 + Math.random() * 16),
      trailDecay: Number((0.3 + Math.random() * 0.65).toFixed(2)),
      spectralEcho: Math.random() < 0.45 ? Number((0.2 + Math.random() * 0.8).toFixed(2)) : 0,
    },
    optics: {
      chromaticAberration: Number((0.1 + Math.random() * 0.85).toFixed(2)),
      prismAngle: Math.floor(Math.random() * 360),
      displacementAmount: Number((Math.random() * 0.58).toFixed(2)),
      displacementScale: Number((2.0 + Math.random() * 10.0).toFixed(1)),
      pixelMelt: Math.random() < 0.4 ? Number((0.15 + Math.random() * 0.65).toFixed(2)) : 0,
      scanlineMix: Math.random() < 0.4 ? Number((0.2 + Math.random() * 0.65).toFixed(2)) : 0,
      bayerDither: Math.random() < 0.35 ? Number((0.2 + Math.random() * 0.65).toFixed(2)) : 0,
      ditherGrain: Number((0.12 + Math.random() * 0.65).toFixed(2)),
      grainType: Math.random() < 0.5 ? 'stipple' : 'film',
      halftoneMix: Math.random() < 0.3 ? Number((Math.random() * 0.55).toFixed(2)) : 0,
    },
  };
}
