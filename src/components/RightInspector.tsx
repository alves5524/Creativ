import React from 'react';
import { THERMAL_PALETTES } from '../data/presets';
import {
  MotionBlurMode,
  StudioParams,
  ThermalPaletteId,
} from '../types/studio';
import { StudioSlider } from './StudioSlider';

interface RightInspectorProps {
  params: StudioParams;
  onChangeParams: (updater: (prev: StudioParams) => StudioParams, commit?: boolean) => void;
}

export const RightInspector: React.FC<RightInspectorProps> = ({
  params,
  onChangeParams,
}) => {
  const paletteEntries = Object.entries(THERMAL_PALETTES) as [
    ThermalPaletteId,
    { name: string; stops: [string, string, string, string] }
  ][];

  const activeStops =
    params.thermal.palette === 'custom'
      ? params.thermal.customStops
      : THERMAL_PALETTES[params.thermal.palette].stops;

  const blurModes: { id: MotionBlurMode; label: string }[] = [
    { id: 'directional', label: 'Directional' },
    { id: 'radial', label: 'Radial' },
    { id: 'spin', label: 'Spin' },
    { id: 'slit_scan', label: 'Slit-Scan' },
    { id: 'cross_axis', label: 'Cross-Axis' },
    { id: 'crt_streak', label: 'CRT Streak' },
  ];

  return (
    <aside className="w-[320px] shrink-0 h-full bg-[#111215] border-l border-white/8 flex flex-col overflow-y-auto">
      {/* Module 1: Thermal Camera */}
      <section className="p-4 border-b border-white/8 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2
            className="text-xs font-semibold tracking-wider uppercase text-[#F4F4F5]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Thermal Camera
          </h2>
          <button
            type="button"
            onClick={() =>
              onChangeParams(
                (prev) => ({
                  ...prev,
                  thermal: { ...prev.thermal, enabled: !prev.thermal.enabled },
                }),
                true
              )
            }
            className={`px-2 py-0.5 text-[10px] font-mono uppercase border transition-colors cursor-pointer ${
              params.thermal.enabled
                ? 'bg-[#FF4D00] border-[#FF4D00] text-white'
                : 'bg-[#181A1F] border-white/10 text-[#71717A]'
            }`}
          >
            {params.thermal.enabled ? 'Active' : 'Bypass'}
          </button>
        </div>

        {/* Live LUT Gradient Bar */}
        <div
          className="h-3 w-full border border-white/12"
          style={{
            background: `linear-gradient(90deg, ${activeStops[0]} 0%, ${activeStops[1]} 33%, ${activeStops[2]} 66%, ${activeStops[3]} 100%)`,
          }}
        />

        {/* Palette Selector */}
        <div className="grid grid-cols-2 gap-1">
          {paletteEntries.map(([id, def]) => {
            const active = params.thermal.palette === id;
            const stops = id === 'custom' ? params.thermal.customStops : def.stops;
            return (
              <button
                key={id}
                type="button"
                onClick={() =>
                  onChangeParams(
                    (prev) => ({
                      ...prev,
                      thermal: { ...prev.thermal, palette: id, enabled: true },
                    }),
                    true
                  )
                }
                className={`flex items-center justify-between gap-2 px-2 py-1.5 text-[11px] border transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#181A1F] border-[#FF4D00] text-[#F4F4F5]'
                    : 'bg-[#09090B]/70 border-white/6 text-[#A1A1AA] hover:text-[#F4F4F5]'
                }`}
              >
                <span className="truncate">{def.name}</span>
                <span
                  className="w-5 h-2.5 shrink-0 border border-white/15"
                  style={{
                    background: `linear-gradient(90deg, ${stops[0]}, ${stops[2]}, ${stops[3]})`,
                  }}
                />
              </button>
            );
          })}
        </div>

        {params.thermal.palette === 'custom' && (
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {params.thermal.customStops.map((hex, idx) => (
              <label key={idx} className="flex flex-col items-center gap-1">
                <input
                  type="color"
                  value={hex}
                  onChange={(e) => {
                    const nextStops = [...params.thermal.customStops] as [
                      string,
                      string,
                      string,
                      string
                    ];
                    nextStops[idx] = e.target.value;
                    onChangeParams((prev) => ({
                      ...prev,
                      thermal: { ...prev.thermal, customStops: nextStops },
                    }));
                  }}
                  className="w-full h-6 bg-transparent border border-white/15 cursor-pointer"
                />
                <span className="text-[10px] font-mono text-[#71717A]">
                  S{idx + 1}
                </span>
              </label>
            ))}
          </div>
        )}

        <StudioSlider
          label="LUT Mix"
          value={params.thermal.intensity}
          min={0}
          max={1}
          step={0.01}
          defaultValue={0.82}
          onChange={(v) =>
            onChangeParams((prev) => ({
              ...prev,
              thermal: { ...prev.thermal, intensity: v },
            }))
          }
        />

        <StudioSlider
          label="Temperature Bias"
          value={params.thermal.temperatureBias}
          min={-0.5}
          max={0.5}
          step={0.01}
          defaultValue={0.02}
          onChange={(v) =>
            onChangeParams((prev) => ({
              ...prev,
              thermal: { ...prev.thermal, temperatureBias: v },
            }))
          }
        />

        <StudioSlider
          label="Thermal Contrast"
          value={params.thermal.contrast}
          min={0.4}
          max={2.5}
          step={0.02}
          defaultValue={1.28}
          onChange={(v) =>
            onChangeParams((prev) => ({
              ...prev,
              thermal: { ...prev.thermal, contrast: v },
            }))
          }
        />

        <StudioSlider
          label="Contour Isolines"
          value={params.thermal.isolines}
          min={0}
          max={1}
          step={0.01}
          defaultValue={0.18}
          onChange={(v) =>
            onChangeParams((prev) => ({
              ...prev,
              thermal: { ...prev.thermal, isolines: v },
            }))
          }
        />

        <StudioSlider
          label="Heat Bloom"
          value={params.thermal.glow}
          min={0}
          max={1}
          step={0.01}
          defaultValue={0.38}
          onChange={(v) =>
            onChangeParams((prev) => ({
              ...prev,
              thermal: { ...prev.thermal, glow: v },
            }))
          }
        />
      </section>

      {/* Module 2: Motion Blur & Slit-Scan */}
      <section className="p-4 border-b border-white/8 flex flex-col gap-3">
        <h2
          className="text-xs font-semibold tracking-wider uppercase text-[#F4F4F5]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Motion Blur & Slit-Scan
        </h2>

        <div className="grid grid-cols-3 gap-1 bg-[#09090B] p-1 border border-white/8">
          {blurModes.map((m) => {
            const active = params.motionBlur.mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() =>
                  onChangeParams(
                    (prev) => ({
                      ...prev,
                      motionBlur: { ...prev.motionBlur, mode: m.id },
                    }),
                    true
                  )
                }
                className={`py-1.5 text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-[#FF4D00] text-white'
                    : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        <StudioSlider
          label="Blur Intensity"
          value={params.motionBlur.amount}
          min={0}
          max={1}
          step={0.01}
          defaultValue={0.34}
          onChange={(v) =>
            onChangeParams((prev) => ({
              ...prev,
              motionBlur: { ...prev.motionBlur, amount: v },
            }))
          }
        />

        <StudioSlider
          label="Vector Angle"
          value={params.motionBlur.angle}
          min={0}
          max={360}
          step={1}
          defaultValue={28}
          unit="°"
          onChange={(v) =>
            onChangeParams((prev) => ({
              ...prev,
              motionBlur: { ...prev.motionBlur, angle: v },
            }))
          }
        />

        <StudioSlider
          label="Trail Decay"
          value={params.motionBlur.trailDecay}
          min={0}
          max={1}
          step={0.01}
          defaultValue={0.62}
          onChange={(v) =>
            onChangeParams((prev) => ({
              ...prev,
              motionBlur: { ...prev.motionBlur, trailDecay: v },
            }))
          }
        />

        {params.motionBlur.mode === 'slit_scan' && (
          <StudioSlider
            label="Slit-Scan Frequency"
            value={params.motionBlur.slitFrequency}
            min={1}
            max={24}
            step={0.5}
            defaultValue={8}
            precision={1}
            onChange={(v) =>
              onChangeParams((prev) => ({
                ...prev,
                motionBlur: { ...prev.motionBlur, slitFrequency: v },
              }))
            }
          />
        )}

        <StudioSlider
          label="Spectral Color Echo"
          value={params.motionBlur.spectralEcho}
          min={0}
          max={1}
          step={0.01}
          defaultValue={0}
          onChange={(v) =>
            onChangeParams((prev) => ({
              ...prev,
              motionBlur: { ...prev.motionBlur, spectralEcho: v },
            }))
          }
        />

        <StudioSlider
          label="Shader Samples"
          value={params.motionBlur.samples}
          min={8}
          max={32}
          step={2}
          defaultValue={20}
          onChange={(v) =>
            onChangeParams((prev) => ({
              ...prev,
              motionBlur: { ...prev.motionBlur, samples: v },
            }))
          }
        />
      </section>

      {/* Module 3: Optics, Prism & Liquid Displacement */}
      <section className="p-4 border-b border-white/8 flex flex-col gap-3">
        <h2
          className="text-xs font-semibold tracking-wider uppercase text-[#F4F4F5]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Optics & Dispersion
        </h2>

        <StudioSlider
          label="Chromatic Dispersion"
          value={params.optics.chromaticAberration}
          min={0}
          max={1}
          step={0.01}
          defaultValue={0.42}
          onChange={(v) =>
            onChangeParams((prev) => ({
              ...prev,
              optics: { ...prev.optics, chromaticAberration: v },
            }))
          }
        />

        <StudioSlider
          label="Prism Angle"
          value={params.optics.prismAngle}
          min={0}
          max={360}
          step={1}
          defaultValue={142}
          unit="°"
          onChange={(v) =>
            onChangeParams((prev) => ({
              ...prev,
              optics: { ...prev.optics, prismAngle: v },
            }))
          }
        />

        <StudioSlider
          label="Liquid Displacement"
          value={params.optics.displacementAmount}
          min={0}
          max={1}
          step={0.01}
          defaultValue={0.24}
          onChange={(v) =>
            onChangeParams((prev) => ({
              ...prev,
              optics: { ...prev.optics, displacementAmount: v },
            }))
          }
        />

        <StudioSlider
          label="Turbulence Scale"
          value={params.optics.displacementScale}
          min={1}
          max={16}
          step={0.5}
          defaultValue={5.5}
          precision={1}
          onChange={(v) =>
            onChangeParams((prev) => ({
              ...prev,
              optics: { ...prev.optics, displacementScale: v },
            }))
          }
        />

        <StudioSlider
          label="Vertical Pixel Melt"
          value={params.optics.pixelMelt}
          min={0}
          max={1}
          step={0.01}
          defaultValue={0}
          onChange={(v) =>
            onChangeParams((prev) => ({
              ...prev,
              optics: { ...prev.optics, pixelMelt: v },
            }))
          }
        />
      </section>

      {/* Module 4: Grain, Dither, Scanlines & Animation */}
      <section className="p-4 flex flex-col gap-3">
        <h2
          className="text-xs font-semibold tracking-wider uppercase text-[#F4F4F5]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Dither, Grain & Loop
        </h2>

        <div className="grid grid-cols-2 gap-1 bg-[#09090B] p-1 border border-white/8">
          {(['film', 'stipple'] as const).map((gt) => (
            <button
              key={gt}
              type="button"
              onClick={() =>
                onChangeParams(
                  (prev) => ({
                    ...prev,
                    optics: { ...prev.optics, grainType: gt },
                  }),
                  true
                )
              }
              className={`py-1 text-[11px] font-medium capitalize transition-colors cursor-pointer ${
                params.optics.grainType === gt
                  ? 'bg-[#FF4D00] text-white'
                  : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
              }`}
            >
              {gt === 'film' ? 'Film Grain' : 'Stipple Grain'}
            </button>
          ))}
        </div>

        <StudioSlider
          label="Grain Intensity"
          value={params.optics.ditherGrain}
          min={0}
          max={1}
          step={0.01}
          defaultValue={0.26}
          onChange={(v) =>
            onChangeParams((prev) => ({
              ...prev,
              optics: { ...prev.optics, ditherGrain: v },
            }))
          }
        />

        <StudioSlider
          label="Bayer 4×4 Dither"
          value={params.optics.bayerDither}
          min={0}
          max={1}
          step={0.01}
          defaultValue={0}
          onChange={(v) =>
            onChangeParams((prev) => ({
              ...prev,
              optics: { ...prev.optics, bayerDither: v },
            }))
          }
        />

        <StudioSlider
          label="CRT Scanlines"
          value={params.optics.scanlineMix}
          min={0}
          max={1}
          step={0.01}
          defaultValue={0}
          onChange={(v) =>
            onChangeParams((prev) => ({
              ...prev,
              optics: { ...prev.optics, scanlineMix: v },
            }))
          }
        />

        <StudioSlider
          label="Halftone Screen"
          value={params.optics.halftoneMix}
          min={0}
          max={1}
          step={0.01}
          defaultValue={0}
          onChange={(v) =>
            onChangeParams((prev) => ({
              ...prev,
              optics: { ...prev.optics, halftoneMix: v },
            }))
          }
        />

        <StudioSlider
          label="Oscillation Speed"
          value={params.animation.speed}
          min={0.1}
          max={3}
          step={0.05}
          defaultValue={1.0}
          unit="×"
          onChange={(v) =>
            onChangeParams((prev) => ({
              ...prev,
              animation: { ...prev.animation, speed: v },
            }))
          }
        />

        <StudioSlider
          label="Motion Wave"
          value={params.animation.motionWave}
          min={0}
          max={1}
          step={0.01}
          defaultValue={0.45}
          onChange={(v) =>
            onChangeParams((prev) => ({
              ...prev,
              animation: { ...prev.animation, motionWave: v },
            }))
          }
        />

        <StudioSlider
          label="Thermal Pulse"
          value={params.animation.thermalPulse}
          min={0}
          max={1}
          step={0.01}
          defaultValue={0.22}
          onChange={(v) =>
            onChangeParams((prev) => ({
              ...prev,
              animation: { ...prev.animation, thermalPulse: v },
            }))
          }
        />
      </section>
    </aside>
  );
};
