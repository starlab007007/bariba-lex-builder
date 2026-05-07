import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'solid' | 'dark';
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  animate?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  variant = 'default',
  className,
  padding = 'md',
  animate = true,
}) => {
  const baseClasses = {
    default: 'glass-card',
    solid: 'glass-card-solid',
    dark: 'glass-card-dark',
  };

  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const Component = animate ? motion.div : 'div';
  const animationProps = animate ? {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 },
  } : {};

  return (
    <Component
      {...animationProps}
      className={cn(baseClasses[variant], paddingClasses[padding], className)}
    >
      {children}
    </Component>
  );
};

interface GlassPillProps {
  children: React.ReactNode;
  active?: boolean;
  variant?: 'default' | 'rose' | 'accent';
  className?: string;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export const GlassPill: React.FC<GlassPillProps> = ({
  children,
  active = false,
  variant = 'default',
  className,
  onClick,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const variantClasses = {
    default: active ? 'glass-pill-active' : 'glass-pill',
    rose: 'glass-pill-rose',
    accent: 'glass-pill-active',
  };

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={cn(
        variantClasses[variant],
        sizeClasses[size],
        'font-medium transition-all duration-200',
        className
      )}
    >
      {children}
    </motion.button>
  );
};

interface ActionButtonProps {
  icon: React.ReactNode;
  count?: number | string;
  liked?: boolean;
  className?: string;
  onClick?: () => void;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  count,
  liked = false,
  className,
  onClick,
}) => {
  return (
    <div className="action-item">
      <motion.button
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.08 }}
        onClick={onClick}
        className={cn(
          'action-button',
          liked && 'action-button-liked',
          className
        )}
      >
        {icon}
      </motion.button>
      {count !== undefined && (
        <span className="action-count">{count}</span>
      )}
    </div>
  );
};

interface TemplateCardProps {
  image: string;
  label: string;
  onClick?: () => void;
  className?: string;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  image,
  label,
  onClick,
  className,
}) => {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      whileHover={{ y: -4, scale: 1.02 }}
      onClick={onClick}
      className={cn('template-card', className)}
    >
      <img src={image} alt={label} />
      <div className="template-card-label">{label}</div>
    </motion.button>
  );
};

interface EditButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  className?: string;
}

export const EditButton: React.FC<EditButtonProps> = ({
  icon,
  label,
  onClick,
  className,
}) => {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={cn('edit-button', className)}
    >
      <div className="edit-button-icon">{icon}</div>
      <span className="text-xs font-medium text-foreground/80">{label}</span>
    </motion.button>
  );
};

interface SheetHandleProps {
  className?: string;
}

export const SheetHandle: React.FC<SheetHandleProps> = ({ className }) => {
  return <div className={cn('sheet-handle', className)} />;
};
