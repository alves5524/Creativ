import React from 'react';
import { Download } from 'lucide-react';

export type WorkspaceFocus = 'presets' | 'media' | 'typography' | 'shaders' | 'mockups';

interface TopBarProps {
  activeFocus: WorkspaceFocus;
  onSelectFocus: (focus: WorkspaceFocus) => void;
  onOpenExport: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeFocus,
  onSelectFocus,
  onOpenExport,
}) => {
  const navItems: { id: WorkspaceFocus; label: string }[] = [
    { id: 'presets', label: 'Presets' },
    { id: 'media', label: 'Media' },
    { id: 'typography', label: 'Typography' },
    { id: 'shaders', label: 'Shaders' },
    { id: 'mockups', label: 'Mockups' },
  ];

  return (
    <header className="h-13 shrink-0 flex items-center justify-between gap-8 px-5 bg-[#111215] border-b border-white/8">
      {/* Zone 1: Single-element wordmark */}
      <span
        className="text-xl font-semibold tracking-wider text-[#F4F4F5] uppercase whitespace-nowrap shrink-0"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        THERMOKINETIC
      </span>

      {/* Zone 2: Concise single-line workspace navigation */}
      <nav className="hidden md:flex items-center gap-7 text-[13px] font-medium">
        {navItems.map((item) => {
          const isActive = activeFocus === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectFocus(item.id)}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b ${
                isActive
                  ? 'text-[#F4F4F5] border-[#FF4D00]'
                  : 'text-[#A1A1AA] border-transparent hover:text-[#F4F4F5]'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Single primary action */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onOpenExport}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#FF4D00] hover:bg-[#E04400] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Media</span>
        </button>
      </div>
    </header>
  );
};
