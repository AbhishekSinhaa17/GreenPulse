import React, { useState, useEffect } from "react";
import { Dialog } from "../../../components/ui/Dialog";
import { Button } from "../../../components/ui/Button";
import { useToast } from "../../../context/ToastContext";
import { adminService } from "../../../services/adminService";
import { drawService } from "../../../services/drawService";
import type { WinnerClaim } from "../../../types";
import {
  Trophy,
  FileImage,
  MessageSquareText,
  XCircle,
  StickyNote,
  ShieldAlert,
  ZoomIn,
  Fingerprint,
  FolderOpen,
  Clock,
} from "lucide-react";

interface ReviewClaimModalProps {
  claim: WinnerClaim;
  isOpen: boolean;
  onClose: () => void;
  onReviewSuccess: () => Promise<void>;
  currentUserId?: string;
  isConfigured: boolean;
}

const TIER_META: Record<string, { color: string; label: string }> = {
  tier_5: { color: "#fb8c00", label: "5-Match Jackpot" },
  tier_4: { color: "#1e88e5", label: "4-Match" },
  tier_3: { color: "#8e24aa", label: "3-Match" },
};

export const ReviewClaimModal: React.FC<ReviewClaimModalProps> = ({
  claim,
  isOpen,
  onClose,
  onReviewSuccess,
  currentUserId,
  isConfigured,
}) => {
  const { success, warning, error } = useToast();
  const [rejectionReason, setRejectionReason] = useState(
    claim.rejection_reason || "",
  );
  const [adminNotes, setAdminNotes] = useState(claim.admin_notes || "");
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(
    !!claim.proof_image_path,
  );
  const [isProcessingClaim, setIsProcessingClaim] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (claim.proof_image_path) {
      drawService
        .getProofSignedUrl(claim.proof_image_path)
        .then((url) => {
          if (isMounted) setProofPreviewUrl(url);
        })
        .catch(() => {
          if (isMounted) setProofPreviewUrl(null);
        })
        .finally(() => {
          if (isMounted) setIsLoadingPreview(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [claim.proof_image_path]);

  const handleReviewClaim = async (
    decision: "under_review" | "verified" | "rejected",
  ) => {
    if (!isConfigured) {
      error(
        "Configuration Required",
        "Claim approval requires Supabase database connection.",
      );
      return;
    }

    if (decision === "rejected") {
      if (!rejectionReason || rejectionReason.trim().length < 5) {
        warning(
          "Rejection Reason Required",
          "Please provide a detailed rejection note (minimum 5 characters) so the golfer understands why proof was rejected.",
        );
        return;
      }
    }

    setIsProcessingClaim(true);
    try {
      await adminService.reviewWinnerClaim(
        claim.id,
        decision,
        rejectionReason,
        adminNotes,
        currentUserId,
      );

      success(
        decision === "verified"
          ? "Winner Claim Verified"
          : decision === "rejected"
            ? "Claim Rejected"
            : "Status Set to Under Review",
        decision === "verified"
          ? "Scorecard round legitimacy confirmed. Payout remains pending payment provider integration."
          : decision === "rejected"
            ? "Rejection reason recorded. Golfer can now re-submit updated proof."
            : "Claim moved to under review.",
      );

      onClose();
      await onReviewSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Claim review failed.";
      error("Review Error", msg);
    } finally {
      setIsProcessingClaim(false);
    }
  };

  const tierMeta = TIER_META[claim.match_tier] || {
    color: "#546e7a",
    label: claim.match_tier.replace("_", " "),
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Review Winner Scorecard Submission"
      description="Validate golf round legitimacy before confirming the prize claim."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {claim.status === "pending_proof" && (
            <Button
              variant="outline"
              isLoading={isProcessingClaim}
              leftIcon={<Clock size={13} />}
              onClick={() => handleReviewClaim("under_review")}
            >
              Mark Under Review
            </Button>
          )}
          <Button
            variant="outline"
            isLoading={isProcessingClaim}
            className="rc-reject-btn"
            leftIcon={<XCircle size={13} />}
            onClick={() => handleReviewClaim("rejected")}
          >
            Reject Proof
          </Button>
          <Button
            variant="primary"
            isLoading={isProcessingClaim}
            leftIcon={<Trophy size={13} />}
            onClick={() => handleReviewClaim("verified")}
          >
            Approve & Verify Scorecard
          </Button>
        </>
      }
    >
      <div className="rc-wrap">
        <style>{`
          @keyframes rcFadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes rcShimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }

          .rc-wrap {
            display: flex;
            flex-direction: column;
            gap: var(--space-4);
            animation: rcFadeIn 0.3s ease;
          }

          .rc-hero {
            position: relative;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 14px 18px;
            border-radius: 14px;
            background: linear-gradient(135deg, var(--tier-color, #546e7a), color-mix(in srgb, var(--tier-color, #546e7a) 65%, black));
            color: #fff;
          }

          .rc-hero::before {
            content: '';
            position: absolute;
            top: -30%;
            right: -10%;
            width: 140px;
            height: 140px;
            border-radius: 50%;
            background: rgba(255,255,255,0.15);
            pointer-events: none;
          }

          .rc-hero-left {
            display: flex;
            align-items: center;
            gap: 10px;
            position: relative;
            z-index: 1;
          }

          .rc-hero-icon {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            background: rgba(255,255,255,0.2);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          .rc-hero-tier {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            opacity: 0.85;
            font-weight: 700;
          }

          .rc-hero-prize {
            font-size: var(--text-xl);
            font-weight: 800;
            letter-spacing: -0.01em;
          }

          .rc-hero-status {
            position: relative;
            z-index: 1;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 5px 10px;
            border-radius: 999px;
            background: rgba(255,255,255,0.22);
            white-space: nowrap;
          }

          .rc-meta-box {
            display: flex;
            flex-direction: column;
            gap: 8px;
            background: var(--bg-surface-warm);
            padding: 14px 16px;
            border-radius: 12px;
            border: 1px solid var(--border-subtle);
            font-size: var(--text-sm);
          }

          .rc-meta-line {
            display: flex;
            align-items: flex-start;
            gap: 8px;
          }

          .rc-meta-line svg {
            color: var(--text-muted);
            margin-top: 2px;
            flex-shrink: 0;
          }

          .rc-meta-line code {
            background: rgba(0,0,0,0.06);
            padding: 1px 6px;
            border-radius: 5px;
            font-size: 11px;
            word-break: break-all;
          }

          .rc-proof-panel {
            border: 1px solid var(--border-default);
            border-radius: 14px;
            overflow: hidden;
          }

          .rc-proof-head {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 10px 14px;
            font-size: 11px;
            font-weight: 700;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.04em;
            background: var(--bg-surface);
            border-bottom: 1px solid var(--border-subtle);
          }

          .rc-proof-head svg {
            color: #2e7d32;
          }

          .rc-proof-body {
            background: #14171a;
            padding: var(--space-3);
            min-height: 140px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .rc-proof-loading,
          .rc-proof-empty {
            padding: var(--space-6) var(--space-4);
            text-align: center;
            color: #9aa0a6;
            font-size: var(--text-sm);
            font-style: italic;
          }

          .rc-image-frame {
            position: relative;
            overflow: hidden;
            border-radius: 8px;
            max-height: 280px;
            cursor: zoom-in;
          }

          .rc-image-frame img {
            display: block;
            max-width: 100%;
            max-height: 260px;
            object-fit: contain;
            margin: 0 auto;
            transition: transform 0.35s ease;
          }

          .rc-image-frame:hover img {
            transform: scale(1.12);
          }

          .rc-zoom-hint {
            position: absolute;
            bottom: 8px;
            right: 8px;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 8px;
            border-radius: 999px;
            background: rgba(0,0,0,0.55);
            color: #fff;
            font-size: 10px;
            font-weight: 600;
            opacity: 0;
            transition: opacity 0.25s ease;
          }

          .rc-image-frame:hover .rc-zoom-hint {
            opacity: 1;
          }

          .rc-field {
            display: flex;
            flex-direction: column;
            gap: 5px;
          }

          .rc-field-label {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: var(--text-xs);
            font-weight: 700;
            color: var(--charcoal-800);
          }

          .rc-field-label svg {
            color: #2e7d32;
          }

          .rc-field-label.danger svg {
            color: #e53935;
          }

          .rc-input {
            width: 100%;
            padding: 9px 12px;
            border-radius: 10px;
            border: 1px solid var(--border-default);
            font-size: var(--text-sm);
            background: #fff;
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
          }

          .rc-input:focus {
            outline: none;
            border-color: #2e7d32;
            box-shadow: 0 0 0 3px rgba(46,125,50,0.14);
          }

          .rc-input.danger:focus {
            border-color: #e53935;
            box-shadow: 0 0 0 3px rgba(229,57,53,0.14);
          }

          .rc-hint {
            font-size: 11px;
            color: var(--text-muted);
          }

          .rc-notice {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding: 12px 14px;
            background: rgba(142, 166, 51, 0.1);
            border: 1px solid var(--lime-600, #8ea633);
            border-radius: 12px;
            font-size: var(--text-xs);
            color: var(--forest-950);
          }

          .rc-notice svg {
            flex-shrink: 0;
            color: var(--lime-700, #6e8a1f);
            margin-top: 1px;
          }

          .rc-reject-btn {
            border-color: var(--color-error, #e53935) !important;
            color: var(--color-error, #e53935) !important;
            transition: all 0.2s ease;
          }

          .rc-reject-btn:hover:not(:disabled) {
            background: rgba(229,57,53,0.08) !important;
            transform: translateY(-1px);
          }
        `}</style>

        <div
          className="rc-hero"
          style={{ ["--tier-color" as any]: tierMeta.color }}
        >
          <div className="rc-hero-left">
            <span className="rc-hero-icon">
              <Trophy size={18} />
            </span>
            <div>
              <div className="rc-hero-tier">{tierMeta.label}</div>
              <div className="rc-hero-prize">
                ₹{(claim.prize_amount_cents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
          <span className="rc-hero-status">
            {claim.status.replace("_", " ")}
          </span>
        </div>

        <div className="rc-meta-box">
          <div className="rc-meta-line">
            <Fingerprint size={14} />
            <span>
              <strong>Golfer User ID:</strong> <code>{claim.user_id}</code>
            </span>
          </div>
          <div className="rc-meta-line">
            <FolderOpen size={14} />
            <span>
              <strong>Proof Path:</strong>{" "}
              <code>{claim.proof_image_path || "No file uploaded yet"}</code>
            </span>
          </div>
          {claim.golfer_notes && (
            <div className="rc-meta-line">
              <MessageSquareText size={14} />
              <span>
                <strong>Golfer Notes:</strong> {claim.golfer_notes}
              </span>
            </div>
          )}
        </div>

        <div className="rc-proof-panel">
          <div className="rc-proof-head">
            <FileImage size={13} />
            Scorecard Screenshot Preview (Private Storage)
          </div>
          <div className="rc-proof-body">
            {isLoadingPreview ? (
              <div className="rc-proof-loading">
                Generating secure signed preview URL...
              </div>
            ) : proofPreviewUrl ? (
              <div className="rc-image-frame">
                <img src={proofPreviewUrl} alt="Golfer scorecard proof" />
                <span className="rc-zoom-hint">
                  <ZoomIn size={11} /> Hover to zoom
                </span>
              </div>
            ) : (
              <div className="rc-proof-empty">
                {claim.proof_image_path
                  ? "Could not generate signed preview URL."
                  : "Awaiting golfer submission. No scorecard uploaded yet."}
              </div>
            )}
          </div>
        </div>

        <div className="rc-field">
          <label className="rc-field-label danger">
            <XCircle size={13} /> Rejection Reason (Required if rejecting proof,
            min 5 chars)
          </label>
          <input
            className="rc-input danger"
            placeholder="e.g. Scorecard round date does not match reported date or score is illegible"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
          <span className="rc-hint">
            This note will be displayed directly to the golfer so they can
            correct and re-submit their scorecard.
          </span>
        </div>

        <div className="rc-field">
          <label className="rc-field-label">
            <StickyNote size={13} /> Admin Internal Review Notes (Optional)
          </label>
          <input
            className="rc-input"
            placeholder="e.g. Verified against Golf Genius round on 12th Oct 2026"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
          />
        </div>

        <div className="rc-notice">
          <ShieldAlert size={15} />
          <span>
            <strong>Payment Security Notice:</strong> Approving verifies scorecard
            legitimacy and moves the claim to verified status. Payout disbursements
            are processed through the banking settlement gateway.
          </span>
        </div>
      </div>
    </Dialog>
  );
};
