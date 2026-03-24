'use client';

import { SliderHTMLAttributes, forwardRef } from 'react';

interface SliderProps extends SliderHTMLAttributes<HTMLInputElement> {
  label?: string;
  min: number;
  max: number;
  step?: number;
  showValue?: boolean;
  valueLabel?: string;
}

const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ className = '', label, min, max, step = 1, showValue = true, valueLabel, ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-2">
          {label && <label className="text-sm font-medium text-foreground">{label}</label>}
          {showValue && (
            <span className="text-sm text-muted-foreground font-mono">
              {valueLabel || props.value}
            </span>
          )}
        </div>
        <input
          ref={ref}
          type="range"
          min={min}
          max={max}
          step={step}
          className={`w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary ${className}`}
          {...props}
        />
        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </div>
    );
  }
);

Slider.displayName = 'Slider';

export { Slider };
