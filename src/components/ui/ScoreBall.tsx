import React from 'react';

export interface ScoreBallProps {
  number: number;
  status?: 'default' | 'matched' | 'winning';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export const ScoreBall: React.FC<ScoreBallProps> = ({
  number,
  status = 'default',
  size = 'md',
  label,
}) => {
  const sizeMap = {
    sm: { width: '36px', height: '36px', fontSize: 'var(--text-sm)' },
    md: { width: '46px', height: '46px', fontSize: 'var(--text-lg)' },
    lg: { width: '58px', height: '58px', fontSize: 'var(--text-2xl)' },
  };

  const statusClass =
    status === 'matched'
      ? 'score-ball-matched'
      : status === 'winning'
      ? 'score-ball-winning'
      : '';

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <div
        className={`score-ball ${statusClass}`.trim()}
        style={sizeMap[size]}
        title={label || `Score ${number}`}
      >
        {number}
      </div>
      {label && (
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          {label}
        </span>
      )}
    </div>
  );
};
