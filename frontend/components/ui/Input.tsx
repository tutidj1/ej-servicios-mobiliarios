import React, { useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

// Texto de 16px en celular: por debajo de eso iOS hace zoom al tocar el campo.
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const defaultId = useId();
    const inputId = id || defaultId;
    const errorId = `${inputId}-error`;

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
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`w-full min-h-[48px] bg-crema-base text-negro-carbon border ${
            error ? 'border-red-600 focus:border-red-600' : 'border-gris-borde focus:border-negro-carbon'
          } px-4 py-3 outline-none transition-colors duration-200 text-base sm:text-sm placeholder:text-gris-suave ${className}`}
          {...props}
        />
        {error ? (
          <p id={errorId} role="alert" className="mt-1 text-xs text-red-600 font-medium">
            {error}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
