import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Download,
  Film,
  Pause,
  Play,
  RotateCcw,
  Upload,
} from 'lucide-react';
import { renderComposition2D } from '../engine/composition2d';
import { getBestSupportedVideoMime } from '../engine/exporter';
import {
  DEFAULT_MOCKUP_PARAMS,
  MOCKUP_TEMPLATES,
  renderMockupScene,
} from '../engine/mockupRenderer';
import { WebGLThermalRenderer } from '../engine/webglRenderer';
import {
  MockupParams,
  MockupSurfaceMaterial,
  MockupTemplateId,
} from '../types/mockup';
import { StudioParams } from '../types/studio';
import { StudioSlider } from './StudioSlider';

interface MockupStudioProps {
  studioParams: StudioParams;
  mediaElement: HTMLImageElement | HTMLVideoElement | null;
  onToggleStudioPlay: () => void;
  onBackToStudio: () => void;
}

export const MockupStudio: React.FC<MockupStudioProps> = ({
  studioParams,
  mediaElement,
  onToggleStudioPlay,
  onBackToStudio,
}) => {
  const [mockupParams, setMockupParams] = useState<MockupParams>(DEFAULT_MOCKUP_PARAMS);
  const [artworkMode, setArtworkMode] = useState<'live' | 'custom'>('live');
  const [customArtImg, setCustomArtImg] = useState<HTMLImageElement | null>(null);
  const [customArtName, setCustomArtName] = useState<string | null>(null);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);

  const visibleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const customInputRef = useRef<HTMLInputElement | null>(null);

  const studioParamsRef = useRef(studioParams);
  const mediaRef = useRef(mediaElement);
  const mockupParamsRef = useRef(mockupParams);
  const artworkModeRef = useRef(artworkMode);
  const customArtRef = useRef(customArtImg);
  const timeRef = useRef(0);
  const lastFrameRef = useRef(performance.now());

  studioParamsRef.current = studioParams;
  mediaRef.current = mediaElement;
  mockupParamsRef.current = mockupParams;
  artworkModeRef.current = artworkMode;
  customArtRef.current = customArtImg;

  useEffect(() => {
    const comp2d = document.createElement('canvas');
    const glCanvas = document.createElement('canvas');
    const renderer = new WebGLThermalRenderer(glCanvas);

    let rafId = 0;
    const step = (now: number) => {
      const dt = Math.min(0.1, (now - lastFrameRef.current) / 1000);
      lastFrameRef.current = now;

      const sp = studioParamsRef.current;
      if (sp.animation.playing) {
        timeRef.current += dt;
      }

      let artSource: HTMLCanvasElement | HTMLImageElement | null = null;
      if (artworkModeRef.current === 'custom' && customArtRef.current) {
        artSource = customArtRef.current;
      } else {
        // Render live studio composition at crisp preview resolution
        const previewScale = Math.min(1, 1200 / Math.max(sp.canvas.width, sp.canvas.height));
        const liveParams: StudioParams = {
          ...sp,
          canvas: {
            ...sp.canvas,
            width: Math.round(sp.canvas.width * previewScale),
            height: Math.round(sp.canvas.height * previewScale),
          },
        };
        renderComposition2D(comp2d, liveParams, mediaRef.current, timeRef.current);
        if (renderer.isAvailable()) {
          renderer.render(comp2d, liveParams, timeRef.current);
          artSource = glCanvas;
        } else {
          artSource = comp2d;
        }
      }

      if (visibleCanvasRef.current) {
        renderMockupScene(visibleCanvasRef.current, artSource, mockupParamsRef.current);
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(rafId);
      renderer.dispose();
    };
  }, []);

  const handleSelectTemplate = (id: MockupTemplateId) => {
    const meta = MOCKUP_TEMPLATES.find((t) => t.id === id);
    if (!meta) return;
    setMockupParams((prev) => ({
      ...prev,
      template: id,
      backdropColor: meta.defaultBackdrop,
      objectColor: meta.defaultObject,
      material: meta.defaultMaterial,
      artworkScale: 1.0,
      artworkOffsetX: 0,
      artworkOffsetY: 0,
    }));
  };

  const handleUploadCustomArtwork = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setCustomArtImg(img);
      setCustomArtName(file.name);
      setArtworkMode('custom');
    };
    img.src = url;
  };

  const handleExportMockupImage = () => {
    const off2d = document.createElement('canvas');
    const offGl = document.createElement('canvas');
    const renderer = new WebGLThermalRenderer(offGl);
    const outCanvas = document.createElement('canvas');

    const sp = studioParamsRef.current;
    let artSource: HTMLCanvasElement | HTMLImageElement | null = null;

    if (artworkMode === 'custom' && customArtImg) {
      artSource = customArtImg;
    } else {
      renderComposition2D(off2d, sp, mediaElement, timeRef.current);
      if (renderer.isAvailable()) {
        renderer.render(off2d, sp, timeRef.current);
        artSource = offGl;
      } else {
        artSource = off2d;
      }
    }

    const hiResParams: MockupParams = {
      ...mockupParams,
      outputWidth: mockupParams.outputWidth * 2,
      outputHeight: mockupParams.outputHeight * 2,
    };

    renderMockupScene(outCanvas, artSource, hiResParams);

    outCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `thermokinetic-mockup-${mockupParams.template}-${hiResParams.outputWidth}x${hiResParams.outputHeight}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      renderer.dispose();
    }, 'image/png');
  };

  const handleExportMockupVideo = async () => {
    const canvas = visibleCanvasRef.current;
    if (!canvas || typeof MediaRecorder === 'undefined') return;

    setIsRecordingVideo(true);
    setVideoProgress(0);

    const { mimeType, extension } = getBestSupportedVideoMime();
    const stream = canvas.captureStream(30);
    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 12_000_000,
    });

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    const durationMs = 5000;
    const start = performance.now();

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `thermokinetic-mockup-${mockupParams.template}-5s.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setIsRecordingVideo(false);
      setVideoProgress(0);
    };

    recorder.start(100);

    const timer = window.setInterval(() => {
      const pct = Math.min(100, Math.round(((performance.now() - start) / durationMs) * 100));
      setVideoProgress(pct);
      if (performance.now() - start >= durationMs) {
        clearInterval(timer);
        recorder.stop();
      }
    }, 100);
  };

  const backdropSwatches = ['#0C0D10', '#1A1B1F', '#27272A', '#D6D3CD', '#EAE8E3'];
  const objectSwatches = ['#0B0B0D', '#1C1D22', '#EAE6DF', '#F4F4F5', '#1E3A8A', '#7F1D1D'];

  return (
    <div className="flex-1 min-h-0 flex overflow-hidden">
      {/* Left Rail: Scene Templates & Artwork Source */}
      <aside className="w-[300px] shrink-0 h-full bg-[#111215] border-r border-white/8 flex flex-col overflow-y-auto">
        <div className="p-4 border-b border-white/8 flex flex-col gap-2.5">
          <h2
            className="text-xs font-semibold tracking-wider uppercase text-[#F4F4F5]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Mockup Artwork Source
          </h2>
          <div className="grid grid-cols-2 gap-1 bg-[#09090B] p-1 border border-white/8">
            <button
              type="button"
              onClick={() => setArtworkMode('live')}
              className={`py-1.5 text-[11px] font-medium cursor-pointer transition-colors ${
                artworkMode === 'live'
                  ? 'bg-[#FF4D00] text-white'
                  : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
              }`}
            >
              Live Studio
            </button>
            <button
              type="button"
              onClick={() => {
                if (customArtImg) setArtworkMode('custom');
                else customInputRef.current?.click();
              }}
              className={`py-1.5 text-[11px] font-medium cursor-pointer transition-colors ${
                artworkMode === 'custom'
                  ? 'bg-[#FF4D00] text-white'
                  : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
              }`}
            >
              Custom Image
            </button>
          </div>

          <input
            ref={customInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUploadCustomArtwork(file);
              e.target.value = '';
            }}
          />

          <button
            type="button"
            onClick={() => customInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 py-2 px-3 bg-[#181A1F] hover:bg-white/10 border border-white/12 text-xs font-medium text-[#F4F4F5] cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-[#FF4D00]" />
            <span>{customArtName ? `Replace (${customArtName})` : 'Upload Artwork File'}</span>
          </button>
        </div>

        {/* Mockup Frame Dimensions */}
        <div className="p-4 border-b border-white/8 flex flex-col gap-2">
          <span
            className="text-xs font-semibold tracking-wider uppercase text-[#F4F4F5]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Mockup Aspect
          </span>
          <div className="grid grid-cols-3 gap-1">
            {[
              { label: '1:1', w: 1600, h: 1600 },
              { label: '4:5', w: 1440, h: 1800 },
              { label: '16:9', w: 1920, h: 1080 },
            ].map((dim) => {
              const active =
                mockupParams.outputWidth === dim.w && mockupParams.outputHeight === dim.h;
              return (
                <button
                  key={dim.label}
                  type="button"
                  onClick={() =>
                    setMockupParams((p) => ({
                      ...p,
                      outputWidth: dim.w,
                      outputHeight: dim.h,
                    }))
                  }
                  className={`py-1.5 text-[11px] font-mono cursor-pointer border ${
                    active
                      ? 'bg-[#FF4D00] border-[#FF4D00] text-white font-semibold'
                      : 'bg-[#181A1F] border-white/6 text-[#A1A1AA] hover:text-[#F4F4F5]'
                  }`}
                >
                  {dim.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scene Templates */}
        <div className="p-4 flex flex-col gap-2">
          <h2
            className="text-xs font-semibold tracking-wider uppercase text-[#F4F4F5] mb-1"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Studio Scenes
          </h2>
          {MOCKUP_TEMPLATES.map((tpl) => {
            const active = mockupParams.template === tpl.id;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => handleSelectTemplate(tpl.id)}
                className={`text-left p-2.5 border transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#181A1F] border-[#FF4D00]'
                    : 'bg-[#09090B]/60 border-white/6 hover:border-white/16'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#F4F4F5]">{tpl.name}</span>
                  <span className="text-[10px] font-mono text-[#71717A] uppercase">
                    {tpl.category}
                  </span>
                </div>
                <p className="text-[11px] text-[#A1A1AA] mt-0.5 leading-snug">
                  {tpl.description}
                </p>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Center Live Mockup Viewport */}
      <main className="relative flex-1 min-w-0 h-full bg-[#09090B] flex flex-col items-center justify-center p-6 pb-20 overflow-hidden">
        <div className="absolute top-3 left-4 right-4 flex items-center justify-between text-[11px] font-mono tabular-nums text-[#71717A] pointer-events-none select-none">
          <span>
            MOCKUP STAGE · {mockupParams.outputWidth * 2} × {mockupParams.outputHeight * 2} PX (2× EXPORT)
          </span>
          <span>
            {artworkMode === 'live' ? 'SYNCED WITH LIVE SHADER STUDIO' : 'CUSTOM ARTWORK'}
          </span>
        </div>

        <div
          className="relative shadow-[0_24px_80px_rgba(0,0,0,0.85)] border border-white/10"
          style={{
            aspectRatio: `${mockupParams.outputWidth} / ${mockupParams.outputHeight}`,
            maxHeight: '100%',
            maxWidth: '100%',
            height:
              mockupParams.outputHeight >= mockupParams.outputWidth ? '100%' : 'auto',
            width:
              mockupParams.outputWidth > mockupParams.outputHeight ? '100%' : 'auto',
          }}
        >
          <canvas ref={visibleCanvasRef} className="w-full h-full block" />
        </div>

        {/* Mockup Action Bar */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1.5 bg-[#111215]/95 backdrop-blur-md border border-white/12 shadow-xl">
          <button
            type="button"
            onClick={onBackToStudio}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#A1A1AA] hover:text-[#F4F4F5] transition-colors cursor-pointer whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Edit Shaders</span>
          </button>

          <div className="w-px h-4 bg-white/10" />

          <button
            type="button"
            onClick={onToggleStudioPlay}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#F4F4F5] hover:bg-white/8 transition-colors cursor-pointer whitespace-nowrap"
          >
            {studioParams.animation.playing ? (
              <Pause className="w-3.5 h-3.5 text-[#FF4D00]" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            <span>{studioParams.animation.playing ? 'Pause' : 'Play'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTemplate(mockupParams.template)}
            className="p-1.5 text-[#A1A1AA] hover:text-[#F4F4F5] cursor-pointer"
            title="Reset scene lighting and placement"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-white/10" />

          <button
            type="button"
            onClick={handleExportMockupImage}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#FF4D00] hover:bg-[#E04400] transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PNG (2×)</span>
          </button>

          <button
            type="button"
            onClick={handleExportMockupVideo}
            disabled={isRecordingVideo}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#F4F4F5] bg-[#181A1F] hover:bg-white/12 border border-white/10 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Film className="w-3.5 h-3.5 text-[#FF4D00]" />
            <span>
              {isRecordingVideo ? `Recording ${videoProgress}%` : 'Record 5s Video'}
            </span>
          </button>
        </div>
      </main>

      {/* Right Inspector: Surface, Material, Placement & Lighting */}
      <aside className="w-[320px] shrink-0 h-full bg-[#111215] border-l border-white/8 flex flex-col overflow-y-auto">
        <section className="p-4 border-b border-white/8 flex flex-col gap-3">
          <h2
            className="text-xs font-semibold tracking-wider uppercase text-[#F4F4F5]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Environment & Surface
          </h2>

          {/* Studio Wall / Backdrop */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#A1A1AA]">Studio Backdrop</span>
              <input
                type="color"
                value={mockupParams.backdropColor}
                onChange={(e) =>
                  setMockupParams((p) => ({ ...p, backdropColor: e.target.value }))
                }
                className="w-6 h-5 bg-transparent border border-white/15 cursor-pointer"
              />
            </div>
            <div className="flex gap-1.5">
              {backdropSwatches.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setMockupParams((p) => ({ ...p, backdropColor: hex }))}
                  className={`flex-1 h-5 border cursor-pointer ${
                    mockupParams.backdropColor === hex
                      ? 'border-[#FF4D00]'
                      : 'border-white/15'
                  }`}
                  style={{ backgroundColor: hex }}
                  title={hex}
                />
              ))}
            </div>
          </div>

          {/* Object / Garment / Chassis Color */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#A1A1AA]">Object / Garment Color</span>
              <input
                type="color"
                value={mockupParams.objectColor}
                onChange={(e) =>
                  setMockupParams((p) => ({ ...p, objectColor: e.target.value }))
                }
                className="w-6 h-5 bg-transparent border border-white/15 cursor-pointer"
              />
            </div>
            <div className="flex gap-1.5">
              {objectSwatches.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setMockupParams((p) => ({ ...p, objectColor: hex }))}
                  className={`flex-1 h-5 border cursor-pointer ${
                    mockupParams.objectColor === hex
                      ? 'border-[#FF4D00]'
                      : 'border-white/15'
                  }`}
                  style={{ backgroundColor: hex }}
                  title={hex}
                />
              ))}
            </div>
          </div>

          {mockupParams.template === 'framed_poster' && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] text-[#A1A1AA]">Frame Finish</span>
              <div className="grid grid-cols-4 gap-1 bg-[#09090B] p-1 border border-white/8">
                {(['black', 'aluminum', 'oak', 'frameless'] as const).map((fs) => (
                  <button
                    key={fs}
                    type="button"
                    onClick={() => setMockupParams((p) => ({ ...p, frameStyle: fs }))}
                    className={`py-1 text-[11px] capitalize cursor-pointer ${
                      mockupParams.frameStyle === fs
                        ? 'bg-[#FF4D00] text-white'
                        : 'text-[#A1A1AA]'
                    }`}
                  >
                    {fs === 'frameless' ? 'None' : fs}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] text-[#A1A1AA]">Surface Material</span>
            <div className="grid grid-cols-4 gap-1 bg-[#09090B] p-1 border border-white/8">
              {(['matte', 'glossy', 'cotton', 'oled'] as MockupSurfaceMaterial[]).map(
                (mat) => (
                  <button
                    key={mat}
                    type="button"
                    onClick={() => setMockupParams((p) => ({ ...p, material: mat }))}
                    className={`py-1 text-[11px] uppercase cursor-pointer ${
                      mockupParams.material === mat
                        ? 'bg-[#FF4D00] text-white'
                        : 'text-[#A1A1AA]'
                    }`}
                  >
                    {mat}
                  </button>
                )
              )}
            </div>
          </div>
        </section>

        <section className="p-4 border-b border-white/8 flex flex-col gap-3">
          <h2
            className="text-xs font-semibold tracking-wider uppercase text-[#F4F4F5]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Artwork Placement
          </h2>

          <StudioSlider
            label="Artwork Scale"
            value={mockupParams.artworkScale}
            min={0.6}
            max={1.5}
            step={0.01}
            defaultValue={1.0}
            unit="×"
            onChange={(v) => setMockupParams((p) => ({ ...p, artworkScale: v }))}
          />

          <StudioSlider
            label="Horizontal Offset"
            value={mockupParams.artworkOffsetX}
            min={-0.3}
            max={0.3}
            step={0.01}
            defaultValue={0}
            onChange={(v) => setMockupParams((p) => ({ ...p, artworkOffsetX: v }))}
          />

          <StudioSlider
            label="Vertical Offset"
            value={mockupParams.artworkOffsetY}
            min={-0.3}
            max={0.3}
            step={0.01}
            defaultValue={0}
            onChange={(v) => setMockupParams((p) => ({ ...p, artworkOffsetY: v }))}
          />
        </section>

        <section className="p-4 flex flex-col gap-3">
          <h2
            className="text-xs font-semibold tracking-wider uppercase text-[#F4F4F5]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Studio Lighting & Texture
          </h2>

          <StudioSlider
            label="Light Angle"
            value={mockupParams.lightAngle}
            min={0}
            max={360}
            step={1}
            defaultValue={315}
            unit="°"
            onChange={(v) => setMockupParams((p) => ({ ...p, lightAngle: v }))}
          />

          <StudioSlider
            label="Ambient Shadow"
            value={mockupParams.shadowDepth}
            min={0}
            max={1}
            step={0.01}
            defaultValue={0.72}
            onChange={(v) => setMockupParams((p) => ({ ...p, shadowDepth: v }))}
          />

          <StudioSlider
            label="Surface Texture / Folds"
            value={mockupParams.surfaceTexture}
            min={0}
            max={1}
            step={0.01}
            defaultValue={0.45}
            onChange={(v) => setMockupParams((p) => ({ ...p, surfaceTexture: v }))}
          />

          <StudioSlider
            label="Specular Sheen"
            value={mockupParams.specularSheen}
            min={0}
            max={1}
            step={0.01}
            defaultValue={0.35}
            onChange={(v) => setMockupParams((p) => ({ ...p, specularSheen: v }))}
          />

          <StudioSlider
            label="Room Vignette"
            value={mockupParams.vignette}
            min={0}
            max={1}
            step={0.01}
            defaultValue={0.42}
            onChange={(v) => setMockupParams((p) => ({ ...p, vignette: v }))}
          />
        </section>
      </aside>
    </div>
  );
};
