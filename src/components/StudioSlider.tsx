import React from 'react';

interface StudioSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue: number;
  unit?: string;
  precision?: number;
  onChange: (value: number) => void;
  onCommit?: () => void;
}

export const StudioSlider: React.FC<StudioSliderProps> = ({
  label,
  value,
  min,
  max,
  step = 0.01,
  defaultValue,
  unit = '',
  precision = 2,
  onChange,
  onCommit,
}) => {
  const formatted =
    step >= 1 ? Math.round(value).toString() : value.toFixed(precision);

  return (
    <div
      className="flex flex-col gap-1 select-none"
      onDoubleClick={() => {
        onChange(defaultValue);
        onCommit?.();
      }}
      title="Double-click to reset to default"
    >
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#A1A1AA] font-medium truncate pr-2">{label}</span>
        <span className="font-mono tabular-nums text-[#F4F4F5] shrink-0">
          {formatted}
          {unit}
        </span>
      </div>
      <input
        type="range"
        className="studio-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onPointerUp={() => onCommit?.()}
        onKeyUp={() => onCommit?.()}
      />
    </div>
  );
};
