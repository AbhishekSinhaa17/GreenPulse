import React, { useState } from "react";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import {
  Eye,
  CheckSquare,
  Trophy,
  FileCheck2,
  FileClock,
} from "lucide-react";
import type { WinnerClaim, UserProfile } from "../../../types";
import { ReviewClaimModal } from "./ReviewClaimModal";

interface WinnersSectionProps {
  claimsList: WinnerClaim[];
  usersList: UserProfile[];
  currentUserId?: string;
  isConfigured: boolean;
  onRefresh: () => Promise<void>;
}

const TIER_COLORS: Record<string, string> = {
  tier_5: "#fb8c00",
  tier_4: "#1e88e5",
  tier_3: "#8e24aa",
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

const avatarColor = (seed: string) => {
  const colors = [
    "#2e7d32",
    "#1e88e5",
    "#8e24aa",
    "#fb8c00",
    "#00897b",
    "#5e35b1",
    "#c62828",
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++)
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

export const WinnersSection: React.FC<WinnersSectionProps> = ({
  claimsList,
  usersList,
  currentUserId,
  isConfigured,
  onRefresh,
}) => {
  const [claimsFilter, setClaimsFilter] = useState<
    "all" | "pending" | "verified" | "rejected"
  >("all");
  const [selectedClaim, setSelectedClaim] = useState<WinnerClaim | null>(null);

  const filteredClaims = claimsList.filter((claim) => {
    if (claimsFilter === "pending") {
      return (
        claim.status === "pending_proof" || claim.status === "under_review"
      );
    }
    if (claimsFilter === "verified") return claim.status === "verified";
    if (claimsFilter === "rejected") return claim.status === "rejected";
    return true;
  });

  const pendingCount = claimsList.filter(
    (c) => c.status === "pending_proof" || c.status === "under_review",
  ).length;
  const verifiedCount = claimsList.filter(
    (c) => c.status === "verified",
  ).length;
  const rejectedCount = claimsList.filter(
    (c) => c.status === "rejected",
  ).length;

  const filterIndicatorStyle = (): React.CSSProperties => {
    const order: (typeof claimsFilter)[] = [
      "all",
      "pending",
      "verified",
      "rejected",
    ];
    const idx = order.indexOf(claimsFilter);
    const widthPct = 100 / order.length;
    return {
      left: `calc(${idx * widthPct}% + 4px)`,
      width: `calc(${widthPct}% - 8px)`,
    };
  };

  return (
    <div className="ws-wrap">
      <style>{`
        @keyframes wsFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes wsRowIn {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes wsPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(46,125,50,0.3); }
          50% { box-shadow: 0 0 0 6px rgba(46,125,50,0); }
        }
        @keyframes wsCheckPop {
          0% { transform: scale(0.4); opacity: 0; }
          60% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes wsClockTick {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(15deg); }
        }

        .ws-wrap {
          animation: wsFadeIn 0.4s ease;
        }

        .ws-card {
          overflow: hidden;
          border-radius: 16px !important;
        }

        .ws-toolbar {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          gap: var(--space-4);
          padding: var(--space-5);
          background: linear-gradient(135deg, var(--bg-surface-warm), #fff);
          border-bottom: 1px solid var(--border-default);
          position: relative;
          overflow: hidden;
        }

        .ws-toolbar::before {
          content: '';
          position: absolute;
          top: -40px;
          right: -20px;
          width: 150px;
          height: 150px;
          background: radial-gradient(circle, rgba(46,125,50,0.1), transparent 70%);
          pointer-events: none;
        }

        .ws-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          position: relative;
          z-index: 1;
        }

        .ws-title-icon {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #2e7d32, #43a047);
          color: #fff;
          flex-shrink: 0;
          animation: wsPulse 2.4s infinite;
        }

        .ws-filter-pills {
          position: relative;
          display: inline-flex;
          padding: 4px;
          border-radius: 11px;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          z-index: 1;
        }

        .ws-filter-indicator {
          position: absolute;
          top: 4px;
          bottom: 4px;
          border-radius: 8px;
          background: linear-gradient(135deg, #2e7d32, #43a047);
          box-shadow: 0 3px 10px -2px rgba(46,125,50,0.45);
          transition: left 0.3s cubic-bezier(0.65,0,0.35,1), width 0.3s cubic-bezier(0.65,0,0.35,1);
        }

        .ws-filter-btn {
          position: relative;
          z-index: 1;
          padding: 7px 13px;
          border: none;
          background: transparent;
          font-size: 12px;
          font-weight: 700;
          color: var(--charcoal-700);
          cursor: pointer;
          border-radius: 8px;
          white-space: nowrap;
          transition: color 0.25s ease;
        }

        .ws-filter-btn.active {
          color: #fff;
        }

        .ws-thead-row th {
          padding: var(--space-4);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-muted);
          font-weight: 700;
          background: var(--bg-surface);
          border-bottom: 1px solid var(--border-default);
        }

        .ws-row {
          position: relative;
          border-bottom: 1px solid var(--border-subtle);
          animation: wsRowIn 0.35s ease both;
          transition: background 0.2s ease;
        }

        .ws-row::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: transparent;
          transition: background 0.2s ease;
        }

        .ws-row:hover {
          background: rgba(46,125,50,0.035);
        }

        .ws-row:hover::before {
          background: #2e7d32;
        }

        .ws-golfer-cell {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .ws-avatar {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 800;
          color: #fff;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        }

        .ws-golfer-name {
          font-weight: 700;
          color: var(--forest-950);
        }

        .ws-golfer-id {
          font-size: var(--text-xs);
          color: var(--text-muted);
          font-family: monospace;
        }

        .ws-tier-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          text-transform: capitalize;
          color: #fff;
        }

        .ws-prize-amount {
          font-family: var(--font-numeric);
          font-weight: 800;
          color: var(--forest-950);
        }

        .ws-proof-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: var(--text-xs);
          font-weight: 600;
        }

        .ws-proof-status.uploaded {
          color: #2e7d32;
        }

        .ws-proof-status.uploaded svg {
          animation: wsCheckPop 0.4s ease;
        }

        .ws-proof-status.waiting {
          color: var(--text-muted);
        }

        .ws-proof-status.waiting svg {
          animation: wsClockTick 2s ease-in-out infinite;
        }

        .ws-inspect-btn {
          transition: transform 0.15s ease, background 0.15s ease;
        }

        .ws-inspect-btn:hover {
          transform: translateY(-1px);
        }

        .ws-empty-state {
          padding: var(--space-12);
          text-align: center;
          color: var(--text-muted);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .ws-empty-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--bg-surface-warm);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
        }
      `}</style>

      <Card padding="none" className="ws-card">
        <div className="ws-toolbar">
          <div className="ws-title-row">
            <span className="ws-title-icon">
              <CheckSquare size={16} />
            </span>
            <div>
              <h4 style={{ color: "var(--forest-950)" }}>
                Winner Verification Queue
              </h4>
              <p
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-muted)",
                  marginTop: 2,
                }}
              >
                Inspect uploaded scorecard screenshots from golf platforms
                before releasing verification.
              </p>
            </div>
          </div>

          <div className="ws-filter-pills">
            <div
              className="ws-filter-indicator"
              style={filterIndicatorStyle()}
            />
            <button
              className={`ws-filter-btn${claimsFilter === "all" ? " active" : ""}`}
              onClick={() => setClaimsFilter("all")}
            >
              All ({claimsList.length})
            </button>
            <button
              className={`ws-filter-btn${claimsFilter === "pending" ? " active" : ""}`}
              onClick={() => setClaimsFilter("pending")}
            >
              Pending ({pendingCount})
            </button>
            <button
              className={`ws-filter-btn${claimsFilter === "verified" ? " active" : ""}`}
              onClick={() => setClaimsFilter("verified")}
            >
              Verified ({verifiedCount})
            </button>
            <button
              className={`ws-filter-btn${claimsFilter === "rejected" ? " active" : ""}`}
              onClick={() => setClaimsFilter("rejected")}
            >
              Rejected ({rejectedCount})
            </button>
          </div>
        </div>

        {claimsList.length === 0 ? (
          <div className="ws-empty-state">
            <span className="ws-empty-icon">
              <Trophy size={18} />
            </span>
            No claims currently in the verification queue. Publish a draw with
            winners to generate claims.
          </div>
        ) : (
          <div className="table-responsive">
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
                fontSize: "var(--text-sm)",
              }}
            >
              <thead>
                <tr className="ws-thead-row">
                  <th>Golfer</th>
                  <th>Match Tier</th>
                  <th>Prize Amount</th>
                  <th>Status</th>
                  <th>Proof Attached</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClaims.map((claim, i) => {
                  const golferProfile = usersList.find(
                    (u) => u.id === claim.user_id,
                  );
                  const displayName =
                    golferProfile?.full_name ||
                    golferProfile?.email ||
                    claim.user_id.substring(0, 8) + "...";
                  const accent = avatarColor(claim.user_id);
                  const tierColor = TIER_COLORS[claim.match_tier] || "#546e7a";

                  return (
                    <tr
                      key={claim.id}
                      className="ws-row"
                      style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
                    >
                      <td style={{ padding: "var(--space-4)" }}>
                        <div className="ws-golfer-cell">
                          <span
                            className="ws-avatar"
                            style={{ background: accent }}
                          >
                            {getInitials(displayName)}
                          </span>
                          <div>
                            <div className="ws-golfer-name">{displayName}</div>
                            <div className="ws-golfer-id">
                              {claim.user_id.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "var(--space-4)" }}>
                        <span
                          className="ws-tier-chip"
                          style={{ background: tierColor }}
                        >
                          <Trophy size={11} />
                          {claim.match_tier.replace("_", " ")}
                        </span>
                      </td>
                      <td style={{ padding: "var(--space-4)" }}>
                        <span className="ws-prize-amount">
                          ₹{(claim.prize_amount_cents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td style={{ padding: "var(--space-4)" }}>
                        <Badge
                          variant={
                            claim.status === "verified"
                              ? "success"
                              : claim.status === "rejected"
                                ? "error"
                                : claim.status === "paid"
                                  ? "forest"
                                  : "warning"
                          }
                          size="sm"
                        >
                          {claim.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td style={{ padding: "var(--space-4)" }}>
                        {claim.proof_image_path ? (
                          <span className="ws-proof-status uploaded">
                            <FileCheck2 size={14} />
                            Proof Uploaded
                          </span>
                        ) : (
                          <span className="ws-proof-status waiting">
                            <FileClock size={14} />
                            Awaiting Upload
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "var(--space-4)",
                          textAlign: "right",
                        }}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ws-inspect-btn"
                          leftIcon={<Eye size={14} />}
                          onClick={() => setSelectedClaim(claim)}
                        >
                          Inspect & Review
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selectedClaim && (
        <ReviewClaimModal
          key={selectedClaim.id}
          claim={selectedClaim}
          isOpen={!!selectedClaim}
          onClose={() => setSelectedClaim(null)}
          onReviewSuccess={onRefresh}
          currentUserId={currentUserId}
          isConfigured={isConfigured}
        />
      )}
    </div>
  );
};
