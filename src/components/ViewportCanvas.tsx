import React, { useEffect, useRef, useState } from 'react';
import {
  Maximize2,
  Pause,
  Play,
  Redo2,
  RotateCcw,
  Shuffle,
  Undo2,
  Zap,
} from 'lucide-react';
import { renderComposition2D } from '../engine/composition2d';
import { WebGLThermalRenderer } from '../engine/webglRenderer';
import { StudioParams } from '../types/studio';

interface ViewportCanvasProps {
  params: StudioParams;
  mediaElement: HTMLImageElement | HTMLVideoElement | null;
  canUndo: boolean;
  canRedo: boolean;
  onTogglePlay: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onGentleRandomize: () => void;
  onAggressiveRandomize: () => void;
  onReset: () => void;
  onDropMediaFile: (file: File) => void;
}

export const ViewportCanvas: React.FC<ViewportCanvasProps> = ({
  params,
  mediaElement,
  canUndo,
  canRedo,
  onTogglePlay,
  onUndo,
  onRedo,
  onGentleRandomize,
  onAggressiveRandomize,
  onReset,
  onDropMediaFile,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const glCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const compCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<WebGLThermalRenderer | null>(null);
  const timeRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(performance.now());
  const paramsRef = useRef<StudioParams>(params);
  const mediaRef = useRef<HTMLImageElement | HTMLVideoElement | null>(mediaElement);

  const [zoomMode, setZoomMode] = useState<'fit' | 'actual'>('fit');
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  paramsRef.current = params;
  mediaRef.current = mediaElement;

  useEffect(() => {
    const glCanvas = glCanvasRef.current;
    if (!glCanvas) return;

    const compCanvas = document.createElement('canvas');
    compCanvasRef.current = compCanvas;

    const renderer = new WebGLThermalRenderer(glCanvas);
    rendererRef.current = renderer;

    if (!renderer.isAvailable()) {
      setWebglUnavailable(true);
    }

    let rafId = 0;

    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - lastFrameRef.current) / 1000);
      lastFrameRef.current = now;

      const currentParams = paramsRef.current;
      if (currentParams.animation.playing) {
        timeRef.current += dt;
      }

      if (compCanvasRef.current) {
        renderComposition2D(
          compCanvasRef.current,
          currentParams,
          mediaRef.current,
          timeRef.current
        );
        if (renderer.isAvailable()) {
          renderer.render(compCanvasRef.current, currentParams, timeRef.current);
        }
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      renderer.dispose();
      rendererRef.current = null;
    };
  }, []);

  const aspectRatioCss = `${params.canvas.width} / ${params.canvas.height}`;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onDropMediaFile(file);
    }
  };

  return (
    <main
      ref={containerRef}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={handleDrop}
      className="relative flex-1 min-w-0 h-full bg-[#09090B] flex flex-col items-center justify-center overflow-hidden p-6 pb-20"
    >
      {/* Subtle darkroom registration corner info */}
      <div className="absolute top-3 left-4 right-4 flex items-center justify-between text-[11px] font-mono tabular-nums text-[#71717A] pointer-events-none select-none z-10">
        <span>
          {params.canvas.width} × {params.canvas.height} PX · {params.canvas.aspectRatio.toUpperCase()}
        </span>
        <span>
          {params.thermal.enabled ? params.thermal.palette.replace('_', ' ').toUpperCase() : 'BYPASS LUT'} ·{' '}
          {params.motionBlur.mode.replace('_', '-').toUpperCase()}
        </span>
      </div>

      {/* Artwork Canvas Stage */}
      <div
        className={`relative flex items-center justify-center transition-all duration-150 ${
          zoomMode === 'actual'
            ? 'overflow-auto max-w-full max-h-full'
            : 'w-full h-full'
        }`}
      >
        <div
          className={`relative shadow-[0_24px_80px_rgba(0,0,0,0.85)] border ${
            isDraggingOver ? 'border-[#FF4D00]' : 'border-white/10'
          } bg-black`}
          style={
            zoomMode === 'fit'
              ? {
                  aspectRatio: aspectRatioCss,
                  maxHeight: '100%',
                  maxWidth: '100%',
                  height: params.canvas.height >= params.canvas.width ? '100%' : 'auto',
                  width: params.canvas.width > params.canvas.height ? '100%' : 'auto',
                }
              : {
                  width: `${params.canvas.width}px`,
                  height: `${params.canvas.height}px`,
                }
          }
        >
          {webglUnavailable ? (
            <div className="w-full h-full flex items-center justify-center p-8 text-center text-sm text-[#A1A1AA]">
              WebGL2 hardware acceleration is unavailable in this browser context.
            </div>
          ) : (
            <canvas
              ref={glCanvasRef}
              className="w-full h-full block"
            />
          )}

          {isDraggingOver && (
            <div className="absolute inset-0 bg-black/75 flex items-center justify-center pointer-events-none">
              <span className="text-sm font-medium text-[#FF4D00] tracking-wide">
                Drop image or video to load into composition
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Floating Darkroom Transport & Randomizer Bar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 px-2 py-1.5 bg-[#111215]/95 backdrop-blur-md border border-white/12 shadow-xl">
        <button
          type="button"
          onClick={onTogglePlay}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#F4F4F5] hover:bg-white/8 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title={params.animation.playing ? 'Pause animation' : 'Play animation'}
        >
          {params.animation.playing ? (
            <Pause className="w-3.5 h-3.5 text-[#FF4D00]" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          <span>{params.animation.playing ? 'Pause' : 'Play'}</span>
        </button>

        <div className="w-px h-4 bg-white/10 mx-0.5" />

        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="p-1.5 text-[#A1A1AA] hover:text-[#F4F4F5] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className="p-1.5 text-[#A1A1AA] hover:text-[#F4F4F5] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-white/10 mx-0.5" />

        <button
          type="button"
          onClick={onGentleRandomize}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#F4F4F5] bg-[#181A1F] hover:bg-white/12 border border-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title="Subtle parameter variations preserving current typography and mood"
        >
          <Shuffle className="w-3.5 h-3.5 text-[#A1A1AA]" />
          <span>Gentle Random</span>
        </button>

        <button
          type="button"
          onClick={onAggressiveRandomize}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#FF4D00] hover:bg-[#E04400] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title="Full experimental remix of thermal LUTs, blur modes, fonts, and XOR blending"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Aggressive Random</span>
        </button>

        <div className="w-px h-4 bg-white/10 mx-0.5" />

        <button
          type="button"
          onClick={() => setZoomMode((z) => (z === 'fit' ? 'actual' : 'fit'))}
          className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-mono text-[#A1A1AA] hover:text-[#F4F4F5] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title="Toggle Fit / 100% pixel scale"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>{zoomMode === 'fit' ? 'FIT' : '100%'}</span>
        </button>

        <button
          type="button"
          onClick={onReset}
          className="p-1.5 text-[#A1A1AA] hover:text-[#F4F4F5] transition-colors cursor-pointer"
          title="Reset composition to active preset defaults"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </main>
  );
};
