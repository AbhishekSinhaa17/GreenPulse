import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'forest' | 'lime' | 'success' | 'warning' | 'error' | 'neutral';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'forest',
  size = 'md',
  className = '',
  ...props
}) => {
  const sizeStyles =
    size === 'sm'
      ? { fontSize: '0.7rem', padding: '0.15rem 0.5rem' }
      : {};

  return (
    <span
      className={`badge badge-${variant} ${className}`.trim()}
      style={sizeStyles}
      {...props}
    >
      {children}
    </span>
  );
};
