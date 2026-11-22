import React, { useState } from 'react';
import { Download, Film, Image as ImageIcon, X } from 'lucide-react';
import {
  exportStaticImage,
  exportVideoLoop,
  getBestSupportedVideoMime,
} from '../engine/exporter';
import { ExportFormat, ExportSettings, StudioParams } from '../types/studio';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  params: StudioParams;
  mediaElement: HTMLImageElement | HTMLVideoElement | null;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  params,
  mediaElement,
}) => {
  const [settings, setSettings] = useState<ExportSettings>({
    format: 'png',
    scale: 2,
    jpegQuality: 0.94,
    fps: 30,
    durationSeconds: 5,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const videoCodecInfo = getBestSupportedVideoMime();
  const outW =
    settings.format === 'video'
      ? Math.min(2160, Math.round(params.canvas.width * (settings.scale > 1 ? 1.5 : 1)))
      : Math.round(params.canvas.width * settings.scale);
  const outH =
    settings.format === 'video'
      ? Math.min(2160, Math.round(params.canvas.height * (settings.scale > 1 ? 1.5 : 1)))
      : Math.round(params.canvas.height * settings.scale);

  const handleExport = async () => {
    setErrorMsg(null);
    setIsExporting(true);
    setProgress(0);
    try {
      if (settings.format === 'video') {
        await exportVideoLoop(params, mediaElement, settings, (pct) =>
          setProgress(pct)
        );
      } else {
        await exportStaticImage(params, mediaElement, settings, performance.now() / 1000);
      }
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setIsExporting(false);
    }
  };

  const formats: { id: ExportFormat; label: string; desc: string }[] = [
    { id: 'png', label: 'PNG', desc: 'Lossless high-res raster' },
    { id: 'jpeg', label: 'JPEG', desc: 'Compact editorial print' },
    { id: 'svg', label: 'SVG', desc: 'Vector type + shader plate' },
    { id: 'video', label: 'Video Loop', desc: videoCodecInfo.label },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#111215] border border-white/14 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <div className="flex items-center gap-2">
            {settings.format === 'video' ? (
              <Film className="w-4 h-4 text-[#FF4D00]" />
            ) : (
              <ImageIcon className="w-4 h-4 text-[#FF4D00]" />
            )}
            <h2
              className="text-sm font-semibold uppercase tracking-wider text-[#F4F4F5]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Export High-Res Media
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="text-[#71717A] hover:text-[#F4F4F5] disabled:opacity-30 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-5">
          {/* Format Grid */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-[#A1A1AA]">Output Format</span>
            <div className="grid grid-cols-2 gap-1.5">
              {formats.map((f) => {
                const active = settings.format === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, format: f.id }))}
                    className={`p-2.5 text-left border transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#181A1F] border-[#FF4D00]'
                        : 'bg-[#09090B] border-white/8 hover:border-white/16'
                    }`}
                  >
                    <div className="text-xs font-semibold text-[#F4F4F5]">
                      {f.label}
                    </div>
                    <div className="text-[11px] text-[#71717A] mt-0.5">{f.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Resolution Scale */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#A1A1AA] font-medium">Render Scale</span>
              <span className="font-mono tabular-nums text-[#F4F4F5]">
                {outW} × {outH} px
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {([1, 2, 4] as const).map((sc) => (
                <button
                  key={sc}
                  type="button"
                  onClick={() => setSettings((s) => ({ ...s, scale: sc }))}
                  className={`py-2 text-xs font-mono transition-colors cursor-pointer border ${
                    settings.scale === sc
                      ? 'bg-[#FF4D00] border-[#FF4D00] text-white font-semibold'
                      : 'bg-[#09090B] border-white/8 text-[#A1A1AA] hover:text-[#F4F4F5]'
                  }`}
                >
                  {sc}× {sc === 4 ? '(4K)' : sc === 2 ? '(HD+)' : '(Base)'}
                </button>
              ))}
            </div>
          </div>

          {settings.format === 'jpeg' && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#A1A1AA]">JPEG Quality</span>
                <span className="font-mono tabular-nums text-[#F4F4F5]">
                  {Math.round(settings.jpegQuality * 100)}%
                </span>
              </div>
              <input
                type="range"
                className="studio-slider"
                min={0.6}
                max={1}
                step={0.02}
                value={settings.jpegQuality}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    jpegQuality: parseFloat(e.target.value),
                  }))
                }
              />
            </div>
          )}

          {settings.format === 'video' && (
            <div className="flex flex-col gap-3 pt-1 border-t border-white/8">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#A1A1AA]">Frame Rate</span>
                <div className="flex gap-1">
                  {([24, 30, 60] as const).map((fps) => (
                    <button
                      key={fps}
                      type="button"
                      onClick={() => setSettings((s) => ({ ...s, fps }))}
                      className={`px-2.5 py-1 text-[11px] font-mono border cursor-pointer ${
                        settings.fps === fps
                          ? 'bg-[#F4F4F5] border-[#F4F4F5] text-[#09090B] font-semibold'
                          : 'bg-[#09090B] border-white/8 text-[#A1A1AA]'
                      }`}
                    >
                      {fps} FPS
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#A1A1AA]">Clip Duration</span>
                  <span className="font-mono tabular-nums text-[#F4F4F5]">
                    {settings.durationSeconds}s
                  </span>
                </div>
                <input
                  type="range"
                  className="studio-slider"
                  min={2}
                  max={15}
                  step={1}
                  value={settings.durationSeconds}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      durationSeconds: parseInt(e.target.value, 10),
                    }))
                  }
                />
              </div>
            </div>
          )}

          {isExporting && settings.format === 'video' && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#A1A1AA]">Rendering video frames...</span>
                <span className="font-mono tabular-nums text-[#FF4D00]">
                  {progress}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-[#09090B] overflow-hidden">
                <div
                  className="h-full bg-[#FF4D00] transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {errorMsg && (
            <p className="text-xs text-red-400 bg-red-950/40 border border-red-500/30 px-3 py-2">
              {errorMsg}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/8 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 text-xs font-medium text-[#A1A1AA] hover:text-[#F4F4F5] disabled:opacity-40 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#FF4D00] hover:bg-[#E04400] disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>
              {isExporting
                ? settings.format === 'video'
                  ? 'Recording...'
                  : 'Rendering...'
                : `Export ${settings.format.toUpperCase()}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
