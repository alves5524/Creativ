import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ExportModal } from './components/ExportModal';
import { LeftRail } from './components/LeftRail';
import { MockupStudio } from './components/MockupStudio';
import { RightInspector } from './components/RightInspector';
import { TopBar, WorkspaceFocus } from './components/TopBar';
import { ViewportCanvas } from './components/ViewportCanvas';
import {
  BUILTIN_GOOGLE_FONTS,
  DEFAULT_PARAMS,
  STUDIO_PRESETS,
} from './data/presets';
import { aggressiveRandomize, gentleRandomize } from './engine/randomize';
import { FontEntry, StudioParams } from './types/studio';

export default function App() {
  const [params, setParams] = useState<StudioParams>(DEFAULT_PARAMS);
  const [history, setHistory] = useState<StudioParams[]>([DEFAULT_PARAMS]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const [activePresetId, setActivePresetId] = useState<string>('thermal-splash-xor');
  const [activeFocus, setActiveFocus] = useState<WorkspaceFocus>('presets');
  const [fonts, setFonts] = useState<FontEntry[]>(BUILTIN_GOOGLE_FONTS);
  const [mediaElement, setMediaElement] = useState<
    HTMLImageElement | HTMLVideoElement | null
  >(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const activeObjectUrlRef = useRef<string | null>(null);

  const pushHistory = useCallback(
    (next: StudioParams) => {
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        const updated = [...sliced, next].slice(-30);
        setHistoryIndex(updated.length - 1);
        return updated;
      });
    },
    [historyIndex]
  );

  const handleChangeParams = useCallback(
    (updater: (prev: StudioParams) => StudioParams, commit = false) => {
      setParams((prev) => {
        const next = updater(prev);
        if (commit) {
          pushHistory(next);
        }
        return next;
      });
    },
    [pushHistory]
  );

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    const prevIndex = historyIndex - 1;
    setHistoryIndex(prevIndex);
    setParams(history[prevIndex]);
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const nextIndex = historyIndex + 1;
    setHistoryIndex(nextIndex);
    setParams(history[nextIndex]);
  }, [history, historyIndex]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if (e.code === 'Space') {
        e.preventDefault();
        setParams((prev) => ({
          ...prev,
          animation: { ...prev.animation, playing: !prev.animation.playing },
        }));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (activeObjectUrlRef.current) {
        URL.revokeObjectURL(activeObjectUrlRef.current);
      }
    };
  }, []);

  const handleUploadMedia = useCallback(
    (file: File) => {
      setMediaError(null);
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');

      if (!isImage && !isVideo) {
        setMediaError('Unsupported file type. Upload an image (PNG, JPG, WebP, SVG) or video (MP4, WebM, MOV).');
        return;
      }

      if (activeObjectUrlRef.current) {
        URL.revokeObjectURL(activeObjectUrlRef.current);
      }
      const objectUrl = URL.createObjectURL(file);
      activeObjectUrlRef.current = objectUrl;

      if (isImage) {
        const img = new Image();
        img.onload = () => {
          setMediaElement(img);
          handleChangeParams(
            (prev) => ({
              ...prev,
              media: {
                ...prev.media,
                sourceType: 'image',
                mediaUrl: objectUrl,
                mediaName: file.name,
              },
            }),
            true
          );
        };
        img.onerror = () => {
          setMediaError(`Could not decode image "${file.name}".`);
        };
        img.src = objectUrl;
      } else {
        const video = document.createElement('video');
        video.src = objectUrl;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.crossOrigin = 'anonymous';
        video.onloadeddata = () => {
          video.play().catch(() => {});
          setMediaElement(video);
          handleChangeParams(
            (prev) => ({
              ...prev,
              media: {
                ...prev.media,
                sourceType: 'video',
                mediaUrl: objectUrl,
                mediaName: file.name,
              },
            }),
            true
          );
        };
        video.onerror = () => {
          setMediaError(`Could not decode video "${file.name}".`);
        };
      }
    },
    [handleChangeParams]
  );

  const handleClearMedia = useCallback(() => {
    if (activeObjectUrlRef.current) {
      URL.revokeObjectURL(activeObjectUrlRef.current);
      activeObjectUrlRef.current = null;
    }
    setMediaElement(null);
    handleChangeParams(
      (prev) => ({
        ...prev,
        media: {
          ...prev.media,
          sourceType: 'substrate',
          mediaUrl: null,
          mediaName: null,
        },
      }),
      true
    );
  }, [handleChangeParams]);

  const handleSelectPreset = useCallback(
    (presetId: string) => {
      const preset = STUDIO_PRESETS.find((p) => p.id === presetId);
      if (!preset) return;
      setActivePresetId(presetId);

      // Preserve user's uploaded media & canvas aspect ratio if they have uploaded custom media
      const next: StudioParams = {
        ...preset.params,
        canvas: params.canvas,
        media:
          params.media.sourceType !== 'substrate'
            ? {
                ...preset.params.media,
                sourceType: params.media.sourceType,
                mediaUrl: params.media.mediaUrl,
                mediaName: params.media.mediaName,
                fit: params.media.fit,
                scale: params.media.scale,
              }
            : preset.params.media,
      };
      setParams(next);
      pushHistory(next);
    },
    [params.canvas, params.media, pushHistory]
  );

  const handleGentleRandomize = useCallback(() => {
    setParams((prev) => {
      const next = gentleRandomize(prev);
      pushHistory(next);
      return next;
    });
  }, [pushHistory]);

  const handleAggressiveRandomize = useCallback(() => {
    setParams((prev) => {
      const next = aggressiveRandomize(prev, fonts);
      pushHistory(next);
      return next;
    });
  }, [fonts, pushHistory]);

  const handleReset = useCallback(() => {
    handleSelectPreset(activePresetId);
  }, [activePresetId, handleSelectPreset]);

  const handleAddFont = useCallback((entry: FontEntry) => {
    setFonts((prev) => {
      const exists = prev.some(
        (f) => f.family.toLowerCase() === entry.family.toLowerCase()
      );
      if (exists) return prev;
      return [entry, ...prev];
    });
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#09090B] text-[#F4F4F5]">
      <TopBar
        activeFocus={activeFocus}
        onSelectFocus={setActiveFocus}
        onOpenExport={() => setExportOpen(true)}
      />

      {mediaError && (
        <div className="px-5 py-2 bg-red-950/70 border-b border-red-500/30 flex items-center justify-between text-xs text-red-200">
          <span>{mediaError}</span>
          <button
            type="button"
            onClick={() => setMediaError(null)}
            className="underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {activeFocus === 'mockups' ? (
        <MockupStudio
          studioParams={params}
          mediaElement={mediaElement}
          onToggleStudioPlay={() =>
            setParams((prev) => ({
              ...prev,
              animation: { ...prev.animation, playing: !prev.animation.playing },
            }))
          }
          onBackToStudio={() => setActiveFocus('presets')}
        />
      ) : (
        <div className="flex-1 min-h-0 flex overflow-hidden">
          <LeftRail
            params={params}
            fonts={fonts}
            activePresetId={activePresetId}
            activeFocus={activeFocus}
            onChangeParams={handleChangeParams}
            onSelectPreset={handleSelectPreset}
            onUploadMedia={handleUploadMedia}
            onClearMedia={handleClearMedia}
            onAddFont={handleAddFont}
          />

          <ViewportCanvas
            params={params}
            mediaElement={mediaElement}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
            onTogglePlay={() =>
              setParams((prev) => ({
                ...prev,
                animation: { ...prev.animation, playing: !prev.animation.playing },
              }))
            }
            onUndo={handleUndo}
            onRedo={handleRedo}
            onGentleRandomize={handleGentleRandomize}
            onAggressiveRandomize={handleAggressiveRandomize}
            onReset={handleReset}
            onDropMediaFile={handleUploadMedia}
          />

          <RightInspector params={params} onChangeParams={handleChangeParams} />
        </div>
      )}

      <ExportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        params={params}
        mediaElement={mediaElement}
      />
    </div>
  );
}
