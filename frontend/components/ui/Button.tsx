import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'yellow' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'full' | 'icon';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-manrope font-semibold uppercase tracking-cta transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 border';
  
  const variants = {
    primary: 'bg-negro-carbon text-crema-base border-negro-carbon hover:bg-transparent hover:text-negro-carbon',
    secondary: 'bg-blanco-puro text-negro-carbon border-gris-borde hover:border-negro-carbon',
    outline: 'bg-transparent text-crema-base border-crema-base hover:bg-crema-base hover:text-negro-carbon',
    yellow: 'bg-acento-amarillo text-negro-carbon border-acento-amarillo hover:bg-transparent hover:text-acento-amarillo hover:border-acento-amarillo glow-yellow',
    ghost: 'bg-transparent text-crema-base hover:text-acento-amarillo',
  };

  const sizes = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
    full: 'w-full py-4 text-sm',
    icon: 'p-2', // icon size for social buttons
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : null}
      {children}
    </button>
  );
};
