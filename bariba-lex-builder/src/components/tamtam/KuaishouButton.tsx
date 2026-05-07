import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KuaishouButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const KuaishouButton: React.FC<KuaishouButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className,
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 rounded-full';
  
  const variantStyles = {
    primary: 'bg-[hsl(var(--kuaishou-orange))] text-white shadow-lg shadow-[hsl(var(--kuaishou-orange)/0.3)] hover:bg-[hsl(var(--kuaishou-primary-dark))]',
    secondary: 'bg-[hsl(var(--kuaishou-gray-light))] text-[hsl(var(--kuaishou-text))] hover:bg-[hsl(var(--kuaishou-border))]',
    outline: 'border-2 border-[hsl(var(--kuaishou-orange))] text-[hsl(var(--kuaishou-orange))] bg-transparent hover:bg-[hsl(var(--kuaishou-orange)/0.1)]',
    ghost: 'text-[hsl(var(--kuaishou-text))] hover:bg-[hsl(var(--kuaishou-gray-light))]',
  };
  
  const sizeStyles = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
  };
  
  const isDisabled = disabled || isLoading;

  return (
    <motion.button
      whileTap={{ scale: isDisabled ? 1 : 0.97 }}
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        isDisabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={isDisabled}
      {...(props as any)}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        leftIcon
      )}
      {children}
      {!isLoading && rightIcon}
    </motion.button>
  );
};

export default KuaishouButton;
