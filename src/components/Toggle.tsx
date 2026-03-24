'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

interface ToggleProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
}

const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ className = '', label, description, id, ...props }, ref) => {
    const toggleId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex items-center justify-between py-3">
        {label || description ? (
          <div className="flex-1">
            {label && (
              <label htmlFor={toggleId} className="text-sm font-medium text-foreground cursor-pointer">
                {label}
              </label>
            )}
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
        ) : null}
        <div className="relative">
          <input
            ref={ref}
            id={toggleId}
            type="checkbox"
            className="sr-only peer"
            {...props}
          />
          <div className="w-11 h-6 bg-secondary peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
        </div>
      </div>
    );
  }
);

Toggle.displayName = 'Toggle';

export { Toggle };
