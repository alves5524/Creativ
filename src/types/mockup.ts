export type MockupTemplateId =
  | 'framed_poster'
  | 'wheatpaste_wall'
  | 'vinyl_sleeve'
  | 'heavyweight_tee'
  | 'canvas_tote'
  | 'obsidian_phone'
  | 'zine_spread';

export type MockupSurfaceMaterial = 'matte' | 'glossy' | 'cotton' | 'oled';

export interface MockupParams {
  template: MockupTemplateId;
  backdropColor: string;
  objectColor: string;
  frameStyle: 'black' | 'aluminum' | 'oak' | 'frameless';
  material: MockupSurfaceMaterial;
  artworkScale: number; // 0.6 to 1.4
  artworkOffsetX: number; // -0.3 to 0.3
  artworkOffsetY: number; // -0.3 to 0.3
  shadowDepth: number; // 0 to 1
  surfaceTexture: number; // 0 to 1
  specularSheen: number; // 0 to 1
  lightAngle: number; // 0 to 360
  vignette: number; // 0 to 1
  outputWidth: number;
  outputHeight: number;
}

export interface MockupTemplateMeta {
  id: MockupTemplateId;
  name: string;
  category: string;
  description: string;
  defaultBackdrop: string;
  defaultObject: string;
  defaultMaterial: MockupSurfaceMaterial;
}
