import { useCallback, useRef } from "react";

interface ParamSliderProps {
  name: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  accent?: string;
  onChange: (name: string, value: number) => void;
}

export function ParamSlider({
  name,
  label,
  value,
  min,
  max,
  step,
  accent = "var(--accent-phase)",
  onChange,
}: ParamSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const fraction = (value - min) / (max - min);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const el = sliderRef.current;
      if (!el) return;
      el.setPointerCapture(e.pointerId);

      const update = (clientX: number) => {
        const rect = el.getBoundingClientRect();
        const rawFrac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const rawVal = min + rawFrac * (max - min);
        const snapped = Math.round(rawVal / step) * step;
        const clamped = Math.max(min, Math.min(max, snapped));
        onChange(name, parseFloat(clamped.toFixed(10)));
      };

      update(e.clientX);

      const onMove = (ev: PointerEvent) => update(ev.clientX);
      const onUp = () => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", onUp);
      };
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", onUp);
    },
    [name, min, max, step, onChange]
  );

  const displayValue =
    step >= 1 ? value.toFixed(0) : step >= 0.1 ? value.toFixed(1) : step >= 0.01 ? value.toFixed(2) : value.toFixed(4);

  return (
    <div className="px-4 py-1.5 no-select">
      <div className="flex items-center justify-between mb-1">
        <span className="label">{label}</span>
        <span className="value-mono text-xs" style={{ color: accent }}>
          {displayValue}
        </span>
      </div>
      <div
        ref={sliderRef}
        className="relative h-3 cursor-pointer flex items-center"
        onPointerDown={handlePointerDown}
      >
        {/* Track */}
        <div className="absolute inset-x-0 h-[2px] rounded-full bg-white/[0.08]" />
        {/* Fill */}
        <div
          className="absolute left-0 h-[2px] rounded-full"
          style={{
            width: `${fraction * 100}%`,
            background: accent,
          }}
        />
        {/* Thumb */}
        <div
          className="absolute w-[10px] h-[10px] rounded-full -translate-x-1/2"
          style={{
            left: `${fraction * 100}%`,
            background: accent,
            boxShadow: `0 0 6px ${accent}66`,
          }}
        />
      </div>
    </div>
  );
}
