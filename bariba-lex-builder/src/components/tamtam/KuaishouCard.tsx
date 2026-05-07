import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface KuaishouCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'outlined';
  onClick?: () => void;
  animate?: boolean;
}

export const KuaishouCard: React.FC<KuaishouCardProps> = ({
  children,
  className,
  variant = 'default',
  onClick,
  animate = true,
}) => {
  const baseStyles = 'rounded-2xl transition-all duration-200';
  
  const variantStyles = {
    default: 'bg-[hsl(var(--kuaishou-white))] border border-[hsl(var(--kuaishou-border))]',
    elevated: 'bg-[hsl(var(--kuaishou-white))] shadow-[0_2px_8px_rgba(0,0,0,0.06)]',
    outlined: 'bg-transparent border-2 border-[hsl(var(--kuaishou-border))]',
  };

  const Component = animate ? motion.div : 'div';
  const motionProps = animate
    ? {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        whileTap: onClick ? { scale: 0.98 } : undefined,
      }
    : {};

  return (
    <Component
      className={cn(
        baseStyles,
        variantStyles[variant],
        onClick && 'cursor-pointer hover:border-[hsl(var(--kuaishou-orange)/0.5)]',
        className
      )}
      onClick={onClick}
      {...motionProps}
    >
      {children}
    </Component>
  );
};

export default KuaishouCard;
