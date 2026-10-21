import React from 'react';

export interface PageContainerProps {
  children: React.ReactNode;
  narrow?: boolean;
  className?: string;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  narrow = false,
  className = '',
}) => {
  return (
    <main
      className={`${narrow ? 'container-narrow' : 'container'} ${className}`.trim()}
      style={{
        paddingTop: 'var(--space-8)',
        paddingBottom: 'var(--space-16)',
        minHeight: 'calc(100vh - 160px)',
      }}
    >
      {children}
    </main>
  );
};
