import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  ShieldCheck,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { useAuth } from "../../hooks/useAuth";

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, isAdmin, signOut } = useAuth();

  const navLinks = [
    { label: "How It Works", path: "/#how-it-works" },
    { label: "Charities", path: "/charities" },
    { label: "Prize Draws", path: "/draws" },
    ...(isAdmin
      ? [{ label: "Admin Portal", path: "/admin" }]
      : [{ label: "Dashboard", path: "/dashboard" }]),
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="gp-nav-header">
      <div
        className="container flex items-center justify-between"
        style={{ height: "76px" }}
      >
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 gp-nav-brand">
          <div className="gp-nav-logo">
            <span>G</span>
          </div>
          <div>
            <span className="gp-nav-brand-name">GreenPulse</span>
            <span className="brand-tagline gp-nav-tagline">
              Play with purpose
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="desktop-nav gp-nav-links">
          {navLinks.map((link) => {
            const isActive =
              link.path === "/admin"
                ? location.pathname.startsWith("/admin")
                : location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`gp-nav-link ${isActive ? "gp-nav-link-active" : ""}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Action CTAs & Auth Awareness */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
          }}
        >
          {user ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
              }}
            >
              <Link
                to={isAdmin ? "/admin" : "/dashboard"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                }}
                className="gp-user-chip"
                title={isAdmin ? "Operations Control Console" : "My Golfer Dashboard"}
              >
                <div className="gp-avatar" title={isAdmin ? "Administrator" : "Golfer"}>
                  {isAdmin ? <ShieldCheck size={16} /> : <UserIcon size={16} />}
                </div>
                <div
                  className="desktop-nav"
                  style={{ textAlign: "left", lineHeight: 1.2 }}
                >
                  <div
                    style={{
                      fontSize: "var(--text-xs)",
                      fontWeight: 600,
                      color: "var(--charcoal-900)",
                    }}
                  >
                    {profile?.full_name || user.email?.split("@")[0]}
                  </div>
                  <Badge variant={isAdmin ? "forest" : "lime"} size="sm">
                    {isAdmin ? "Admin" : "Golfer"}
                  </Badge>
                </div>
              </Link>
              <Button
                variant="outline"
                size="sm"
                className="desktop-only gp-signout-btn"
                onClick={handleSignOut}
                leftIcon={<LogOut size={14} />}
                title="Sign out of platform"
              >
                Sign Out
              </Button>
            </div>
          ) : (
            <div
              className="desktop-only"
              style={{ display: "flex", gap: "var(--space-2)" }}
            >
              <Link to="/login">
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/subscribe">
                <Button
                  variant="primary"
                  size="sm"
                  className="gp-subscribe-btn"
                >
                  Subscribe
                </Button>
              </Link>
            </div>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-menu-btn gp-burger-btn"
            style={{
              display: "none",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--charcoal-900)",
              padding: "var(--space-2)",
            }}
            aria-label="Toggle navigation menu"
          >
            <span
              className={`gp-burger-icon ${mobileMenuOpen ? "gp-burger-open" : ""}`}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Backdrop & Drawer */}
      {mobileMenuOpen && (
        <>
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="gp-mobile-backdrop"
            style={{
              position: "fixed",
              inset: "76px 0 0 0",
              zIndex: "calc(var(--z-drawer) - 1)",
            }}
          />
          <div
            className="gp-mobile-drawer"
            style={{
              position: "absolute",
              top: "76px",
              left: 0,
              right: 0,
              zIndex: "var(--z-drawer)",
              maxHeight: "calc(100vh - 76px)",
              overflowY: "auto",
            }}
          >
            {user && (
              <div className="gp-mobile-userbar">
                <div className="gp-avatar gp-avatar-lg">
                  <UserIcon size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      color: "var(--charcoal-900)",
                      fontSize: "var(--text-sm)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {profile?.full_name || user.email?.split("@")[0]}
                  </div>
                  <div
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "var(--text-muted)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {user.email}
                  </div>
                </div>
                <Badge variant={isAdmin ? "forest" : "lime"} size="sm">
                  {isAdmin ? "Admin" : "Golfer"}
                </Badge>
              </div>
            )}

            {navLinks.map((link, i) => {
              const isActive =
                link.path === "/admin"
                  ? location.pathname.startsWith("/admin")
                  : location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`gp-mobile-link ${link.path === "/admin" ? "gp-mobile-admin-link" : ""}`}
                  style={{
                    color: isActive ? "var(--forest-800)" : "var(--charcoal-900)",
                    animationDelay: `${i * 40}ms`,
                  }}
                >
                  {link.path === "/admin" && <ShieldCheck size={18} />}
                  {link.label}
                </Link>
              );
            })}

            <div className="gp-mobile-actions">
              {user ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  leftIcon={<LogOut size={16} />}
                >
                  Sign Out
                </Button>
              ) : (
                <>
                  <Link
                    to="/login"
                    style={{ flex: 1 }}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button variant="outline" className="w-full">
                      Sign In
                    </Button>
                  </Link>
                  <Link
                    to="/subscribe"
                    style={{ flex: 1 }}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button variant="primary" className="w-full">
                      Subscribe
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        .gp-nav-header {
          position: sticky;
          top: 0;
          background-color: rgba(251, 249, 244, 0.95);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border-subtle);
          z-index: var(--z-sticky);
          transition: box-shadow 0.3s ease;
        }

        .gp-nav-header:hover {
          box-shadow: 0 2px 16px -8px rgba(0,0,0,0.06);
        }

        .gp-nav-brand {
          text-decoration: none;
        }

        .gp-nav-logo {
          width: 38px;
          height: 38px;
          border-radius: var(--radius-sm);
          background-color: var(--forest-800);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--lime-400);
          box-shadow: var(--shadow-xs);
          transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease;
        }

        .gp-nav-brand:hover .gp-nav-logo {
          transform: rotate(-6deg) scale(1.08);
          box-shadow: 0 0 0 6px rgba(174, 213, 129, 0.15);
        }

        .gp-nav-logo span {
          font-family: var(--font-editorial);
          font-weight: 700;
          font-size: 1.25rem;
        }

        .gp-nav-brand-name {
          font-family: var(--font-editorial);
          font-weight: 700;
          font-size: 1.35rem;
          color: var(--forest-950);
          letter-spacing: -0.02em;
          line-height: 1;
          display: block;
          transition: color 0.25s ease;
        }

        .gp-nav-brand:hover .gp-nav-brand-name {
          color: var(--forest-700);
        }

        .gp-nav-tagline {
          font-size: 0.65rem;
          color: var(--text-muted);
          letter-spacing: 0.05em;
          text-transform: uppercase;
          display: block;
          margin-top: 2px;
        }

        .gp-nav-links {
          display: flex;
          align-items: center;
          gap: var(--space-8);
        }

        .gp-nav-link {
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--charcoal-700);
          transition: color 0.2s ease;
          position: relative;
          padding: 4px 0;
          text-decoration: none;
        }

        .gp-nav-link::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: 0;
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, #2e7d32, #43a047);
          border-radius: var(--radius-full);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .gp-nav-link:hover {
          color: var(--forest-800);
        }

        .gp-nav-link:hover::after {
          transform: scaleX(1);
        }

        .gp-nav-link-active {
          color: var(--forest-800);
        }

        .gp-nav-link-active::after {
          transform: scaleX(1);
        }

        .gp-admin-btn,
        .gp-signout-btn {
          transition: transform 0.2s ease, box-shadow 0.2s ease !important;
        }

        .gp-admin-btn:hover,
        .gp-signout-btn:hover {
          transform: translateY(-1px);
        }

        .gp-subscribe-btn {
          transition: transform 0.2s ease, box-shadow 0.2s ease !important;
        }

        .gp-subscribe-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 18px -8px rgba(46, 125, 50, 0.45);
        }

        .gp-user-chip {
          text-decoration: none;
          border-radius: var(--radius-md);
          padding: 2px 4px;
          transition: background-color 0.2s ease;
        }

        .gp-user-chip:hover {
          background-color: rgba(46, 125, 50, 0.06);
        }

        .gp-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background-color: var(--forest-100);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--forest-800);
          font-size: 0.8rem;
          font-weight: 700;
          flex-shrink: 0;
          transition: box-shadow 0.25s ease;
        }

        .gp-user-chip:hover .gp-avatar {
          box-shadow: 0 0 0 3px rgba(46, 125, 50, 0.14);
        }

        .gp-avatar-lg {
          width: 38px;
          height: 38px;
        }

        .gp-burger-btn {
          border-radius: var(--radius-sm);
          transition: background-color 0.2s ease;
        }

        .gp-burger-icon {
          display: inline-flex;
          animation: gpBurgerPop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes gpBurgerPop {
          from { opacity: 0; transform: scale(0.6) rotate(-45deg); }
          to { opacity: 1; transform: scale(1) rotate(0); }
        }

        .gp-mobile-backdrop {
          background-color: rgba(7, 21, 14, 0.4);
          backdrop-filter: blur(3px);
          animation: gpFadeIn 0.25s ease;
        }

        @keyframes gpFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .gp-mobile-drawer {
          background-color: var(--bg-surface);
          border-bottom: 1px solid var(--border-default);
          box-shadow: var(--shadow-lg);
          padding: var(--space-6);
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          animation: gpDrawerSlide 0.3s cubic-bezier(0.22, 1, 0.36, 1);
          transform-origin: top;
        }

        @keyframes gpDrawerSlide {
          from { opacity: 0; transform: translateY(-12px) scaleY(0.98); }
          to { opacity: 1; transform: translateY(0) scaleY(1); }
        }

        .gp-mobile-userbar {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding-bottom: var(--space-4);
          border-bottom: 1px solid var(--border-subtle);
          animation: gpFadeIn 0.35s ease;
        }

        .gp-mobile-link {
          font-size: var(--text-base);
          font-weight: 600;
          padding: var(--space-2) 0;
          display: flex;
          align-items: center;
          gap: var(--space-2);
          text-decoration: none;
          position: relative;
          animation: gpLinkSlideIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
          transition: padding-left 0.2s ease, color 0.2s ease;
        }

        @keyframes gpLinkSlideIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .gp-mobile-link:hover {
          padding-left: 6px;
          color: var(--forest-700);
        }

        .gp-mobile-admin-link {
          color: var(--forest-800);
        }

        .gp-mobile-actions {
          padding-top: var(--space-4);
          border-top: 1px solid var(--border-subtle);
          display: flex;
          gap: var(--space-3);
          animation: gpFadeIn 0.4s ease;
        }

        @media (prefers-reduced-motion: reduce) {
          .gp-nav-logo, .gp-nav-brand-name, .gp-nav-link::after,
          .gp-burger-icon, .gp-mobile-backdrop, .gp-mobile-drawer,
          .gp-mobile-userbar, .gp-mobile-link, .gp-mobile-actions,
          .gp-subscribe-btn, .gp-admin-btn, .gp-signout-btn, .gp-avatar {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </header>
  );
};
