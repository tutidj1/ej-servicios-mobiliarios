// 'use client';

import React from 'react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({ label, className, ...rest }) => {
  return (
    <label className={`inline-flex items-center space-x-2 cursor-pointer ${className}`}> 
      <input type="checkbox" className="h-4 w-4 text-negro-carbon border-gray-300 rounded-none focus:ring-0" {...rest} />
      <span className="font-manrope text-sm text-negro-carbon">{label}</span>
    </label>
  );
};
