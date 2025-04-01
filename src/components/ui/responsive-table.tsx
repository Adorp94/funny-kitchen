import React from 'react';

interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
  noBorder?: boolean;
}

export function ResponsiveTable({ children, className = '', noBorder = false }: ResponsiveTableProps) {
  return (
    <div className={`w-full overflow-hidden ${noBorder ? '' : 'border border-gray-200 rounded-lg'} ${className}`}>
      <div className="overflow-x-auto w-full">
        {children}
      </div>
    </div>
  );
} 