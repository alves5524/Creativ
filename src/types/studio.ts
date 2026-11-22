export type AspectRatioPreset = '3:4' | '4:5' | '9:16' | '1:1' | '16:9' | 'custom';

export type SubstrateKind =
  | 'splash_spheres'
  | 'cobalt_ribbons'
  | 'liquid_monolith'
  | 'halftone_field'
  | 'thermal_gradient'
  | 'spectral_waves'
  | 'caustic_sphere'
  | 'singularity'
  | 'grid_paper';

export type MediaSourceType = 'substrate' | 'image' | 'video';

export type TypographyBlendMode =
  | 'normal'
  | 'difference'
  | 'exclusion'
  | 'screen'
  | 'overlay';

export type ThermalPaletteId =
  | 'ironbow'
  | 'inferno'
  | 'flir_arctic'
  | 'neon_ir'
  | 'cobalt_crimson'
  | 'mono_heat'
  | 'acid_thermal'
  | 'amber_xerox'
  | 'riso_infrared'
  | 'custom';

export type MotionBlurMode =
  | 'directional'
  | 'radial'
  | 'spin'
  | 'slit_scan'
  | 'cross_axis'
  | 'crt_streak';

export type GrainType = 'film' | 'stipple';

export type FontProvider = 'google' | 'adobe' | 'local';

export interface FontEntry {
  family: string;
  provider: FontProvider;
  category: 'Display' | 'Condensed' | 'Editorial' | 'Gothic' | 'Mono' | 'Custom';
  weights: number[];
}

export interface StudioParams {
  canvas: {
    aspectRatio: AspectRatioPreset;
    width: number;
    height: number;
  };
  media: {
    sourceType: MediaSourceType;
    substrateKind: SubstrateKind;
    mediaUrl: string | null;
    mediaName: string | null;
    fit: 'cover' | 'contain';
    scale: number;
    offsetX: number;
    offsetY: number;
    contrast: number;
    invert: boolean;
    bgColor: string;
  };
  typography: {
    text: string;
    subtextTop: string;
    subtextBottom: string;
    fontFamily: string;
    fontWeight: number;
    fontSize: number; // percentage of canvas min dimension (4 - 45)
    letterSpacing: number; // em (-0.12 to 0.4)
    lineHeight: number; // 0.72 to 1.6
    align: 'left' | 'center' | 'right';
    blendMode: TypographyBlendMode;
    color: string;
    echoCount: number; // 0 to 10
    echoOffsetX: number; // -80 to 80
    echoOffsetY: number; // -80 to 80
    perspectiveCurve: number; // -1 to 1 (cylindrical warp)
    ringAccent: boolean;
    gridCrosshairs: boolean;
    technicalGrid: boolean;
    perspectiveGrid: boolean;
    starAccent: boolean;
    gridColor: string;
  };
  thermal: {
    enabled: boolean;
    palette: ThermalPaletteId;
    intensity: number; // 0 to 1
    temperatureBias: number; // -0.5 to 0.5
    contrast: number; // 0.4 to 2.5
    isolines: number; // 0 to 1
    glow: number; // 0 to 1
    customStops: [string, string, string, string];
  };
  motionBlur: {
    mode: MotionBlurMode;
    amount: number; // 0 to 1
    angle: number; // 0 to 360
    samples: number; // 8 to 32
    slitFrequency: number; // 1 to 24
    trailDecay: number; // 0 to 1
    spectralEcho: number; // 0 to 1 (color separation across motion trail)
  };
  optics: {
    chromaticAberration: number; // 0 to 1
    prismAngle: number; // 0 to 360
    displacementAmount: number; // 0 to 1
    displacementScale: number; // 1 to 16
    pixelMelt: number; // 0 to 1 (vertical smear/melt)
    scanlineMix: number; // 0 to 1 (CRT/scanner horizontal lines)
    bayerDither: number; // 0 to 1 (4x4 ordered matrix dither)
    ditherGrain: number; // 0 to 1
    grainType: GrainType;
    halftoneMix: number; // 0 to 1
  };
  animation: {
    playing: boolean;
    speed: number; // 0.1 to 3
    loopSeconds: number; // 2 to 15
    motionWave: number; // 0 to 1
    thermalPulse: number; // 0 to 1
  };
}

export type PresetCategory = 'Thermal' | 'Kinetic' | 'Experimental';

export interface StudioPreset {
  id: string;
  name: string;
  category: PresetCategory;
  subtitle: string;
  params: StudioParams;
}

export type ExportFormat = 'png' | 'jpeg' | 'svg' | 'video';

export interface ExportSettings {
  format: ExportFormat;
  scale: 1 | 2 | 4;
  jpegQuality: number;
  fps: 24 | 30 | 60;
  durationSeconds: number;
}
