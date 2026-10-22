import React, { useState } from "react";
import { Dialog } from "../../../components/ui/Dialog";
import { Button } from "../../../components/ui/Button";
import { useToast } from "../../../context/ToastContext";
import { adminService } from "../../../services/adminService";
import type { Charity } from "../../../types";
import { ShieldAlert, DatabaseZap, Archive, Trash2 } from "lucide-react";

interface DeleteCharityModalProps {
  charity: Charity | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleteSuccess: () => Promise<void>;
  isConfigured: boolean;
}

export const DeleteCharityModal: React.FC<DeleteCharityModalProps> = ({
  charity,
  isOpen,
  onClose,
  onDeleteSuccess,
  isConfigured,
}) => {
  const { success, error } = useToast();
  const [isDeletingCharity, setIsDeletingCharity] = useState(false);

  const handleConfirmDelete = async () => {
    if (!charity) return;

    if (!isConfigured) {
      error("Configuration Required", "Database connection required.");
      return;
    }

    setIsDeletingCharity(true);
    try {
      const res = await adminService.deleteOrArchiveCharity(charity.id);
      success(
        res.action === "archived" ? "Charity Archived" : "Charity Deleted",
        res.action === "archived"
          ? `"${charity.name}" was safely archived because it has linked ledger contributions.`
          : `"${charity.name}" was successfully removed.`,
      );
      onClose();
      await onDeleteSuccess();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to archive or delete charity.";
      error("Action Failed", msg);
    } finally {
      setIsDeletingCharity(false);
    }
  };

  if (!charity) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Archive / Delete: ${charity.name}`}
      description="Audit-safe removal complying with financial ledger constraints."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="outline"
            isLoading={isDeletingCharity}
            className="dc-confirm-btn"
            onClick={handleConfirmDelete}
          >
            <Trash2 size={13} style={{ marginRight: 6 }} />
            Confirm Safe Archive / Deletion
          </Button>
        </>
      }
    >
      <div className="dc-wrap">
        <style>{`
          @keyframes dcFadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes dcPulseRing {
            0% { box-shadow: 0 0 0 0 rgba(229,57,53,0.3); }
            70% { box-shadow: 0 0 0 10px rgba(229,57,53,0); }
            100% { box-shadow: 0 0 0 0 rgba(229,57,53,0); }
          }
          @keyframes dcShake {
            0%, 100% { transform: rotate(0deg); }
            25% { transform: rotate(-6deg); }
            75% { transform: rotate(6deg); }
          }

          .dc-wrap {
            display: flex;
            flex-direction: column;
            gap: var(--space-4);
            animation: dcFadeIn 0.3s ease;
          }

          .dc-alert-header {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 14px 16px;
            border-radius: 14px;
            background: linear-gradient(135deg, rgba(229,57,53,0.07), rgba(229,57,53,0.02));
            border: 1px solid rgba(229,57,53,0.25);
          }

          .dc-alert-icon {
            width: 38px;
            height: 38px;
            border-radius: 11px;
            flex-shrink: 0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: #e53935;
            color: #fff;
            animation: dcPulseRing 2.2s infinite;
          }

          .dc-alert-icon svg {
            animation: dcShake 3.5s ease-in-out infinite;
          }

          .dc-alert-text {
            font-size: var(--text-sm);
            color: var(--charcoal-900, #263238);
            line-height: 1.5;
          }

          .dc-alert-text strong {
            color: #c62828;
          }

          .dc-protection-box {
            position: relative;
            overflow: hidden;
            padding: 14px 16px;
            background: var(--bg-surface-warm);
            border: 1px solid var(--border-default);
            border-radius: 14px;
            font-size: var(--text-xs);
            animation: dcFadeIn 0.4s ease both;
            animation-delay: 80ms;
          }

          .dc-protection-head {
            display: flex;
            align-items: center;
            gap: 7px;
            font-weight: 800;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--forest-700, #2e7d32);
            margin-bottom: 7px;
          }

          .dc-protection-head svg {
            color: var(--forest-600, #43a047);
          }

          .dc-protection-text {
            color: var(--charcoal-700);
            line-height: 1.6;
          }

          .dc-protection-text code {
            background: rgba(0,0,0,0.06);
            padding: 1px 5px;
            border-radius: 4px;
          }

          .dc-outcome-row {
            display: flex;
            gap: 10px;
            margin-top: 10px;
          }

          .dc-outcome-chip {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 10px;
            border-radius: 10px;
            font-size: 11px;
            font-weight: 700;
          }

          .dc-outcome-chip.archive {
            background: rgba(251,140,0,0.1);
            color: #e65100;
            border: 1px solid rgba(251,140,0,0.3);
          }

          .dc-outcome-chip.delete {
            background: rgba(229,57,53,0.08);
            color: #c62828;
            border: 1px solid rgba(229,57,53,0.25);
          }

          .dc-confirm-btn {
            border-color: var(--color-error, #e53935) !important;
            color: var(--color-error, #e53935) !important;
            transition: all 0.2s ease;
          }

          .dc-confirm-btn:hover:not(:disabled) {
            background: rgba(229,57,53,0.08) !important;
            transform: translateY(-1px);
            box-shadow: 0 6px 16px -8px rgba(229,57,53,0.5);
          }
        `}</style>

        <div className="dc-alert-header">
          <span className="dc-alert-icon">
            <ShieldAlert size={18} />
          </span>
          <div className="dc-alert-text">
            Are you sure you want to remove <strong>{charity.name}</strong> from
            active listings? This action will be evaluated against financial
            ledger records before proceeding.
          </div>
        </div>

        <div className="dc-protection-box">
          <div className="dc-protection-head">
            <DatabaseZap size={13} />
            Financial Integrity Protection
          </div>
          <div className="dc-protection-text">
            If this charity has historical donation ledger entries or member
            preferences, PostgreSQL will automatically <strong>archive</strong>{" "}
            it (set <code>is_archived = true</code>) rather than delete it,
            preserving all past audit records.
          </div>

          <div className="dc-outcome-row">
            <div className="dc-outcome-chip archive">
              <Archive size={12} />
              Has History → Archived
            </div>
            <div className="dc-outcome-chip delete">
              <Trash2 size={12} />
              No History → Deleted
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
