import React, { useState } from "react";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { ScoreBall } from "../../../components/ui/ScoreBall";
import {
  Play,
  Send,
  Dices,
  BrainCircuit,
  CalendarDays,
  Coins,
  History,
  Users,
  Trophy,
  Crosshair,
  Target,
  Sparkles,
} from "lucide-react";
import { useToast } from "../../../context/ToastContext";
import { adminService } from "../../../services/adminService";
import {
  simulateDraw,
  type DrawSimulationResult,
  type EligibleSubscriberEntry,
} from "../../../services/drawEngine";
import type { MonthlyDraw } from "../../../types";
import { ConfirmDrawModal } from "./ConfirmDrawModal";

interface DrawSectionProps {
  eligibleSubscribers: EligibleSubscriberEntry[];
  publishedDraws: MonthlyDraw[];
  carriedOverJackpotCents: number;
  currentUserId?: string;
  isConfigured: boolean;
  onRefresh: () => Promise<void>;
}

export const DrawSection: React.FC<DrawSectionProps> = ({
  eligibleSubscribers,
  publishedDraws,
  carriedOverJackpotCents,
  currentUserId,
  isConfigured,
  onRefresh,
}) => {
  const { success, warning, error, info } = useToast();
  const [drawMode, setDrawMode] = useState<"random" | "algorithmic">("random");
  const [targetDrawMonth, setTargetDrawMonth] = useState("2026-10-01");
  const [estimatedPrizePoolPounds, setEstimatedPrizePoolPounds] =
    useState(3129500);
  const [simulationResult, setSimulationResult] =
    useState<DrawSimulationResult | null>(null);
  const [isConfirmPublishOpen, setIsConfirmPublishOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const handleRunSimulation = () => {
    let participants = eligibleSubscribers;
    if (participants.length === 0) {
      participants = [
        {
          userId: "demo-1",
          fullName: "Jack Nicklaus",
          scores: [36, 38, 34, 40, 32],
        },
        {
          userId: "demo-2",
          fullName: "Annika Sorenstam",
          scores: [35, 37, 39, 41, 33],
        },
        {
          userId: "demo-3",
          fullName: "Gary Player",
          scores: [30, 32, 34, 36, 38],
        },
        {
          userId: "demo-4",
          fullName: "Ben Hogan",
          scores: [28, 31, 35, 37, 42],
        },
        {
          userId: "demo-5",
          fullName: "Arnold Palmer",
          scores: [33, 34, 35, 36, 37],
        },
      ];
    }

    const totalPrizePoolCents = Math.round(estimatedPrizePoolPounds * 100);

    const result = simulateDraw({
      drawMonth: targetDrawMonth,
      drawTitle: `Monthly Prize Draw (${targetDrawMonth})`,
      drawLogic: drawMode,
      eligibleSubscribers: participants,
      totalPrizePoolCents,
      carriedOverJackpotCents,
    });

    setSimulationResult(result);
    info(
      "Simulation Complete",
      `Winning numbers generated via ${drawMode.toUpperCase()} logic with standard 40/35/25 split. No database records modified.`,
    );
  };

  const handleOpenPublishConfirm = () => {
    if (!simulationResult) {
      warning(
        "Run Simulation First",
        "Verification requires simulation verification before publishing.",
      );
      return;
    }
    setIsConfirmPublishOpen(true);
  };

  const handleConfirmPublishDraw = async () => {
    if (!simulationResult) return;

    if (!isConfigured) {
      error(
        "Configuration Required",
        "Real draw publishing requires Supabase database connection.",
      );
      return;
    }

    setIsPublishing(true);
    try {
      const published = await adminService.publishOfficialDraw({
        drawMonth: simulationResult.drawMonth,
        drawTitle: simulationResult.drawTitle,
        drawLogic: simulationResult.drawLogic,
        winningNumbers: simulationResult.winningNumbers,
        totalPrizePoolCents:
          simulationResult.prizeAllocation.totalPrizePoolCents,
        carriedOverJackpotCents:
          simulationResult.prizeAllocation.carriedOverJackpotCents,
        simulationResult,
        adminUserId: currentUserId,
      });

      success(
        "Draw Officially Published",
        `Draw for ${published.draw_month} is now published. Entries committed and claims generated.`,
      );
      setIsConfirmPublishOpen(false);
      setSimulationResult(null);
      await onRefresh();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to publish draw.";
      error("Publish Error", msg);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="ds-wrap">
      <style>{`
        @keyframes dsFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dsBallDrop {
          0% { opacity: 0; transform: translateY(-24px) scale(0.5) rotate(-15deg); }
          60% { opacity: 1; transform: translateY(4px) scale(1.1) rotate(5deg); }
          100% { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); }
        }
        @keyframes dsGlowPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(46,125,50,0.25); }
          50% { box-shadow: 0 0 0 8px rgba(46,125,50,0); }
        }
        @keyframes dsShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes dsSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes dsRowIn {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .ds-wrap {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }

        .ds-console-card {
          border: 1px solid var(--border-default) !important;
          position: relative;
          overflow: hidden;
        }

        .ds-console-head {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          gap: var(--space-4);
          margin-bottom: var(--space-6);
        }

        .ds-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: var(--text-xs);
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 700;
        }

        .ds-eyebrow svg {
          color: #2e7d32;
          animation: dsSpin 6s linear infinite;
        }

        .ds-mode-toggle {
          position: relative;
          display: inline-flex;
          padding: 4px;
          border-radius: 12px;
          background: var(--bg-surface-warm);
          border: 1px solid var(--border-default);
        }

        .ds-mode-indicator {
          position: absolute;
          top: 4px;
          bottom: 4px;
          border-radius: 9px;
          background: linear-gradient(135deg, #2e7d32, #43a047);
          box-shadow: 0 4px 12px -2px rgba(46,125,50,0.45);
          transition: left 0.3s cubic-bezier(0.65,0,0.35,1), width 0.3s cubic-bezier(0.65,0,0.35,1);
          width: calc(50% - 4px);
        }

        .ds-mode-indicator.alg {
          left: calc(50% + 0px);
        }
        .ds-mode-indicator.rand {
          left: 4px;
        }

        .ds-mode-btn {
          position: relative;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border: none;
          background: transparent;
          font-size: var(--text-xs);
          font-weight: 700;
          color: var(--charcoal-700);
          cursor: pointer;
          border-radius: 9px;
          transition: color 0.25s ease;
          white-space: nowrap;
        }

        .ds-mode-btn.active {
          color: #fff;
        }

        .ds-params-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--space-4);
          margin-bottom: var(--space-6);
          padding: var(--space-5);
          background: var(--bg-surface);
          border-radius: 14px;
          border: 1px solid var(--border-subtle);
        }

        .ds-param-field label {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: var(--text-xs);
          font-weight: 700;
          color: var(--charcoal-700);
          margin-bottom: 6px;
        }

        .ds-param-field label svg {
          color: #2e7d32;
        }

        .ds-param-field .form-input {
          border-radius: 9px !important;
          transition: box-shadow 0.2s ease, border-color 0.2s ease;
        }

        .ds-param-field .form-input:focus {
          box-shadow: 0 0 0 3px rgba(46,125,50,0.14);
          border-color: #2e7d32;
        }

        .ds-static-value {
          padding: 9px 2px;
          font-weight: 800;
          color: var(--forest-900);
          font-size: var(--text-base);
          font-variant-numeric: tabular-nums;
        }

        .ds-sim-box {
          position: relative;
          background: var(--bg-surface);
          border-radius: 18px;
          padding: var(--space-6);
          border: 1px solid var(--border-subtle);
          overflow: hidden;
        }

        .ds-sim-header {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          gap: var(--space-4);
          margin-bottom: var(--space-4);
        }

        .ds-sim-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .ds-sim-status-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #bdbdbd;
          flex-shrink: 0;
        }

        .ds-sim-status-dot.ready {
          background: #2e7d32;
          animation: dsGlowPulse 2s infinite;
        }

        .ds-sim-title {
          font-weight: 700;
          font-size: var(--text-base);
          color: var(--forest-950);
        }

        .ds-sim-sub {
          font-size: var(--text-xs);
          color: var(--text-muted);
        }

        .ds-action-row {
          display: flex;
          gap: var(--space-3);
        }

        .ds-run-btn {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .ds-run-btn:hover {
          transform: translateY(-2px);
        }

        .ds-balls-row {
          display: flex;
          gap: var(--space-3);
          margin: var(--space-5) 0;
          flex-wrap: wrap;
        }

        .ds-ball-anim {
          animation: dsBallDrop 0.55s cubic-bezier(0.34,1.56,0.64,1) both;
        }

        .ds-tier-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
          gap: var(--space-4);
          margin-top: var(--space-6);
          padding-top: var(--space-5);
          border-top: 1px solid var(--border-subtle);
        }

        .ds-tier-card {
          position: relative;
          overflow: hidden;
          padding: 14px 16px;
          border-radius: 14px;
          border: 1px solid var(--border-default);
          background: #fff;
          animation: dsFadeIn 0.4s ease both;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .ds-tier-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 24px -16px var(--tier-color, rgba(0,0,0,0.4));
          border-color: var(--tier-color, var(--border-default));
        }

        .ds-tier-head {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.03em;
          font-weight: 700;
        }

        .ds-tier-icon {
          width: 22px;
          height: 22px;
          border-radius: 7px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--tier-color, #2e7d32);
          color: #fff;
        }

        .ds-tier-amount {
          font-weight: 800;
          font-size: var(--text-xl);
          color: var(--forest-950);
          margin-top: 6px;
          font-variant-numeric: tabular-nums;
        }

        .ds-tier-amount.shine {
          background: linear-gradient(90deg, #2e7d32, #81c784, #2e7d32);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: dsShimmer 5s linear infinite;
        }

        .ds-tier-meta {
          font-size: var(--text-xs);
          color: var(--charcoal-600);
          margin-top: 2px;
        }

        .ds-empty-sim {
          padding: var(--space-10);
          text-align: center;
          color: var(--text-muted);
          font-size: var(--text-sm);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .ds-empty-icon {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          background: var(--bg-surface-warm);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #2e7d32;
        }

        .ds-history-card {
          overflow: hidden;
        }

        .ds-history-head {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: var(--space-4) var(--space-5);
          background: linear-gradient(135deg, var(--bg-surface-warm), #fff);
          border-bottom: 1px solid var(--border-default);
        }

        .ds-history-head-icon {
          width: 30px;
          height: 30px;
          border-radius: 9px;
          background: linear-gradient(135deg, #2e7d32, #43a047);
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .ds-thead-row th {
          padding: var(--space-4);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-muted);
          font-weight: 700;
          background: var(--bg-surface);
          border-bottom: 1px solid var(--border-default);
        }

        .ds-history-row {
          border-bottom: 1px solid var(--border-subtle);
          animation: dsRowIn 0.35s ease both;
          transition: background 0.2s ease;
        }

        .ds-history-row:hover {
          background: rgba(46,125,50,0.035);
        }

        .ds-history-empty {
          padding: var(--space-8);
          text-align: center;
          color: var(--text-muted);
        }
      `}</style>

      <Card variant="warm" className="ds-console-card">
        <div className="ds-console-head">
          <div>
            <span className="ds-eyebrow">
              <Sparkles size={13} />
              Secure Draw Console
            </span>
            <h3 style={{ marginTop: "4px" }}>
              Draw Cycle Configuration & Simulation
            </h3>
            <p
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--charcoal-700)",
                marginTop: 2,
              }}
            >
              Cryptographically secure lottery number generation,
              score-frequency weighting, 40/35/25 split, and rollover engine.
            </p>
          </div>

          <div className="ds-mode-toggle">
            <div
              className={`ds-mode-indicator ${drawMode === "random" ? "rand" : "alg"}`}
            />
            <button
              className={`ds-mode-btn${drawMode === "random" ? " active" : ""}`}
              onClick={() => setDrawMode("random")}
            >
              <Dices size={13} /> Random (Uniform 1-45)
            </button>
            <button
              className={`ds-mode-btn${drawMode === "algorithmic" ? " active" : ""}`}
              onClick={() => setDrawMode("algorithmic")}
            >
              <BrainCircuit size={13} /> Algorithmic (Score-Weighted)
            </button>
          </div>
        </div>

        <div className="ds-params-grid">
          <div className="ds-param-field">
            <label>
              <CalendarDays size={13} /> Target Draw Month
            </label>
            <input
              type="date"
              className="form-input"
              style={{ fontSize: "var(--text-sm)", padding: "var(--space-2)" }}
              value={targetDrawMonth}
              onChange={(e) => setTargetDrawMonth(e.target.value)}
            />
          </div>

          <div className="ds-param-field">
            <label>
              <Coins size={13} /> Total Prize Pool (₹)
            </label>
            <input
              type="number"
              className="form-input"
              style={{ fontSize: "var(--text-sm)", padding: "var(--space-2)" }}
              value={estimatedPrizePoolPounds}
              onChange={(e) =>
                setEstimatedPrizePoolPounds(Number(e.target.value))
              }
            />
          </div>

          <div className="ds-param-field">
            <label>
              <History size={13} /> Prior Rollover Seed
            </label>
            <div className="ds-static-value">
              ₹{(carriedOverJackpotCents / 100).toLocaleString('en-IN')}
            </div>
          </div>

          <div className="ds-param-field">
            <label>
              <Users size={13} /> Eligible Golfer Tickets
            </label>
            <div
              className="ds-static-value"
              style={{ color: "var(--charcoal-900)" }}
            >
              {eligibleSubscribers.length > 0
                ? `${eligibleSubscribers.length} Active`
                : "5 Preview Demo"}
            </div>
          </div>
        </div>

        <div className="ds-sim-box">
          <div className="ds-sim-header">
            <div className="ds-sim-title-row">
              <span
                className={`ds-sim-status-dot${simulationResult ? " ready" : ""}`}
              />
              <div>
                <div className="ds-sim-title">
                  {simulationResult
                    ? "Simulation Preview (Verified)"
                    : "Awaiting Simulation Run"}
                </div>
                <span className="ds-sim-sub">
                  Simulations are non-destructive and test winning numbers,
                  match distributions, and rollover logic.
                </span>
              </div>
            </div>

            <div className="ds-action-row">
              <Button
                variant="accent"
                className="ds-run-btn"
                leftIcon={<Play size={16} />}
                onClick={handleRunSimulation}
              >
                Run Simulation
              </Button>
              <Button
                variant="primary"
                className="ds-run-btn"
                leftIcon={<Send size={16} />}
                disabled={!simulationResult}
                isLoading={isPublishing}
                onClick={handleOpenPublishConfirm}
              >
                Publish Official Draw
              </Button>
            </div>
          </div>

          {simulationResult ? (
            <div>
              <div className="ds-balls-row">
                {simulationResult.winningNumbers.map((n, i) => (
                  <div
                    key={i}
                    className="ds-ball-anim"
                    style={{ animationDelay: `${i * 90}ms` }}
                  >
                    <ScoreBall
                      number={n}
                      status="winning"
                      label={`Ball ${i + 1}`}
                    />
                  </div>
                ))}
              </div>

              <div className="ds-tier-grid">
                <div
                  className="ds-tier-card"
                  style={{
                    ["--tier-color" as any]: "#fb8c00",
                    animationDelay: "60ms",
                  }}
                >
                  <div className="ds-tier-head">
                    <span className="ds-tier-icon">
                      <Trophy size={12} />
                    </span>
                    Tier 5 (5-Match Jackpot)
                  </div>
                  <div className="ds-tier-amount shine">
                    ₹
                    {(
                      simulationResult.prizeAllocation.tier5.potCents / 100
                    ).toLocaleString('en-IN')}
                  </div>
                  <div className="ds-tier-meta">
                    {simulationResult.winners.tier5.length} winners ·{" "}
                    {simulationResult.prizeAllocation.jackpotRolledOver ? (
                      <Badge variant="warning" size="sm">
                        Rolled Over
                      </Badge>
                    ) : (
                      `₹${(simulationResult.prizeAllocation.tier5.payoutPerWinnerCents / 100).toLocaleString('en-IN')} ea.`
                    )}
                  </div>
                </div>

                <div
                  className="ds-tier-card"
                  style={{
                    ["--tier-color" as any]: "#1e88e5",
                    animationDelay: "140ms",
                  }}
                >
                  <div className="ds-tier-head">
                    <span className="ds-tier-icon">
                      <Target size={12} />
                    </span>
                    Tier 4 (4-Match 35%)
                  </div>
                  <div className="ds-tier-amount">
                    ₹
                    {(
                      simulationResult.prizeAllocation.tier4.potCents / 100
                    ).toLocaleString('en-IN')}
                  </div>
                  <div className="ds-tier-meta">
                    {simulationResult.winners.tier4.length} winners · ₹
                    {(
                      simulationResult.prizeAllocation.tier4
                        .payoutPerWinnerCents / 100
                    ).toLocaleString('en-IN')}{" "}
                    ea.
                  </div>
                </div>

                <div
                  className="ds-tier-card"
                  style={{
                    ["--tier-color" as any]: "#8e24aa",
                    animationDelay: "220ms",
                  }}
                >
                  <div className="ds-tier-head">
                    <span className="ds-tier-icon">
                      <Crosshair size={12} />
                    </span>
                    Tier 3 (3-Match 25%)
                  </div>
                  <div className="ds-tier-amount">
                    ₹
                    {(
                      simulationResult.prizeAllocation.tier3.potCents / 100
                    ).toLocaleString('en-IN')}
                  </div>
                  <div className="ds-tier-meta">
                    {simulationResult.winners.tier3.length} winners · ₹
                    {(
                      simulationResult.prizeAllocation.tier3
                        .payoutPerWinnerCents / 100
                    ).toLocaleString('en-IN')}{" "}
                    ea.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="ds-empty-sim">
              <span className="ds-empty-icon">
                <Dices size={20} />
              </span>
              Click &ldquo;Run Simulation&rdquo; above to generate and audit a
              test draw cycle.
            </div>
          )}
        </div>
      </Card>

      <Card padding="none" className="ds-history-card">
        <div className="ds-history-head">
          <span className="ds-history-head-icon">
            <History size={15} />
          </span>
          <h4 style={{ color: "var(--forest-950)" }}>
            Official Published Draws History
          </h4>
        </div>

        {publishedDraws.length === 0 ? (
          <div className="ds-history-empty">
            No official draws published yet.
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
                <tr className="ds-thead-row">
                  <th>Month</th>
                  <th>Winning Numbers</th>
                  <th>Total Prize Pool</th>
                  <th>Winners (5/4/3)</th>
                  <th>Rollover</th>
                  <th>Published At</th>
                </tr>
              </thead>
              <tbody>
                {publishedDraws.map((d, i) => (
                  <tr
                    key={d.id}
                    className="ds-history-row"
                    style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
                  >
                    <td
                      style={{
                        padding: "var(--space-4)",
                        fontWeight: 700,
                        color: "var(--forest-950)",
                      }}
                    >
                      {d.draw_month}
                    </td>
                    <td style={{ padding: "var(--space-4)" }}>
                      <div style={{ display: "flex", gap: "4px" }}>
                        {(d.winning_numbers || []).map((n) => (
                          <ScoreBall
                            key={n}
                            number={n}
                            status="winning"
                            size="sm"
                          />
                        ))}
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "var(--space-4)",
                        fontFamily: "var(--font-numeric)",
                        fontWeight: 700,
                      }}
                    >
                      ₹{(d.total_prize_pool_cents / 100).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: "var(--space-4)" }}>
                      {d.tier_5_winners_count} / {d.tier_4_winners_count} /{" "}
                      {d.tier_3_winners_count}
                    </td>
                    <td style={{ padding: "var(--space-4)" }}>
                      {d.jackpot_rolled_over ? (
                        <Badge variant="warning" size="sm">
                          Rolled Over
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">
                          Won
                        </Badge>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "var(--space-4)",
                        color: "var(--text-muted)",
                        fontSize: "var(--text-xs)",
                      }}
                    >
                      {d.published_at
                        ? new Date(d.published_at).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ConfirmDrawModal
        isOpen={isConfirmPublishOpen}
        onClose={() => setIsConfirmPublishOpen(false)}
        simulationResult={simulationResult}
        isPublishing={isPublishing}
        onConfirmPublish={handleConfirmPublishDraw}
      />
    </div>
  );
};
