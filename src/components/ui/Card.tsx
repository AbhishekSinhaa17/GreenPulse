import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'warm' | 'forest';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  style,
  ...props
}) => {
  const variantClass = variant !== 'default' ? `card-${variant}` : '';
  const paddingMap = {
    none: '0',
    sm: 'var(--space-4)',
    md: 'var(--space-6)',
    lg: 'var(--space-8)',
  };

  return (
    <div
      className={`card ${variantClass} ${className}`.trim()}
      style={{ padding: paddingMap[padding], ...style }}
      {...props}
    >
      {children}
    </div>
  );
};
