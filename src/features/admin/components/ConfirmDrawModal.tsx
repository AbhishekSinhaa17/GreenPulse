import React from "react";
import { Dialog } from "../../../components/ui/Dialog";
import { Button } from "../../../components/ui/Button";
import { ScoreBall } from "../../../components/ui/ScoreBall";
import {
  AlertCircle,
  Trophy,
  Coins,
  Target,
  Crosshair,
  Lock,
} from "lucide-react";
import type { DrawSimulationResult } from "../../../services/drawEngine";

interface ConfirmDrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  simulationResult: DrawSimulationResult | null;
  isPublishing: boolean;
  onConfirmPublish: () => Promise<void>;
}

export const ConfirmDrawModal: React.FC<ConfirmDrawModalProps> = ({
  isOpen,
  onClose,
  simulationResult,
  isPublishing,
  onConfirmPublish,
}) => {
  if (!simulationResult) return null;

  const totalWinners =
    simulationResult.winners.tier5.length +
    simulationResult.winners.tier4.length +
    simulationResult.winners.tier3.length;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Official Draw Publication"
      description={`Commit official results for ${simulationResult.drawMonth} to Supabase.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            isLoading={isPublishing}
            onClick={onConfirmPublish}
          >
            Confirm & Publish Official Draw
          </Button>
        </>
      }
    >
      <div className="cd-wrap">
        <style>{`
          @keyframes cdFadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes cdBallPop {
            0% { opacity: 0; transform: scale(0.3) translateY(10px); }
            60% { opacity: 1; transform: scale(1.15) translateY(-2px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
          }
          @keyframes cdShimmerSweep {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          @keyframes cdWarnPulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(251,140,0,0.25); }
            50% { box-shadow: 0 0 0 6px rgba(251,140,0,0); }
          }
          @keyframes cdSpinSlow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          .cd-wrap {
            display: flex;
            flex-direction: column;
            gap: var(--space-4);
            animation: cdFadeIn 0.35s ease;
          }

          .cd-numbers-panel {
            position: relative;
            overflow: hidden;
            padding: var(--space-5) var(--space-4);
            border-radius: 16px;
            background: linear-gradient(135deg, var(--forest-950, #0b2e1f), #163d28);
            box-shadow: 0 10px 28px -14px rgba(11,46,31,0.6);
          }

          .cd-numbers-panel::before {
            content: '';
            position: absolute;
            inset: 0;
            background:
              radial-gradient(circle at 15% 20%, rgba(255,255,255,0.08), transparent 40%),
              radial-gradient(circle at 85% 80%, rgba(156,204,101,0.15), transparent 45%);
            pointer-events: none;
          }

          .cd-numbers-label {
            display: flex;
            align-items: center;
            gap: 7px;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #c5e1a5;
            margin-bottom: var(--space-3);
            position: relative;
            z-index: 1;
          }

          .cd-numbers-label svg {
            color: #ffd54f;
            animation: cdSpinSlow 7s linear infinite;
          }

          .cd-balls-row {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            position: relative;
            z-index: 1;
          }

          .cd-ball-pop {
            animation: cdBallPop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both;
          }

          .cd-stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 10px;
          }

          .cd-stat-card {
            position: relative;
            overflow: hidden;
            padding: 12px 14px;
            border-radius: 12px;
            border: 1px solid var(--border-default);
            background: #fff;
            animation: cdFadeIn 0.4s ease both;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }

          .cd-stat-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 20px -12px var(--stat-color, rgba(0,0,0,0.3));
            border-color: var(--stat-color, var(--border-default));
          }

          .cd-stat-icon {
            width: 26px;
            height: 26px;
            border-radius: 8px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: var(--stat-color, #2e7d32);
            color: #fff;
            margin-bottom: 6px;
          }

          .cd-stat-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: var(--text-muted);
            font-weight: 700;
          }

          .cd-stat-value {
            font-size: var(--text-lg);
            font-weight: 800;
            color: var(--forest-950);
            margin-top: 2px;
            font-variant-numeric: tabular-nums;
          }

          .cd-stat-value.pool {
            background: linear-gradient(90deg, #2e7d32, #66bb6a, #2e7d32);
            background-size: 200% auto;
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            animation: cdShimmerSweep 5s linear infinite;
          }

          .cd-stat-sub {
            font-size: 10px;
            color: var(--text-muted);
            margin-top: 2px;
          }

          .cd-rollover-tag {
            display: inline-flex;
            align-items: center;
            gap: 3px;
            margin-top: 4px;
            padding: 2px 7px;
            border-radius: 999px;
            background: rgba(251,140,0,0.12);
            color: #e65100;
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.03em;
          }

          .cd-warning {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding: 12px 14px;
            border-radius: 12px;
            background: rgba(251,140,0,0.08);
            border: 1px solid rgba(251,140,0,0.3);
            animation: cdFadeIn 0.45s ease both, cdWarnPulse 2.6s ease-in-out infinite;
          }

          .cd-warning-icon {
            flex-shrink: 0;
            color: #e65100;
            margin-top: 1px;
          }

          .cd-warning-text {
            font-size: var(--text-xs);
            color: var(--charcoal-900, #263238);
            line-height: 1.5;
          }

          .cd-warning-text strong {
            color: #e65100;
          }
        `}</style>

        {/* Winning Numbers Reveal Panel */}
        <div className="cd-numbers-panel">
          <div className="cd-numbers-label">
            <Trophy size={14} />
            Winning Numbers to be Published
          </div>
          <div className="cd-balls-row">
            {simulationResult.winningNumbers.map((n, i) => (
              <div
                key={n}
                className="cd-ball-pop"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <ScoreBall number={n} status="winning" size="sm" />
              </div>
            ))}
          </div>
        </div>

        {/* Stat Cards */}
        <div className="cd-stats-grid">
          <div
            className="cd-stat-card"
            style={{
              ["--stat-color" as any]: "#2e7d32",
              animationDelay: "60ms",
            }}
          >
            <span className="cd-stat-icon">
              <Coins size={13} />
            </span>
            <div className="cd-stat-label">Total Pool</div>
            <div className="cd-stat-value pool">
              ₹
              {(
                simulationResult.prizeAllocation.totalPrizePoolCents / 100
              ).toLocaleString('en-IN')}
            </div>
          </div>

          <div
            className="cd-stat-card"
            style={{
              ["--stat-color" as any]: "#fb8c00",
              animationDelay: "120ms",
            }}
          >
            <span className="cd-stat-icon">
              <Target size={13} />
            </span>
            <div className="cd-stat-label">5-Match Jackpot</div>
            <div className="cd-stat-value">
              {simulationResult.winners.tier5.length}
            </div>
            <div className="cd-stat-sub">winners</div>
            {simulationResult.prizeAllocation.jackpotRolledOver && (
              <span className="cd-rollover-tag">Rolled Over</span>
            )}
          </div>

          <div
            className="cd-stat-card"
            style={{
              ["--stat-color" as any]: "#1e88e5",
              animationDelay: "180ms",
            }}
          >
            <span className="cd-stat-icon">
              <Crosshair size={13} />
            </span>
            <div className="cd-stat-label">4-Match</div>
            <div className="cd-stat-value">
              {simulationResult.winners.tier4.length}
            </div>
            <div className="cd-stat-sub">winners</div>
          </div>

          <div
            className="cd-stat-card"
            style={{
              ["--stat-color" as any]: "#8e24aa",
              animationDelay: "240ms",
            }}
          >
            <span className="cd-stat-icon">
              <Crosshair size={13} />
            </span>
            <div className="cd-stat-label">3-Match</div>
            <div className="cd-stat-value">
              {simulationResult.winners.tier3.length}
            </div>
            <div className="cd-stat-sub">winners</div>
          </div>
        </div>

        <div
          style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            textAlign: "center",
          }}
        >
          {totalWinners} total winning entries across all prize tiers
        </div>

        {/* Immutability Warning */}
        <div className="cd-warning">
          <AlertCircle size={16} className="cd-warning-icon" />
          <span className="cd-warning-text">
            <strong>Irreversible Action:</strong> Publication creates immutable
            Draw Entries and Winner Claims backed by{" "}
            <Lock
              size={10}
              style={{ display: "inline", verticalAlign: "-1px" }}
            />{" "}
            database-level integrity constraints. Once published, this draw
            cannot be re-simulated.
          </span>
        </div>
      </div>
    </Dialog>
  );
};
