import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/Button';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { label: 'How It Works', path: '/#how-it-works' },
    { label: 'Charities', path: '/charities' },
    { label: 'Prize Draws', path: '/draws' },
    { label: 'Dashboard', path: '/dashboard' },
  ];

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        backgroundColor: 'rgba(251, 249, 244, 0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
        zIndex: 'var(--z-sticky)',
        transition: 'all var(--transition-base)',
      }}
    >
      <div className="container flex items-center justify-between" style={{ height: '76px' }}>
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3">
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--forest-800)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--lime-400)',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <span style={{ fontFamily: 'var(--font-editorial)', fontWeight: 700, fontSize: '1.25rem' }}>
              G
            </span>
          </div>
          <div>
            <span
              style={{
                fontFamily: 'var(--font-editorial)',
                fontWeight: 700,
                fontSize: '1.35rem',
                color: 'var(--forest-950)',
                letterSpacing: '-0.02em',
                lineHeight: 1,
                display: 'block',
              }}
            >
              GreenPulse
            </span>
            <span
              style={{
                fontSize: '0.65rem',
                color: 'var(--text-muted)',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                display: 'block',
                marginTop: '2px',
              }}
            >
              Play with purpose
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-8)',
          }}
          className="desktop-nav"
        >
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                style={{
                  fontSize: 'var(--text-sm)',
                  fontWeight: 500,
                  color: isActive ? 'var(--forest-800)' : 'var(--charcoal-700)',
                  transition: 'color var(--transition-fast)',
                  position: 'relative',
                  padding: '4px 0',
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Action CTAs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Link to="/admin" title="Admin Portal">
            <Button variant="ghost" size="sm" leftIcon={<ShieldCheck size={16} />}>
              Admin
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" size="sm">
              Sign In
            </Button>
          </Link>
          <Link to="/subscribe">
            <Button variant="primary" size="sm">
              Subscribe
            </Button>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-menu-btn"
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--charcoal-900)',
              padding: 'var(--space-2)',
            }}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          style={{
            padding: 'var(--space-6)',
            backgroundColor: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
          }}
        >
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                fontSize: 'var(--text-base)',
                fontWeight: 600,
                color: 'var(--charcoal-900)',
              }}
            >
              {link.label}
            </Link>
          ))}
          <div style={{ paddingTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)' }}>
            <Link to="/login" style={{ flex: 1 }} onClick={() => setMobileMenuOpen(false)}>
              <Button variant="outline" className="w-full">
                Sign In
              </Button>
            </Link>
            <Link to="/subscribe" style={{ flex: 1 }} onClick={() => setMobileMenuOpen(false)}>
              <Button variant="primary" className="w-full">
                Subscribe
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
