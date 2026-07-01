import React, { useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const defaultId = useId();
    const inputId = id || defaultId;

    return (
      <div className="w-full font-manrope text-left mb-4">
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold uppercase tracking-wider text-negro-carbon mb-2"
        >
          {label}
        </label>
        <input
          id={inputId}
          ref={ref}
          className={`w-full bg-crema-base text-negro-carbon border ${
            error ? 'border-red-500 focus:border-red-500' : 'border-gris-borde focus:border-negro-carbon'
          } px-4 py-3 outline-none transition-colors duration-200 text-sm placeholder:text-gris-suave ${className}`}
          {...props}
        />
        {error ? (
          <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
