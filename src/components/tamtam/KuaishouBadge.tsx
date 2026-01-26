import React from 'react';
import { cn } from '@/lib/utils';

interface KuaishouBadgeProps {
  children: React.ReactNode;
  variant?: 'orange' | 'gray' | 'blue' | 'green' | 'red';
  size?: 'sm' | 'md';
  className?: string;
}

export const KuaishouBadge: React.FC<KuaishouBadgeProps> = ({
  children,
  variant = 'orange',
  size = 'sm',
  className,
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-full';
  
  const variantStyles = {
    orange: 'bg-[hsl(var(--kuaishou-orange)/0.15)] text-[hsl(var(--kuaishou-orange))]',
    gray: 'bg-[hsl(var(--kuaishou-gray-light))] text-[hsl(var(--kuaishou-text-muted))]',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
  };
  
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-3 py-1 text-xs',
  };

  return (
    <span className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}>
      {children}
    </span>
  );
};

export default KuaishouBadge;
