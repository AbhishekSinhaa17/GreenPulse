import React, { useMemo, useState } from 'react';
import { Dialog } from '../../../components/ui/Dialog';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../context/ToastContext';
import { adminService } from '../../../services/adminService';
import type { UserProfile, UserRole } from '../../../types';
import { User, Target, MapPin, ShieldCheck, Lock, Sparkles } from 'lucide-react';

interface EditUserModalProps {
  userToEdit: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: () => Promise<void>;
  currentUserId?: string;
}

const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

export const EditUserModal: React.FC<EditUserModalProps> = ({
  userToEdit,
  isOpen,
  onClose,
  onSaveSuccess,
  currentUserId,
}) => {
  const { success, warning, error } = useToast();
  const [editUserName, setEditUserName] = useState(userToEdit.full_name || '');
  const [editUserHandicap, setEditUserHandicap] = useState(
    userToEdit.handicap !== undefined && userToEdit.handicap !== null
      ? String(userToEdit.handicap)
      : ''
  );
  const [editUserHomeClub, setEditUserHomeClub] = useState(userToEdit.home_club || '');
  const [editUserRole, setEditUserRole] = useState<UserRole>(userToEdit.role || 'subscriber');
  const [isSavingUser, setIsSavingUser] = useState(false);

  const isSelf = currentUserId === userToEdit.id;

  const handicapPct = useMemo(() => {
    const h = parseFloat(editUserHandicap);
    if (isNaN(h)) return null;
    const clamped = Math.min(Math.max(h, -10), 54);
    return ((clamped + 10) / 64) * 100;
  }, [editUserHandicap]);

  const handleSave = async () => {
    let parsedHandicap: number | null = null;
    if (editUserHandicap.trim() !== '') {
      const h = parseFloat(editUserHandicap);
      if (isNaN(h) || h < -10.0 || h > 54.0) {
        warning('Invalid Handicap', 'Handicap WHS index must be between -10.0 and 54.0.');
        return;
      }
      parsedHandicap = h;
    }

    // Check self-demotion on frontend
    if (isSelf && editUserRole === 'subscriber') {
      warning('Action Blocked', 'Self-demotion is prohibited. You cannot remove your own administrator status.');
      return;
    }

    setIsSavingUser(true);
    try {
      await adminService.updateUserProfile(
        userToEdit.id,
        {
          full_name: editUserName.trim() || undefined,
          handicap: parsedHandicap,
          home_club: editUserHomeClub.trim() || null,
          role: editUserRole,
        },
        currentUserId
      );

      success('Profile Updated', `Successfully updated profile for ${editUserName || userToEdit.email}`);
      onClose();
      await onSaveSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile.';
      error('Update Failed', msg);
    } finally {
      setIsSavingUser(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Profile: ${userToEdit.full_name || userToEdit.email}`}
      description="Update permitted profile fields, World Handicap System (WHS) index, and role."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" isLoading={isSavingUser} onClick={handleSave}>
            Save Changes
          </Button>
        </>
      }
    >
      <div className="eu-wrap">
        <style>{`
          @keyframes euFadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes euPulseRing {
            0%, 100% { box-shadow: 0 0 0 0 rgba(251,140,0,0.3); }
            50% { box-shadow: 0 0 0 7px rgba(251,140,0,0); }
          }
          @keyframes euGaugeFill {
            from { width: 0%; }
          }

          .eu-wrap {
            display: flex;
            flex-direction: column;
            gap: var(--space-5);
            animation: euFadeIn 0.3s ease;
          }

          .eu-identity-header {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 14px 16px;
            border-radius: 14px;
            background: linear-gradient(135deg, var(--bg-surface-warm), #fff);
            border: 1px solid var(--border-default);
          }

          .eu-avatar {
            width: 46px;
            height: 46px;
            border-radius: 12px;
            flex-shrink: 0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 15px;
            color: #fff;
            background: linear-gradient(135deg, #2e7d32, #43a047);
            box-shadow: 0 3px 10px rgba(46,125,50,0.35);
          }

          .eu-identity-name {
            font-weight: 700;
            color: var(--forest-950);
            font-size: var(--text-base);
          }

          .eu-identity-email {
            font-size: var(--text-xs);
            color: var(--text-muted);
          }

          .eu-section {
            display: flex;
            flex-direction: column;
            gap: var(--space-3);
          }

          .eu-field-label {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: var(--text-xs);
            font-weight: 700;
            color: var(--charcoal-800);
          }

          .eu-field-label svg {
            color: #2e7d32;
          }

          .eu-input {
            width: 100%;
            padding: 9px 12px;
            border-radius: 10px;
            border: 1px solid var(--border-default);
            font-size: var(--text-sm);
            background: #fff;
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
          }

          .eu-input:focus {
            outline: none;
            border-color: #2e7d32;
            box-shadow: 0 0 0 3px rgba(46,125,50,0.14);
          }

          .eu-hint {
            font-size: 11px;
            color: var(--text-muted);
          }

          .eu-handicap-row {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .eu-handicap-row .eu-input {
            max-width: 120px;
          }

          .eu-gauge-wrap {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .eu-gauge-track {
            position: relative;
            height: 8px;
            border-radius: 999px;
            background: linear-gradient(90deg, #c8e6c9, #fff3e0, #ffccbc);
            overflow: hidden;
          }

          .eu-gauge-fill-marker {
            position: absolute;
            top: -3px;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #fff;
            border: 3px solid #2e7d32;
            box-shadow: 0 1px 4px rgba(0,0,0,0.3);
            transform: translateX(-50%);
            transition: left 0.3s ease;
          }

          .eu-gauge-labels {
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            color: var(--text-muted);
            font-weight: 700;
          }

          .eu-role-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }

          .eu-role-card {
            position: relative;
            display: flex;
            flex-direction: column;
            gap: 4px;
            padding: 12px 14px;
            border-radius: 12px;
            border: 1.5px solid var(--border-default);
            background: #fff;
            cursor: pointer;
            transition: all 0.2s ease;
            text-align: left;
          }

          .eu-role-card:hover:not(:disabled) {
            transform: translateY(-2px);
            border-color: #2e7d32;
          }

          .eu-role-card.active {
            border-color: #2e7d32;
            background: rgba(46,125,50,0.06);
            box-shadow: 0 4px 14px -8px rgba(46,125,50,0.5);
          }

          .eu-role-card:disabled {
            cursor: not-allowed;
            opacity: 0.6;
          }

          .eu-role-icon {
            width: 26px;
            height: 26px;
            border-radius: 8px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: var(--bg-surface-warm);
            color: var(--charcoal-600);
          }

          .eu-role-card.active .eu-role-icon {
            background: #2e7d32;
            color: #fff;
          }

          .eu-role-title {
            font-weight: 700;
            font-size: var(--text-sm);
            color: var(--forest-950);
          }

          .eu-role-sub {
            font-size: 10px;
            color: var(--text-muted);
          }

          .eu-guard-banner {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding: 11px 14px;
            border-radius: 12px;
            background: rgba(251,140,0,0.08);
            border: 1px solid rgba(251,140,0,0.3);
            animation: euFadeIn 0.3s ease, euPulseRing 2.4s infinite;
          }

          .eu-guard-icon {
            flex-shrink: 0;
            color: #e65100;
            margin-top: 1px;
          }

          .eu-guard-text {
            font-size: var(--text-xs);
            color: var(--charcoal-900);
            line-height: 1.5;
          }

          .eu-guard-text strong {
            color: #e65100;
          }
        `}</style>

        {/* Identity Header */}
        <div className="eu-identity-header">
          <span className="eu-avatar">{getInitials(editUserName || userToEdit.email || 'U')}</span>
          <div>
            <div className="eu-identity-name">{editUserName || 'Unnamed Golfer'}</div>
            <div className="eu-identity-email">{userToEdit.email}</div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="eu-section">
          <div>
            <label className="eu-field-label">
              <User size={13} /> Full Name
            </label>
            <input
              className="eu-input"
              value={editUserName}
              onChange={(e) => setEditUserName(e.target.value)}
              placeholder="Golfer full name"
            />
          </div>

          <div>
            <label className="eu-field-label">
              <Target size={13} /> Handicap Index (-10.0 to 54.0)
            </label>
            <div className="eu-handicap-row">
              <input
                type="number"
                step="0.1"
                className="eu-input"
                value={editUserHandicap}
                onChange={(e) => setEditUserHandicap(e.target.value)}
                placeholder="e.g. 14.2"
              />
              <div className="eu-gauge-wrap">
                <div className="eu-gauge-track">
                  {handicapPct !== null && (
                    <div className="eu-gauge-fill-marker" style={{ left: `${handicapPct}%` }} />
                  )}
                </div>
                <div className="eu-gauge-labels">
                  <span>-10.0</span>
                  <span>22.0</span>
                  <span>54.0</span>
                </div>
              </div>
            </div>
            <span className="eu-hint">Official WHS handicap index for fair Stableford scoring.</span>
          </div>

          <div>
            <label className="eu-field-label">
              <MapPin size={13} /> Home Golf Club
            </label>
            <input
              className="eu-input"
              value={editUserHomeClub}
              onChange={(e) => setEditUserHomeClub(e.target.value)}
              placeholder="e.g. Royal Birkdale Golf Club"
            />
          </div>
        </div>

        {/* Role Selector */}
        <div className="eu-section">
          <label className="eu-field-label">
            <ShieldCheck size={13} /> Platform Role
          </label>
          <div className="eu-role-grid">
            <button
              type="button"
              className={`eu-role-card${editUserRole === 'subscriber' ? ' active' : ''}`}
              disabled={isSelf}
              onClick={() => setEditUserRole('subscriber')}
            >
              <span className="eu-role-icon">
                <User size={14} />
              </span>
              <span className="eu-role-title">Subscriber</span>
              <span className="eu-role-sub">Golfer / standard member access</span>
            </button>

            <button
              type="button"
              className={`eu-role-card${editUserRole === 'admin' ? ' active' : ''}`}
              disabled={isSelf}
              onClick={() => setEditUserRole('admin')}
            >
              <span className="eu-role-icon">
                <Sparkles size={14} />
              </span>
              <span className="eu-role-title">Administrator</span>
              <span className="eu-role-sub">Full platform operations control</span>
            </button>
          </div>

          {isSelf && (
            <div className="eu-guard-banner">
              <Lock size={14} className="eu-guard-icon" />
              <span className="eu-guard-text">
                <strong>Self-Demotion Guard:</strong> You cannot change your own account's role. This protects
                against accidental loss of administrator access.
              </span>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
};