'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'yellow' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'full' | 'icon';
  loading?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
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
    icon: 'p-2',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? 'Cargando...' : children}
    </button>
  );
}

export default Button;
