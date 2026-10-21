import React, { useState } from 'react';
import { AlertCircle, Terminal, X } from 'lucide-react';
import { env } from '../../lib/env';
import { Dialog } from './Dialog';
import { Button } from './Button';

export const ConfigBanner: React.FC = () => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (env.isSupabaseConfigured || isDismissed) {
    return null;
  }

  return (
    <>
      <div
        role="alert"
        style={{
          backgroundColor: 'var(--color-warning-bg)',
          borderBottom: '1px solid var(--color-warning-border)',
          padding: 'var(--space-2) var(--space-4)',
          fontSize: 'var(--text-xs)',
          color: 'var(--charcoal-900)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-3)',
          position: 'sticky',
          top: 0,
          zIndex: 'calc(var(--z-sticky) + 10)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <AlertCircle size={16} color="var(--color-warning)" style={{ flexShrink: 0 }} />
          <span>
            <strong>Supabase Setup Required:</strong> Backend-dependent operations (Auth, Score
            Recording, Draw Publishing) are running in read-only mock mode until valid credentials
            are supplied in <code>.env</code>.
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Terminal size={14} />}
            style={{ padding: '0.25rem 0.5rem', fontSize: 'var(--text-xs)' }}
          >
            Setup Instructions
          </Button>
          <button
            onClick={() => setIsDismissed(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--charcoal-500)',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="Dismiss banner"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Supabase Backend Setup"
        description="Follow these steps to connect GreenPulse to a new Supabase project."
        footer={
          <Button variant="primary" onClick={() => setIsModalOpen(false)}>
            Close
          </Button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', fontSize: 'var(--text-sm)' }}>
          <div>
            <strong>1. Create or open your Supabase project:</strong>
            <p className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
              Head to <a href="https://supabase.com" target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>supabase.com</a> and create a project named <code>GreenPulse</code>.
            </p>
          </div>

          <div>
            <strong>2. Apply database migrations:</strong>
            <p className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
              Copy the contents of <code>supabase/migrations/20261021000000_phase2_baseline_schema.sql</code> and run it in the Supabase SQL Editor.
            </p>
          </div>

          <div>
            <strong>3. Configure environment variables:</strong>
            <p className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
              Create a <code>.env</code> file in the project root with your project credentials:
            </p>
            <pre
              style={{
                backgroundColor: 'var(--forest-950)',
                color: 'var(--lime-300)',
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                overflowX: 'auto',
                marginTop: 'var(--space-1)',
              }}
            >
              {`VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>`}
            </pre>
          </div>

          <div>
            <strong>4. Restart Vite:</strong>
            <p className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
              Restart your development server to load the environment variables.
            </p>
          </div>
        </div>
      </Dialog>
    </>
  );
};
