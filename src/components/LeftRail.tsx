import React, { useRef, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ChevronDown,
  ChevronRight,
  Film,
  Image as ImageIcon,
  Trash2,
  Type,
  Upload,
} from 'lucide-react';
import {
  ASPECT_RATIO_DIMENSIONS,
  STUDIO_PRESETS,
} from '../data/presets';
import {
  loadAdobeTypekitProject,
  loadGoogleFont,
  loadLocalFontFile,
} from '../engine/fontManager';
import {
  AspectRatioPreset,
  FontEntry,
  StudioParams,
  SubstrateKind,
  TypographyBlendMode,
} from '../types/studio';
import { StudioSlider } from './StudioSlider';
import { WorkspaceFocus } from './TopBar';

interface LeftRailProps {
  params: StudioParams;
  fonts: FontEntry[];
  activePresetId: string;
  activeFocus: WorkspaceFocus;
  onChangeParams: (updater: (prev: StudioParams) => StudioParams, commit?: boolean) => void;
  onSelectPreset: (presetId: string) => void;
  onUploadMedia: (file: File) => void;
  onClearMedia: () => void;
  onAddFont: (font: FontEntry) => void;
}

export const LeftRail: React.FC<LeftRailProps> = ({
  params,
  fonts,
  activePresetId,
  activeFocus,
  onChangeParams,
  onSelectPreset,
  onUploadMedia,
  onClearMedia,
  onAddFont,
}) => {
  const mediaInputRef = useRef<HTMLInputElement | null>(null);
  const fontInputRef = useRef<HTMLInputElement | null>(null);

  const [openSection, setOpenSection] = useState<'presets' | 'media' | 'typography'>(
    activeFocus === 'media'
      ? 'media'
      : activeFocus === 'typography'
      ? 'typography'
      : 'presets'
  );
  const [fontTab, setFontTab] = useState<'catalog' | 'google' | 'adobe' | 'upload'>(
    'catalog'
  );
  const [fontSearch, setFontSearch] = useState('');
  const [googleInput, setGoogleInput] = useState('');
  const [adobeProjectId, setAdobeProjectId] = useState('');
  const [adobeFamilyInput, setAdobeFamilyInput] = useState('');
  const [fontFeedback, setFontFeedback] = useState<{
    type: 'ok' | 'error';
    msg: string;
  } | null>(null);
  const [fontLoading, setFontLoading] = useState(false);

  // Sync open section when user clicks TopBar nav links
  React.useEffect(() => {
    if (activeFocus === 'presets') setOpenSection('presets');
    else if (activeFocus === 'media') setOpenSection('media');
    else if (activeFocus === 'typography') setOpenSection('typography');
  }, [activeFocus]);

  const setAspectRatio = (ratio: AspectRatioPreset) => {
    if (ratio === 'custom') {
      onChangeParams(
        (prev) => ({
          ...prev,
          canvas: { ...prev.canvas, aspectRatio: 'custom' },
        }),
        true
      );
      return;
    }
    const dims = ASPECT_RATIO_DIMENSIONS[ratio];
    onChangeParams(
      (prev) => ({
        ...prev,
        canvas: {
          aspectRatio: ratio,
          width: dims.width,
          height: dims.height,
        },
      }),
      true
    );
  };

  const handleLoadGoogle = async (e: React.FormEvent) => {
    e.preventDefault();
    setFontFeedback(null);
    setFontLoading(true);
    try {
      const entry = await loadGoogleFont(googleInput);
      onAddFont(entry);
      onChangeParams(
        (prev) => ({
          ...prev,
          typography: { ...prev.typography, fontFamily: entry.family },
        }),
        true
      );
      setFontFeedback({ type: 'ok', msg: `Loaded "${entry.family}" from Google Fonts.` });
      setGoogleInput('');
    } catch (err) {
      setFontFeedback({
        type: 'error',
        msg: err instanceof Error ? err.message : 'Failed to load Google Font.',
      });
    } finally {
      setFontLoading(false);
    }
  };

  const handleConnectAdobe = async (e: React.FormEvent) => {
    e.preventDefault();
    setFontFeedback(null);
    setFontLoading(true);
    try {
      const detected = await loadAdobeTypekitProject(adobeProjectId);
      if (detected.length > 0) {
        detected.forEach((family) =>
          onAddFont({
            family,
            provider: 'adobe',
            category: 'Custom',
            weights: [400, 500, 600, 700, 800, 900],
          })
        );
        onChangeParams(
          (prev) => ({
            ...prev,
            typography: { ...prev.typography, fontFamily: detected[0] },
          }),
          true
        );
        setFontFeedback({
          type: 'ok',
          msg: `Typekit connected. Added: ${detected.join(', ')}.`,
        });
      } else {
        setFontFeedback({
          type: 'ok',
          msg: 'Typekit stylesheet linked. Enter the exact CSS font-family name below to apply.',
        });
      }
    } catch (err) {
      setFontFeedback({
        type: 'error',
        msg: err instanceof Error ? err.message : 'Failed to connect Typekit project.',
      });
    } finally {
      setFontLoading(false);
    }
  };

  const handleApplyAdobeFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = adobeFamilyInput.trim();
    if (!clean) return;
    try {
      await document.fonts.load(`700 48px "${clean}"`);
    } catch {
      // Proceed even if specific weight isn't present
    }
    onAddFont({
      family: clean,
      provider: 'adobe',
      category: 'Custom',
      weights: [400, 600, 700, 900],
    });
    onChangeParams(
      (prev) => ({
        ...prev,
        typography: { ...prev.typography, fontFamily: clean },
      }),
      true
    );
    setFontFeedback({ type: 'ok', msg: `Applied Adobe font "${clean}".` });
    setAdobeFamilyInput('');
  };

  const handleLocalFontChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFontFeedback(null);
    setFontLoading(true);
    try {
      const entry = await loadLocalFontFile(file);
      onAddFont(entry);
      onChangeParams(
        (prev) => ({
          ...prev,
          typography: { ...prev.typography, fontFamily: entry.family },
        }),
        true
      );
      setFontFeedback({ type: 'ok', msg: `Uploaded local font "${entry.family}".` });
    } catch (err) {
      setFontFeedback({
        type: 'error',
        msg: err instanceof Error ? err.message : 'Could not parse font file.',
      });
    } finally {
      setFontLoading(false);
      e.target.value = '';
    }
  };

  const filteredFonts = fonts.filter((f) =>
    f.family.toLowerCase().includes(fontSearch.toLowerCase())
  );

  const substrates: { id: SubstrateKind; label: string }[] = [
    { id: 'splash_spheres', label: 'Optical Splash' },
    { id: 'spectral_waves', label: 'Spectral Waves' },
    { id: 'caustic_sphere', label: 'Caustic Sphere' },
    { id: 'grid_paper', label: 'Grid Paper' },
    { id: 'singularity', label: 'Singularity' },
    { id: 'cobalt_ribbons', label: 'Cobalt Ribbons' },
    { id: 'liquid_monolith', label: 'Dark Plume' },
    { id: 'halftone_field', label: 'Halide Bands' },
    { id: 'thermal_gradient', label: 'Heat Field' },
  ];

  const blendModes: { id: TypographyBlendMode; label: string }[] = [
    { id: 'difference', label: 'Difference (XOR)' },
    { id: 'exclusion', label: 'Exclusion' },
    { id: 'normal', label: 'Normal' },
    { id: 'screen', label: 'Screen' },
    { id: 'overlay', label: 'Overlay' },
  ];

  return (
    <aside className="w-[300px] shrink-0 h-full bg-[#111215] border-r border-white/8 flex flex-col overflow-y-auto">
      {/* Canvas Format Strip */}
      <div className="p-4 border-b border-white/8">
        <div className="flex items-center justify-between mb-2.5">
          <h2
            className="text-xs font-semibold tracking-wider uppercase text-[#F4F4F5]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Canvas Format
          </h2>
          <span className="text-[11px] font-mono tabular-nums text-[#71717A]">
            {params.canvas.width}×{params.canvas.height}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {(['3:4', '4:5', '9:16', '1:1', '16:9', 'custom'] as AspectRatioPreset[]).map(
            (ratio) => {
              const active = params.canvas.aspectRatio === ratio;
              return (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => setAspectRatio(ratio)}
                  className={`py-1.5 px-2 text-[11px] font-mono transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-[#FF4D00] text-white font-semibold'
                      : 'bg-[#181A1F] text-[#A1A1AA] hover:text-[#F4F4F5] border border-white/6'
                  }`}
                >
                  {ratio === 'custom' ? 'Custom' : ratio}
                </button>
              );
            }
          )}
        </div>

        {params.canvas.aspectRatio === 'custom' && (
          <div className="grid grid-cols-2 gap-2 mt-2.5">
            <label className="flex flex-col gap-1 text-[11px] text-[#A1A1AA]">
              <span>Width (px)</span>
              <input
                type="number"
                min={256}
                max={4096}
                value={params.canvas.width}
                onChange={(e) =>
                  onChangeParams((prev) => ({
                    ...prev,
                    canvas: {
                      ...prev.canvas,
                      width: Math.max(256, Math.min(4096, Number(e.target.value) || 1080)),
                    },
                  }))
                }
                className="bg-[#09090B] border border-white/12 px-2 py-1 text-xs font-mono tabular-nums text-[#F4F4F5]"
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-[#A1A1AA]">
              <span>Height (px)</span>
              <input
                type="number"
                min={256}
                max={4096}
                value={params.canvas.height}
                onChange={(e) =>
                  onChangeParams((prev) => ({
                    ...prev,
                    canvas: {
                      ...prev.canvas,
                      height: Math.max(256, Math.min(4096, Number(e.target.value) || 1440)),
                    },
                  }))
                }
                className="bg-[#09090B] border border-white/12 px-2 py-1 text-xs font-mono tabular-nums text-[#F4F4F5]"
              />
            </label>
          </div>
        )}
      </div>

      {/* Section 1: Starter Presets */}
      <div className="border-b border-white/8">
        <button
          type="button"
          onClick={() =>
            setOpenSection((s) => (s === 'presets' ? 'typography' : 'presets'))
          }
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/4 transition-colors cursor-pointer"
        >
          <span
            className="text-xs font-semibold tracking-wider uppercase text-[#F4F4F5]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Reference Presets
          </span>
          {openSection === 'presets' ? (
            <ChevronDown className="w-4 h-4 text-[#71717A]" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[#71717A]" />
          )}
        </button>

        {openSection === 'presets' && (
          <div className="px-4 pb-4 flex flex-col gap-1.5">
            {STUDIO_PRESETS.map((preset) => {
              const active = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelectPreset(preset.id)}
                  className={`text-left p-2.5 border transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#181A1F] border-[#FF4D00]'
                      : 'bg-[#09090B]/60 border-white/6 hover:border-white/16'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-[#F4F4F5]">
                    <span>{preset.name}</span>
                    {active && (
                      <span className="text-[10px] font-mono text-[#FF4D00]">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#A1A1AA] mt-0.5 leading-snug">
                    {preset.subtitle}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Media & Substrate */}
      <div className="border-b border-white/8">
        <button
          type="button"
          onClick={() => setOpenSection((s) => (s === 'media' ? 'typography' : 'media'))}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/4 transition-colors cursor-pointer"
        >
          <span
            className="text-xs font-semibold tracking-wider uppercase text-[#F4F4F5]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Media & Substrate
          </span>
          {openSection === 'media' ? (
            <ChevronDown className="w-4 h-4 text-[#71717A]" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[#71717A]" />
          )}
        </button>

        {openSection === 'media' && (
          <div className="px-4 pb-4 flex flex-col gap-3">
            <input
              ref={mediaInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUploadMedia(file);
                e.target.value = '';
              }}
            />

            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => mediaInputRef.current?.click()}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2 px-3 bg-[#181A1F] hover:bg-white/10 border border-white/12 text-xs font-medium text-[#F4F4F5] transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-[#FF4D00]" />
                <span>Upload Image / Video</span>
              </button>
              {params.media.sourceType !== 'substrate' && (
                <button
                  type="button"
                  onClick={onClearMedia}
                  className="p-2 bg-[#181A1F] hover:bg-red-950/60 border border-white/12 text-[#A1A1AA] hover:text-red-400 transition-colors cursor-pointer"
                  title="Remove uploaded media and switch to procedural substrate"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {params.media.sourceType !== 'substrate' && params.media.mediaName && (
              <div className="flex items-center gap-2 text-[11px] text-[#A1A1AA] bg-[#09090B] px-2.5 py-1.5 border border-white/8">
                {params.media.sourceType === 'video' ? (
                  <Film className="w-3.5 h-3.5 text-[#FF4D00] shrink-0" />
                ) : (
                  <ImageIcon className="w-3.5 h-3.5 text-[#FF4D00] shrink-0" />
                )}
                <span className="truncate">{params.media.mediaName}</span>
              </div>
            )}

            {/* Procedural Substrate Switcher */}
            {params.media.sourceType === 'substrate' && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] text-[#A1A1AA]">
                  Generative Substrate
                </span>
                <div className="grid grid-cols-2 gap-1">
                  {substrates.map((sub) => {
                    const active = params.media.substrateKind === sub.id;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() =>
                          onChangeParams(
                            (prev) => ({
                              ...prev,
                              media: { ...prev.media, substrateKind: sub.id },
                            }),
                            true
                          )
                        }
                        className={`py-1.5 px-2 text-[11px] text-left truncate transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#FF4D00] text-white font-semibold'
                            : 'bg-[#181A1F] text-[#A1A1AA] hover:text-[#F4F4F5]'
                        }`}
                      >
                        {sub.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {params.media.sourceType !== 'substrate' && (
              <div className="grid grid-cols-2 gap-1">
                {(['cover', 'contain'] as const).map((fitMode) => (
                  <button
                    key={fitMode}
                    type="button"
                    onClick={() =>
                      onChangeParams(
                        (prev) => ({
                          ...prev,
                          media: { ...prev.media, fit: fitMode },
                        }),
                        true
                      )
                    }
                    className={`py-1.5 text-[11px] capitalize cursor-pointer ${
                      params.media.fit === fitMode
                        ? 'bg-[#F4F4F5] text-[#09090B] font-semibold'
                        : 'bg-[#181A1F] text-[#A1A1AA]'
                    }`}
                  >
                    {fitMode}
                  </button>
                ))}
              </div>
            )}

            <StudioSlider
              label="Media Scale"
              value={params.media.scale}
              min={0.3}
              max={2.5}
              step={0.02}
              defaultValue={1.0}
              unit="×"
              onChange={(v) =>
                onChangeParams((prev) => ({
                  ...prev,
                  media: { ...prev.media, scale: v },
                }))
              }
            />

            <StudioSlider
              label="Pre-Shader Contrast"
              value={params.media.contrast}
              min={0.4}
              max={2.5}
              step={0.02}
              defaultValue={1.25}
              onChange={(v) =>
                onChangeParams((prev) => ({
                  ...prev,
                  media: { ...prev.media, contrast: v },
                }))
              }
            />

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-[#A1A1AA] cursor-pointer">
                <input
                  type="checkbox"
                  checked={params.media.invert}
                  onChange={(e) =>
                    onChangeParams(
                      (prev) => ({
                        ...prev,
                        media: { ...prev.media, invert: e.target.checked },
                      }),
                      true
                    )
                  }
                  className="accent-[#FF4D00]"
                />
                <span>Invert Source Luminance</span>
              </label>
              <input
                type="color"
                value={params.media.bgColor}
                onChange={(e) =>
                  onChangeParams((prev) => ({
                    ...prev,
                    media: { ...prev.media, bgColor: e.target.value },
                  }))
                }
                title="Background canvas color"
                className="w-6 h-6 bg-transparent border border-white/15 cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* Section 3: Typography & Fonts (Google / Adobe / Local) */}
      <div className="flex-1">
        <button
          type="button"
          onClick={() =>
            setOpenSection((s) => (s === 'typography' ? 'media' : 'typography'))
          }
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/4 transition-colors cursor-pointer"
        >
          <span
            className="text-xs font-semibold tracking-wider uppercase text-[#F4F4F5]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Typography & Fonts
          </span>
          {openSection === 'typography' ? (
            <ChevronDown className="w-4 h-4 text-[#71717A]" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[#71717A]" />
          )}
        </button>

        {openSection === 'typography' && (
          <div className="px-4 pb-6 flex flex-col gap-3.5">
            {/* Headline & Micro-Copy Inputs */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-[#A1A1AA]">
                Display Headline (Enter for new lines)
              </label>
              <textarea
                rows={2}
                value={params.typography.text}
                onChange={(e) =>
                  onChangeParams((prev) => ({
                    ...prev,
                    typography: { ...prev.typography, text: e.target.value },
                  }))
                }
                placeholder="THERMAL\nOPTICS"
                className="w-full bg-[#09090B] border border-white/12 px-2.5 py-2 text-xs text-[#F4F4F5] focus:outline-none focus:border-[#FF4D00] resize-y"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={params.typography.subtextTop}
                onChange={(e) =>
                  onChangeParams((prev) => ({
                    ...prev,
                    typography: { ...prev.typography, subtextTop: e.target.value },
                  }))
                }
                placeholder="Top caption"
                className="bg-[#09090B] border border-white/10 px-2 py-1.5 text-[11px] font-mono text-[#F4F4F5] focus:outline-none focus:border-[#FF4D00]"
              />
              <input
                type="text"
                value={params.typography.subtextBottom}
                onChange={(e) =>
                  onChangeParams((prev) => ({
                    ...prev,
                    typography: { ...prev.typography, subtextBottom: e.target.value },
                  }))
                }
                placeholder="Bottom caption"
                className="bg-[#09090B] border border-white/10 px-2 py-1.5 text-[11px] font-mono text-[#F4F4F5] focus:outline-none focus:border-[#FF4D00]"
              />
            </div>

            {/* Font Source Tabs */}
            <div className="flex flex-col gap-2 pt-1 border-t border-white/8">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#A1A1AA]">Font Source</span>
                <span className="text-[11px] font-mono text-[#F4F4F5] truncate max-w-[145px]">
                  {params.typography.fontFamily}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1 bg-[#09090B] p-1 border border-white/8">
                {(
                  [
                    { id: 'catalog', label: 'Catalog' },
                    { id: 'google', label: 'Google' },
                    { id: 'adobe', label: 'Adobe' },
                    { id: 'upload', label: 'Upload' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setFontTab(t.id);
                      setFontFeedback(null);
                    }}
                    className={`py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                      fontTab === t.id
                        ? 'bg-[#181A1F] text-[#F4F4F5]'
                        : 'text-[#71717A] hover:text-[#A1A1AA]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {fontTab === 'catalog' && (
                <div className="flex flex-col gap-1.5">
                  <input
                    type="text"
                    value={fontSearch}
                    onChange={(e) => setFontSearch(e.target.value)}
                    placeholder="Filter loaded fonts..."
                    className="bg-[#09090B] border border-white/10 px-2.5 py-1.5 text-xs text-[#F4F4F5] focus:outline-none focus:border-[#FF4D00]"
                  />
                  <div className="max-h-36 overflow-y-auto border border-white/8 bg-[#09090B] divide-y divide-white/6">
                    {filteredFonts.map((f) => {
                      const active = params.typography.fontFamily === f.family;
                      return (
                        <button
                          key={`${f.provider}-${f.family}`}
                          type="button"
                          onClick={() =>
                            onChangeParams(
                              (prev) => ({
                                ...prev,
                                typography: {
                                  ...prev.typography,
                                  fontFamily: f.family,
                                  fontWeight: f.weights.includes(prev.typography.fontWeight)
                                    ? prev.typography.fontWeight
                                    : f.weights[0],
                                },
                              }),
                              true
                            )
                          }
                          className={`w-full flex items-center justify-between px-2.5 py-2 text-left transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#FF4D00]/15 text-[#F4F4F5]'
                              : 'hover:bg-white/5 text-[#A1A1AA]'
                          }`}
                        >
                          <span
                            className="text-xs truncate pr-2"
                            style={{ fontFamily: `"${f.family}", sans-serif` }}
                          >
                            {f.family}
                          </span>
                          <span className="text-[10px] font-mono text-[#71717A] shrink-0 uppercase">
                            {f.provider}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {fontTab === 'google' && (
                <form onSubmit={handleLoadGoogle} className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={googleInput}
                    onChange={(e) => setGoogleInput(e.target.value)}
                    placeholder="Any Google Font (e.g. Rubik Glitch)"
                    className="bg-[#09090B] border border-white/12 px-2.5 py-1.5 text-xs text-[#F4F4F5] focus:outline-none focus:border-[#FF4D00]"
                  />
                  <button
                    type="submit"
                    disabled={fontLoading || !googleInput.trim()}
                    className="py-1.5 px-3 bg-[#181A1F] hover:bg-white/10 disabled:opacity-40 border border-white/12 text-xs font-medium text-[#F4F4F5] cursor-pointer"
                  >
                    {fontLoading ? 'Loading Font...' : 'Load Google Font'}
                  </button>
                </form>
              )}

              {fontTab === 'adobe' && (
                <div className="flex flex-col gap-2">
                  <form onSubmit={handleConnectAdobe} className="flex flex-col gap-1.5">
                    <input
                      type="text"
                      value={adobeProjectId}
                      onChange={(e) => setAdobeProjectId(e.target.value)}
                      placeholder="Adobe Typekit Project ID (e.g. abc1def)"
                      className="bg-[#09090B] border border-white/12 px-2.5 py-1.5 text-xs font-mono text-[#F4F4F5] focus:outline-none focus:border-[#FF4D00]"
                    />
                    <button
                      type="submit"
                      disabled={fontLoading || !adobeProjectId.trim()}
                      className="py-1.5 px-3 bg-[#181A1F] hover:bg-white/10 disabled:opacity-40 border border-white/12 text-xs font-medium text-[#F4F4F5] cursor-pointer"
                    >
                      {fontLoading ? 'Connecting Kit...' : 'Connect Adobe Fonts Kit'}
                    </button>
                  </form>

                  <form onSubmit={handleApplyAdobeFamily} className="flex gap-1.5">
                    <input
                      type="text"
                      value={adobeFamilyInput}
                      onChange={(e) => setAdobeFamilyInput(e.target.value)}
                      placeholder="Kit font-family name"
                      className="flex-1 min-w-0 bg-[#09090B] border border-white/12 px-2 py-1.5 text-xs text-[#F4F4F5] focus:outline-none focus:border-[#FF4D00]"
                    />
                    <button
                      type="submit"
                      disabled={!adobeFamilyInput.trim()}
                      className="px-2.5 py-1.5 bg-[#FF4D00] hover:bg-[#E04400] disabled:opacity-40 text-xs font-medium text-white cursor-pointer shrink-0"
                    >
                      Apply
                    </button>
                  </form>
                </div>
              )}

              {fontTab === 'upload' && (
                <div className="flex flex-col gap-2">
                  <input
                    ref={fontInputRef}
                    type="file"
                    accept=".ttf,.otf,.woff,.woff2"
                    className="hidden"
                    onChange={handleLocalFontChange}
                  />
                  <button
                    type="button"
                    onClick={() => fontInputRef.current?.click()}
                    disabled={fontLoading}
                    className="inline-flex items-center justify-center gap-2 py-2 px-3 bg-[#181A1F] hover:bg-white/10 border border-white/12 text-xs font-medium text-[#F4F4F5] cursor-pointer"
                  >
                    <Type className="w-3.5 h-3.5 text-[#FF4D00]" />
                    <span>Upload TTF / OTF / WOFF2</span>
                  </button>
                </div>
              )}

              {fontFeedback && (
                <p
                  className={`text-[11px] leading-snug ${
                    fontFeedback.type === 'error' ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {fontFeedback.msg}
                </p>
              )}
            </div>

            {/* Blend Mode & Color */}
            <div className="flex flex-col gap-1.5 pt-1 border-t border-white/8">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#A1A1AA]">Optical Blend Mode</span>
                <input
                  type="color"
                  value={params.typography.color}
                  onChange={(e) =>
                    onChangeParams((prev) => ({
                      ...prev,
                      typography: { ...prev.typography, color: e.target.value },
                    }))
                  }
                  className="w-6 h-5 bg-transparent border border-white/15 cursor-pointer"
                  title="Typography color"
                />
              </div>
              <select
                value={params.typography.blendMode}
                onChange={(e) =>
                  onChangeParams(
                    (prev) => ({
                      ...prev,
                      typography: {
                        ...prev.typography,
                        blendMode: e.target.value as TypographyBlendMode,
                      },
                    }),
                    true
                  )
                }
                className="bg-[#09090B] border border-white/12 px-2.5 py-1.5 text-xs text-[#F4F4F5] focus:outline-none focus:border-[#FF4D00]"
              >
                {blendModes.map((bm) => (
                  <option key={bm.id} value={bm.id}>
                    {bm.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Alignment & Weight */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex border border-white/10 bg-[#09090B]">
                {(
                  [
                    { id: 'left', icon: AlignLeft },
                    { id: 'center', icon: AlignCenter },
                    { id: 'right', icon: AlignRight },
                  ] as const
                ).map((a) => {
                  const Icon = a.icon;
                  const active = params.typography.align === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() =>
                        onChangeParams(
                          (prev) => ({
                            ...prev,
                            typography: { ...prev.typography, align: a.id },
                          }),
                          true
                        )
                      }
                      className={`flex-1 py-1.5 flex items-center justify-center cursor-pointer ${
                        active ? 'bg-[#181A1F] text-[#FF4D00]' : 'text-[#71717A]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </button>
                  );
                })}
              </div>

              <select
                value={params.typography.fontWeight}
                onChange={(e) =>
                  onChangeParams(
                    (prev) => ({
                      ...prev,
                      typography: {
                        ...prev.typography,
                        fontWeight: Number(e.target.value),
                      },
                    }),
                    true
                  )
                }
                className="bg-[#09090B] border border-white/10 px-2 py-1 text-xs font-mono text-[#F4F4F5]"
              >
                {[400, 500, 600, 700, 800, 900].map((w) => (
                  <option key={w} value={w}>
                    Weight {w}
                  </option>
                ))}
              </select>
            </div>

            <StudioSlider
              label="Scale"
              value={params.typography.fontSize}
              min={6}
              max={44}
              step={1}
              defaultValue={28}
              unit="%"
              onChange={(v) =>
                onChangeParams((prev) => ({
                  ...prev,
                  typography: { ...prev.typography, fontSize: v },
                }))
              }
            />

            <StudioSlider
              label="Tracking"
              value={params.typography.letterSpacing}
              min={-0.12}
              max={0.35}
              step={0.01}
              defaultValue={-0.03}
              unit="em"
              onChange={(v) =>
                onChangeParams((prev) => ({
                  ...prev,
                  typography: { ...prev.typography, letterSpacing: v },
                }))
              }
            />

            <StudioSlider
              label="Line Height"
              value={params.typography.lineHeight}
              min={0.7}
              max={1.5}
              step={0.02}
              defaultValue={0.86}
              onChange={(v) =>
                onChangeParams((prev) => ({
                  ...prev,
                  typography: { ...prev.typography, lineHeight: v },
                }))
              }
            />

            <StudioSlider
              label="Echo Trails"
              value={params.typography.echoCount}
              min={0}
              max={10}
              step={1}
              defaultValue={3}
              onChange={(v) =>
                onChangeParams((prev) => ({
                  ...prev,
                  typography: { ...prev.typography, echoCount: v },
                }))
              }
            />

            {params.typography.echoCount > 0 && (
              <div className="grid grid-cols-2 gap-2">
                <StudioSlider
                  label="Echo X"
                  value={params.typography.echoOffsetX}
                  min={-60}
                  max={60}
                  step={1}
                  defaultValue={16}
                  onChange={(v) =>
                    onChangeParams((prev) => ({
                      ...prev,
                      typography: { ...prev.typography, echoOffsetX: v },
                    }))
                  }
                />
                <StudioSlider
                  label="Echo Y"
                  value={params.typography.echoOffsetY}
                  min={-60}
                  max={60}
                  step={1}
                  defaultValue={-12}
                  onChange={(v) =>
                    onChangeParams((prev) => ({
                      ...prev,
                      typography: { ...prev.typography, echoOffsetY: v },
                    }))
                  }
                />
              </div>
            )}

            <StudioSlider
              label="Cylindrical Warp"
              value={params.typography.perspectiveCurve}
              min={-1}
              max={1}
              step={0.02}
              defaultValue={0}
              onChange={(v) =>
                onChangeParams((prev) => ({
                  ...prev,
                  typography: { ...prev.typography, perspectiveCurve: v },
                }))
              }
            />

            <div className="pt-2 border-t border-white/8 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#A1A1AA]">
                  Grids & Editorial Overlays
                </span>
                <input
                  type="color"
                  value={params.typography.gridColor}
                  onChange={(e) =>
                    onChangeParams((prev) => ({
                      ...prev,
                      typography: { ...prev.typography, gridColor: e.target.value },
                    }))
                  }
                  title="Grid & Starburst Accent Color"
                  className="w-6 h-5 bg-transparent border border-white/15 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs text-[#A1A1AA]">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={params.typography.ringAccent}
                    onChange={(e) =>
                      onChangeParams(
                        (prev) => ({
                          ...prev,
                          typography: {
                            ...prev.typography,
                            ringAccent: e.target.checked,
                          },
                        }),
                        true
                      )
                    }
                    className="accent-[#FF4D00]"
                  />
                  <span>Orbital Ring</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={params.typography.gridCrosshairs}
                    onChange={(e) =>
                      onChangeParams(
                        (prev) => ({
                          ...prev,
                          typography: {
                            ...prev.typography,
                            gridCrosshairs: e.target.checked,
                          },
                        }),
                        true
                      )
                    }
                    className="accent-[#FF4D00]"
                  />
                  <span>Crosshairs</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={params.typography.technicalGrid}
                    onChange={(e) =>
                      onChangeParams(
                        (prev) => ({
                          ...prev,
                          typography: {
                            ...prev.typography,
                            technicalGrid: e.target.checked,
                          },
                        }),
                        true
                      )
                    }
                    className="accent-[#FF4D00]"
                  />
                  <span>Technical Grid</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={params.typography.perspectiveGrid}
                    onChange={(e) =>
                      onChangeParams(
                        (prev) => ({
                          ...prev,
                          typography: {
                            ...prev.typography,
                            perspectiveGrid: e.target.checked,
                          },
                        }),
                        true
                      )
                    }
                    className="accent-[#FF4D00]"
                  />
                  <span>3D Horizon Grid</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer col-span-2">
                  <input
                    type="checkbox"
                    checked={params.typography.starAccent}
                    onChange={(e) =>
                      onChangeParams(
                        (prev) => ({
                          ...prev,
                          typography: {
                            ...prev.typography,
                            starAccent: e.target.checked,
                          },
                        }),
                        true
                      )
                    }
                    className="accent-[#FF4D00]"
                  />
                  <span>4-Point Starburst Emblem</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
