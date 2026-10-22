import React, { useState, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { PageContainer } from "../../components/layout/PageContainer";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { ScoreBall } from "../../components/ui/ScoreBall";
import { Dialog } from "../../components/ui/Dialog";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../hooks/useAuth";
import { scoreService } from "../../services/scoreService";
import { charityService } from "../../services/charityService";
import { drawService } from "../../services/drawService";
import { subscriptionService } from "../../services/subscriptionService";
import { authService } from "../../services/authService";
import { validateProofFile } from "../../services/verificationService";
import type {
  GolfScore,
  CharityPreference,
  WinnerClaim,
  Subscription,
} from "../../types";
import {
  Plus,
  Trash2,
  Upload,
  CreditCard,
  AlertCircle,
  RefreshCw,
  UserCheck,
  Heart,
  Trophy,
  Target,
  Flag,
  ListChecks,
} from "lucide-react";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const rowVariants: Variants = {
  hidden: { opacity: 0, x: -12 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
};

const TicketProgressRing: React.FC<{ count: number }> = ({ count }) => {
  const total = 5;
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(count / total, 1);
  const isComplete = progress === 1;

  return (
    <div
      className="dp-ring-wrap"
      style={{ position: "relative", width: 64, height: 64 }}
    >
      {isComplete && <span className="dp-ring-glow" />}
      <svg width={64} height={64} style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient
            id="dpRingGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor={isComplete ? "#43a047" : "#2e7d32"} />
            <stop
              offset="100%"
              stopColor={isComplete ? "#81c784" : "#66bb6a"}
            />
          </linearGradient>
        </defs>
        <circle
          cx={32}
          cy={32}
          r={radius}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth={6}
        />
        <motion.circle
          cx={32}
          cy={32}
          r={radius}
          fill="none"
          stroke="url(#dpRingGradient)"
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - progress) }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "var(--text-sm)",
          fontWeight: 700,
          color: "var(--forest-900)",
          fontFamily: "var(--font-numeric)",
        }}
      >
        {count}/{total}
      </div>
    </div>
  );
};

export const DashboardPage: React.FC = () => {
  const { success, error, warning } = useToast();
  const {
    user,
    profile,
    role,
    isAdmin,
    isLoading: isAuthLoading,
    refreshProfile,
    isConfigured,
  } = useAuth();

  const [scores, setScores] = useState<GolfScore[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [charityPref, setCharityPref] = useState<CharityPreference | null>(
    null,
  );
  const [winnerClaims, setWinnerClaims] = useState<WinnerClaim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editFullName, setEditFullName] = useState(profile?.full_name || "");
  const [editHandicap, setEditHandicap] = useState<string>(
    profile?.handicap ? String(profile.handicap) : "",
  );
  const [editHomeClub, setEditHomeClub] = useState(profile?.home_club || "");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const [isAddScoreOpen, setIsAddScoreOpen] = useState(false);
  const [newScoreVal, setNewScoreVal] = useState<number | "">(36);
  const [newScoreDate, setNewScoreDate] = useState<string>("");
  const [newScoreCourse, setNewScoreCourse] = useState<string>("");
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);

  const [isUploadProofOpen, setIsUploadProofOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<WinnerClaim | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [golferNotes, setGolferNotes] = useState("");
  const [isUploadingProof, setIsUploadingProof] = useState(false);

  const loadDashboardData = useCallback(() => {
    if (!isConfigured || !user || isAdmin || role === "admin") {
      return;
    }

    queueMicrotask(() => {
      setIsLoading(true);
      setLoadError(null);
    });

    Promise.all([
      scoreService.getScores(user.id),
      subscriptionService.getUserSubscription(user.id),
      charityService.getUserCharityPreference(user.id),
      drawService.getUserWinnerClaims(user.id),
    ])
      .then(([fetchedScores, fetchedSub, fetchedPref, fetchedClaims]) => {
        setScores(fetchedScores);
        setSubscription(fetchedSub);
        setCharityPref(fetchedPref);
        setWinnerClaims(fetchedClaims);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to load dashboard data from Supabase.";
        setLoadError(message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [user, isConfigured, isAdmin, role]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleAddScore = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConfigured) {
      error(
        "Database Required",
        "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env to record real rounds.",
      );
      return;
    }

    if (newScoreVal === "" || newScoreVal < 1 || newScoreVal > 45) {
      error(
        "Invalid Score",
        "Stableford score must be between 1 and 45 points.",
      );
      return;
    }

    if (!newScoreDate) {
      error("Missing Date", "Please select a date for the round.");
      return;
    }

    setIsSubmittingScore(true);
    try {
      const updated = await scoreService.submitScore(
        Number(newScoreVal),
        newScoreDate,
        newScoreCourse,
      );
      setScores(updated);
      setIsAddScoreOpen(false);
      setNewScoreVal(36);
      setNewScoreDate("");
      setNewScoreCourse("");
      success(
        "Score Recorded",
        `Added ${newScoreVal} pts. 5-score rolling queue updated automatically in database.`,
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to record score.";
      error("Score Error", msg);
    } finally {
      setIsSubmittingScore(false);
    }
  };

  const handleDeleteScore = async (id: string) => {
    if (!isConfigured) {
      warning(
        "Offline Mode",
        "Cannot delete from database when Supabase is unconfigured.",
      );
      return;
    }
    try {
      await scoreService.deleteScore(id);
      setScores((prev) => prev.filter((s) => s.id !== id));
      warning(
        "Score Removed",
        "Score deleted from your active 5-round ticket.",
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to delete score.";
      error("Delete Error", msg);
    }
  };

  const handleUploadProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaim || !proofFile || !user) {
      error("Missing File", "Please select a scorecard image file.");
      return;
    }

    const validation = validateProofFile({
      name: proofFile.name,
      size: proofFile.size,
      type: proofFile.type,
    });

    if (!validation.valid) {
      error(
        "Invalid File",
        validation.error ||
          "Please provide a valid JPEG, PNG, or WebP image under 5MB.",
      );
      return;
    }

    setIsUploadingProof(true);
    try {
      await drawService.submitWinnerProof(
        selectedClaim.id,
        user.id,
        proofFile,
        golferNotes,
      );
      success(
        "Proof Submitted",
        "Your scorecard proof has been uploaded for admin review.",
      );
      setIsUploadProofOpen(false);
      setProofFile(null);
      setGolferNotes("");
      await loadDashboardData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Proof upload failed.";
      error("Upload Error", msg);
    } finally {
      setIsUploadingProof(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsUpdatingProfile(true);
    try {
      const parsedHandicap =
        editHandicap.trim() !== "" ? Number(editHandicap) : undefined;
      await authService.updateProfile(user.id, {
        full_name: editFullName.trim() || profile?.full_name,
        handicap: parsedHandicap,
        home_club: editHomeClub.trim() || undefined,
      });
      await refreshProfile();
      success(
        "Profile Updated",
        "Your golfer details have been saved to PostgreSQL.",
      );
      setIsEditProfileOpen(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to update profile.";
      error("Update Error", msg);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  if (isAuthLoading) {
    return (
      <PageContainer>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "400px",
            gap: "var(--space-4)",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              border: "3px solid var(--forest-100)",
              borderTopColor: "var(--forest-800)",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <p className="text-muted" style={{ fontSize: "var(--text-sm)" }}>
            Verifying secure session...
          </p>
        </div>
      </PageContainer>
    );
  }

  if (isAdmin || role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  return (
    <PageContainer>
      <div className="dp-decor" aria-hidden="true">
        <div className="dp-orb dp-orb-1" />
        <div className="dp-orb dp-orb-2" />
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="flex flex-col md-flex-row justify-between items-start md-items-center gap-4 dp-header"
        style={{
          marginBottom: "var(--space-8)",
          paddingBottom: "var(--space-6)",
          borderBottom: "1px solid var(--border-default)",
        }}
      >
        <div>
          <span className="dp-eyebrow">
            <Flag size={11} />
            Golfer Workspace · {user?.email || "Guest Mode"}
          </span>
          <h2 className="dp-welcome">
            Welcome back,{" "}
            <span className="dp-welcome-name">
              {profile?.full_name || user?.email?.split("@")[0] || "Golfer"}
            </span>
          </h2>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "var(--space-2) var(--space-4)",
              marginTop: "var(--space-2)",
              fontSize: "var(--text-xs)",
              color: "var(--charcoal-700)",
            }}
          >
            <span>
              Handicap:{" "}
              <strong style={{ color: "var(--forest-800)" }}>
                {profile?.handicap !== undefined && profile?.handicap !== null
                  ? profile.handicap
                  : "Unassigned"}
              </strong>
            </span>
            <span>•</span>
            <span>
              Home Club:{" "}
              <strong style={{ color: "var(--forest-800)" }}>
                {profile?.home_club || "Not set"}
              </strong>
            </span>
            <span>•</span>
            <button
              onClick={() => {
                setEditFullName(profile?.full_name || "");
                setEditHandicap(
                  profile?.handicap !== undefined && profile?.handicap !== null
                    ? String(profile.handicap)
                    : "",
                );
                setEditHomeClub(profile?.home_club || "");
                setIsEditProfileOpen(true);
              }}
              className="dp-edit-link"
            >
              Edit Golfer Profile
            </button>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div className="flex items-center gap-2">
              <span
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-muted)",
                }}
              >
                Membership:
              </span>
              {subscription && subscription.status === "active" ? (
                <motion.div
                  animate={{ opacity: [1, 0.6, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="dp-active-badge-wrap"
                >
                  <Badge variant="success">
                    ● Active Member{subscription?.stripe_subscription_id ? "" : " (Demo)"}
                  </Badge>
                </motion.div>
              ) : (
                <Badge variant="neutral">No Active Plan</Badge>
              )}
            </div>
            <span
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--charcoal-600)",
                display: "block",
                marginTop: "2px",
              }}
            >
              {subscription && subscription.status === "active"
                ? `${subscription.plan_tier === "yearly" ? "Yearly Plan (₹20,900/yr)" : "Monthly Plan (₹2,090/mo)"} · Renews ${new Date(subscription.current_period_end).toLocaleDateString()}`
                : "Subscribe to activate monthly draw ticket"}
            </span>
          </div>

          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
            {subscription && subscription.status === "active" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  success(
                    "Demo Membership Active",
                    `You are subscribed to the ${subscription.plan_tier === "yearly" ? "Yearly" : "Monthly"} Plan. Simulated payments are enabled platform-wide.`
                  );
                }}
                leftIcon={<CreditCard size={14} />}
              >
                Manage Billing
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => window.location.assign("/subscribe")}
                leftIcon={<CreditCard size={14} />}
                className="dp-join-btn"
              >
                Join Membership
              </Button>
            )}
          </motion.div>

          <motion.div
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.4 }}
            style={{ display: "inline-block" }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={loadDashboardData}
              leftIcon={<RefreshCw size={14} />}
              title="Refresh database records"
            >
              Refresh
            </Button>
          </motion.div>
        </div>
      </motion.div>

      <AnimatePresence>
        {loadError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            role="alert"
            className="dp-error-banner"
            style={{
              padding: "var(--space-4)",
              backgroundColor: "var(--color-error-bg)",
              border: "1px solid var(--color-error-border)",
              borderRadius: "var(--radius-md)",
              marginBottom: "var(--space-6)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
              color: "var(--color-error)",
              fontSize: "var(--text-sm)",
              overflow: "hidden",
            }}
          >
            <AlertCircle
              size={18}
              className="dp-error-icon"
              style={{ flexShrink: 0 }}
            />
            <span>{loadError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
          gap: "var(--space-6)",
          marginBottom: "var(--space-8)",
        }}
      >

        <motion.div variants={fadeUp} whileHover={{ y: -4 }}>
          <Card
            className="dp-module-card dp-module-charity"
            style={{ height: "100%" }}
          >
            <div
              className="flex justify-between items-start"
              style={{ marginBottom: "var(--space-4)" }}
            >
              <div>
                <span className="dp-card-eyebrow">Designated Cause</span>
                <h4
                  style={{
                    marginTop: "2px",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span className="dp-icon-chip dp-icon-chip-charity">
                    <Heart size={13} />
                  </span>
                  {charityPref?.charity?.name || "No Charity Selected Yet"}
                </h4>
              </div>
              <Badge variant="lime">
                {charityPref
                  ? `${charityPref.percentage}% Pledged`
                  : "10% Minimum"}
              </Badge>
            </div>
            <p
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--charcoal-600)",
                marginBottom: "var(--space-4)",
              }}
            >
              {charityPref?.charity?.description ||
                "Select a verified charity partner to receive a portion of your subscription fee with each draw cycle."}
            </p>
            <div
              style={{
                paddingTop: "var(--space-3)",
                borderTop: "1px solid var(--border-subtle)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-muted)",
                }}
              >
                Lifetime Contribution:{" "}
                <strong className="dp-money-shimmer">₹0.00</strong>
              </span>
              <Button
                variant="ghost"
                size="sm"
                style={{ color: "var(--forest-800)" }}
              >
                Browse Charities
              </Button>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp} whileHover={{ y: -4 }}>
          <Card
            variant="warm"
            className="dp-module-card dp-module-winnings"
            style={{
              border: "1px solid var(--border-default)",
              height: "100%",
            }}
          >
            <div
              className="flex justify-between items-start"
              style={{ marginBottom: "var(--space-3)" }}
            >
              <div>
                <span className="dp-card-eyebrow">
                  Winnings & Verification
                </span>
                <h4
                  style={{
                    marginTop: "2px",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span className="dp-icon-chip dp-icon-chip-trophy">
                    <Trophy size={13} />
                  </span>
                  {winnerClaims.length > 0
                    ? `Prize Claims (${winnerClaims.length})`
                    : "No Active Prize Claims"}
                </h4>
              </div>
              {winnerClaims.length > 0 && (
                <Badge
                  variant={
                    winnerClaims[0].status === "verified"
                      ? "success"
                      : winnerClaims[0].status === "rejected"
                        ? "error"
                        : "warning"
                  }
                >
                  {winnerClaims[0].status.replace("_", " ")}
                </Badge>
              )}
            </div>

            {winnerClaims.length > 0 ? (
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-4)",
                }}
              >
                {winnerClaims.map((claim) => (
                  <motion.div
                    key={claim.id}
                    variants={fadeUp}
                    className="dp-claim-card"
                    style={{
                      padding: "var(--space-3)",
                      backgroundColor: "var(--bg-surface)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div
                      className="flex justify-between items-center"
                      style={{ marginBottom: "var(--space-2)" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          gap: "var(--space-2)",
                        }}
                      >
                        <span className="dp-prize-amount">
                          ₹{(claim.prize_amount_cents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <Badge variant="forest" size="sm">
                          {claim.match_tier.replace("_", " ").toUpperCase()}
                        </Badge>
                      </div>
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
                    </div>

                    <AnimatePresence>
                      {claim.status === "rejected" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="dp-reject-alert"
                          style={{
                            padding: "var(--space-2) var(--space-3)",
                            backgroundColor: "var(--color-error-bg)",
                            border: "1px solid var(--color-error-border)",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "var(--text-xs)",
                            color: "var(--color-error)",
                            marginBottom: "var(--space-3)",
                            overflow: "hidden",
                          }}
                        >
                          <strong>Verification Issue:</strong>{" "}
                          {claim.rejection_reason ||
                            "Scorecard screenshot rejected by admin. Please upload a clear scorecard matching your round date."}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {claim.status === "under_review" && (
                      <p
                        style={{
                          fontSize: "var(--text-xs)",
                          color: "var(--charcoal-600)",
                          margin: "var(--space-2) 0",
                        }}
                      >
                        Proof uploaded. Your round date and score are currently
                        under review by platform administrators.
                      </p>
                    )}

                    {claim.status === "verified" && (
                      <p
                        style={{
                          fontSize: "var(--text-xs)",
                          color: "var(--color-success)",
                          margin: "var(--space-2) 0",
                        }}
                      >
                        Scorecard verified! Payout status: Queued for transfer.
                      </p>
                    )}

                    {claim.status === "paid" && (
                      <p
                        style={{
                          fontSize: "var(--text-xs)",
                          color: "var(--forest-800)",
                          margin: "var(--space-2) 0",
                        }}
                      >
                        Prize payout completed. Reference:{" "}
                        {claim.payout_reference || "Completed"}
                      </p>
                    )}

                    {(claim.status === "pending_proof" ||
                      claim.status === "rejected") && (
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          variant={
                            claim.status === "rejected" ? "accent" : "primary"
                          }
                          size="sm"
                          className="w-full"
                          leftIcon={<Upload size={14} />}
                          onClick={() => {
                            setSelectedClaim(claim);
                            setIsUploadProofOpen(true);
                          }}
                        >
                          {claim.status === "rejected"
                            ? "Re-upload Corrected Proof"
                            : "Upload Scorecard Proof"}
                        </Button>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <p
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--charcoal-600)",
                  marginTop: "var(--space-2)",
                }}
              >
                Scores matching 3, 4, or 5 numbers in the monthly draw will
                generate prize claims here.
              </p>
            )}
          </Card>
        </motion.div>

        <motion.div variants={fadeUp} whileHover={{ y: -4 }}>
          <Card
            className="dp-module-card dp-module-participation"
            style={{ height: "100%" }}
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="dp-card-eyebrow">Draw Participation</span>
                <h4
                  style={{
                    marginTop: "2px",
                    marginBottom: "var(--space-4)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span className="dp-icon-chip dp-icon-chip-target">
                    <Target size={13} />
                  </span>
                  Active Ticket Snapshot
                </h4>
              </div>
              <TicketProgressRing count={scores.length} />
            </div>

            {scores.length > 0 ? (
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                style={{
                  display: "flex",
                  gap: "var(--space-2)",
                  marginBottom: "var(--space-4)",
                  flexWrap: "wrap",
                }}
              >
                {scores.map((s, i) => (
                  <motion.div
                    key={s.id}
                    variants={{
                      hidden: { opacity: 0, scale: 0.5 },
                      visible: { opacity: 1, scale: 1 },
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 18 }}
                    whileHover={{ scale: 1.15 }}
                  >
                    <ScoreBall number={s.score} label={`#${i + 1}`} size="sm" />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div
                style={{
                  padding: "var(--space-4) 0",
                  color: "var(--text-muted)",
                  fontSize: "var(--text-sm)",
                }}
              >
                No scores recorded yet. Add 5 rounds below to activate your
                monthly draw ticket.
              </div>
            )}
            <div
              style={{
                paddingTop: "var(--space-3)",
                borderTop: "1px solid var(--border-subtle)",
                display: "flex",
                justifyContent: "space-between",
                fontSize: "var(--text-xs)",
                color: "var(--charcoal-600)",
              }}
            >
              <span>
                Active Rounds: <strong>{scores.length}/5</strong>
              </span>
              <span>
                Ticket Status:{" "}
                <strong>
                  {scores.length === 5 ? "Active" : "Needs 5 Rounds"}
                </strong>
              </span>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={fadeUp}
        style={{ marginTop: "var(--space-8)" }}
      >
        <div
          className="flex flex-col sm-flex-row justify-between items-start sm-items-center gap-4"
          style={{ marginBottom: "var(--space-4)" }}
        >
          <div>
            <h3
              style={{
                fontSize: "var(--text-2xl)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span className="dp-icon-chip dp-icon-chip-list">
                <ListChecks size={14} />
              </span>
              Latest 5 Golf Scores (Stableford)
            </h3>
            <p
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--text-secondary)",
              }}
            >
              Scores between 1–45 points. Automatic rolling FIFO retention —
              newest replaces oldest.
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
            <Button
              variant="primary"
              leftIcon={<Plus size={16} />}
              onClick={() => setIsAddScoreOpen(true)}
              className="dp-add-round-btn"
            >
              Add Golf Round
            </Button>
          </motion.div>
        </div>

        <Card
          padding="none"
          className="dp-table-card"
          style={{ overflow: "hidden" }}
        >
          {isLoading ? (
            <div style={{ padding: "var(--space-6)" }}>
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.35, 0.7, 0.35] }}
                  transition={{
                    duration: 1.3,
                    repeat: Infinity,
                    delay: i * 0.15,
                  }}
                  style={{
                    height: 44,
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--bg-surface-warm)",
                    marginBottom: "var(--space-3)",
                  }}
                />
              ))}
            </div>
          ) : scores.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ padding: "var(--space-12)", textAlign: "center" }}
            >
              <div className="dp-empty-badge">
                <Flag size={22} />
              </div>
              <p
                style={{
                  color: "var(--charcoal-500)",
                  marginBottom: "var(--space-4)",
                }}
              >
                No Stableford rounds logged yet.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddScoreOpen(true)}
              >
                Record Your First Round
              </Button>
            </motion.div>
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
                  <tr
                    style={{
                      backgroundColor: "var(--bg-surface-warm)",
                      borderBottom: "1px solid var(--border-default)",
                    }}
                  >
                    <th
                      style={{
                        padding: "var(--space-4)",
                        fontWeight: 600,
                        color: "var(--forest-900)",
                      }}
                    >
                      Stableford Score
                    </th>
                    <th
                      style={{
                        padding: "var(--space-4)",
                        fontWeight: 600,
                        color: "var(--forest-900)",
                      }}
                    >
                      Date Played
                    </th>
                    <th
                      style={{
                        padding: "var(--space-4)",
                        fontWeight: 600,
                        color: "var(--forest-900)",
                      }}
                    >
                      Course / Club
                    </th>
                    <th
                      style={{
                        padding: "var(--space-4)",
                        fontWeight: 600,
                        color: "var(--forest-900)",
                      }}
                    >
                      Verification
                    </th>
                    <th
                      style={{
                        padding: "var(--space-4)",
                        textAlign: "right",
                        fontWeight: 600,
                        color: "var(--forest-900)",
                      }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <motion.tbody
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                >
                  <AnimatePresence initial={false}>
                    {scores.map((s, index) => (
                      <motion.tr
                        key={s.id}
                        variants={rowVariants}
                        exit={{
                          opacity: 0,
                          x: 20,
                          transition: { duration: 0.2 },
                        }}
                        layout
                        className="dp-score-row"
                        whileHover={{
                          backgroundColor: "rgba(46,125,50,0.035)",
                        }}
                        style={{
                          borderBottom:
                            index < scores.length - 1
                              ? "1px solid var(--border-subtle)"
                              : "none",
                          position: "relative",
                        }}
                      >
                        <td style={{ padding: "var(--space-4)" }}>
                          <div className="flex items-center gap-3">
                            <ScoreBall number={s.score} size="sm" />
                            <span
                              style={{
                                fontWeight: 600,
                                color: "var(--forest-950)",
                              }}
                            >
                              {s.score} pts
                            </span>
                          </div>
                        </td>
                        <td
                          style={{
                            padding: "var(--space-4)",
                            color: "var(--charcoal-700)",
                          }}
                        >
                          {s.played_at}
                        </td>
                        <td
                          style={{
                            padding: "var(--space-4)",
                            color: "var(--charcoal-800)",
                            fontWeight: 500,
                          }}
                        >
                          {s.course_name || "Home Course"}
                        </td>
                        <td style={{ padding: "var(--space-4)" }}>
                          {s.verified ? (
                            <Badge variant="success" size="sm">
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="neutral" size="sm">
                              Self-Reported
                            </Badge>
                          )}
                        </td>
                        <td
                          style={{
                            padding: "var(--space-4)",
                            textAlign: "right",
                          }}
                        >
                          <motion.button
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDeleteScore(s.id)}
                            className="dp-delete-btn"
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--color-error)",
                              cursor: "pointer",
                              padding: "var(--space-1)",
                            }}
                            title="Delete round"
                          >
                            <Trash2 size={16} />
                          </motion.button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </motion.tbody>
              </table>
            </div>
          )}
        </Card>
      </motion.div>

      <Dialog
        isOpen={isAddScoreOpen}
        onClose={() => setIsAddScoreOpen(false)}
        title="Record New Golf Round"
        description="Enter your latest Stableford score (1–45) and the round date."
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsAddScoreOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={isSubmittingScore}
              onClick={handleAddScore}
            >
              Save to Active Scores
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddScore}>
          <Input
            label="Stableford Points (1–45)"
            type="number"
            min="1"
            max="45"
            value={newScoreVal}
            onChange={(e) =>
              setNewScoreVal(
                e.target.value === "" ? "" : Number(e.target.value),
              )
            }
            hint="Valid Stableford score range is between 1 and 45 points."
            required
          />

          <Input
            label="Round Date"
            type="date"
            value={newScoreDate}
            onChange={(e) => setNewScoreDate(e.target.value)}
            hint="Only one entry per round date permitted. Duplicate dates are rejected."
            required
          />

          <Input
            label="Course / Golf Club Name"
            type="text"
            value={newScoreCourse}
            onChange={(e) => setNewScoreCourse(e.target.value)}
            placeholder="e.g. St Andrews Old Course"
          />
        </form>
      </Dialog>

      <Dialog
        isOpen={isUploadProofOpen}
        onClose={() => setIsUploadProofOpen(false)}
        title="Submit Winner Verification Proof"
        description="Upload a screenshot of your score from Golf Genius, HowDidiDo, or your WHS app (JPEG, PNG, or WebP up to 5MB)."
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsUploadProofOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={isUploadingProof}
              disabled={!proofFile}
              onClick={handleUploadProof}
            >
              Submit for Verification
            </Button>
          </>
        }
      >
        <form
          onSubmit={handleUploadProof}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
          }}
        >
          <div>
            <label
              className="form-label"
              style={{
                fontWeight: 600,
                display: "block",
                marginBottom: "var(--space-1)",
              }}
            >
              Scorecard Screenshot File (Max 5MB)
            </label>
            <input
              type="file"
              className="form-input"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const val = validateProofFile({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                  });
                  if (!val.valid) {
                    error(
                      "File Validation Failed",
                      val.error || "Invalid file format or size.",
                    );
                    setProofFile(null);
                    e.target.value = "";
                    return;
                  }
                  setProofFile(file);
                }
              }}
              required
            />
            <span
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--text-muted)",
                display: "block",
                marginTop: "var(--space-1)",
              }}
            >
              Accepted formats: .jpg, .jpeg, .png, .webp. Max file size: 5.0 MB.
            </span>
          </div>

          <AnimatePresence>
            {proofFile && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="dp-file-selected"
                style={{
                  padding: "var(--space-2) var(--space-3)",
                  backgroundColor: "var(--bg-surface-warm)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "var(--text-xs)",
                  color: "var(--forest-900)",
                  overflow: "hidden",
                }}
              >
                Selected: <strong>{proofFile.name}</strong> (
                {(proofFile.size / 1024).toFixed(0)} KB)
              </motion.div>
            )}
          </AnimatePresence>

          <Input
            label="Golfer Notes (Optional)"
            type="text"
            value={golferNotes}
            onChange={(e) => setGolferNotes(e.target.value)}
            placeholder="e.g. Round played at club championship, tees White"
          />

          <p
            style={{ fontSize: "var(--text-xs)", color: "var(--charcoal-600)" }}
          >
            Uploaded securely with end-to-end encryption. Our verification team
            reviews scorecard authenticity and round details prior to payout
            release.
          </p>
        </form>
      </Dialog>

      <Dialog
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        title="Edit Golfer Profile Details"
        description="Update your display name, current WHS handicap, and home golf club."
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsEditProfileOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={isUpdatingProfile}
              onClick={handleUpdateProfile}
              leftIcon={<UserCheck size={14} />}
            >
              Save Profile
            </Button>
          </>
        }
      >
        <form
          onSubmit={handleUpdateProfile}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
          }}
        >
          <Input
            label="Full Name"
            type="text"
            value={editFullName}
            onChange={(e) => setEditFullName(e.target.value)}
            placeholder="e.g. Marcus Reid"
            required
          />

          <Input
            label="Handicap Index (e.g. 14.2)"
            type="number"
            step="0.1"
            min="-10"
            max="54"
            value={editHandicap}
            onChange={(e) => setEditHandicap(e.target.value)}
            placeholder="e.g. 14.2"
            hint="Official WHS handicap index (between -10 and 54)."
          />

          <Input
            label="Home Golf Club / Course"
            type="text"
            value={editHomeClub}
            onChange={(e) => setEditHomeClub(e.target.value)}
            placeholder="e.g. St Andrews Links, Scotland"
          />
        </form>
      </Dialog>

      <style>{`
        .dp-decor {
          position: fixed;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: -1;
        }

        .dp-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(70px);
          opacity: 0.12;
          animation: dpOrbFloat 11s ease-in-out infinite;
        }

        .dp-orb-1 {
          width: 320px;
          height: 320px;
          top: -80px;
          right: 5%;
          background: radial-gradient(circle, #43a047, transparent 70%);
        }

        .dp-orb-2 {
          width: 280px;
          height: 280px;
          bottom: 10%;
          left: -60px;
          background: radial-gradient(circle, #2e7d32, transparent 70%);
          animation-delay: 3s;
        }

        @keyframes dpOrbFloat {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(16px, -18px); }
        }

        .dp-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: var(--text-xs);
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .dp-welcome {
          color: var(--forest-950);
        }

        .dp-welcome-name {
          background: linear-gradient(135deg, var(--forest-950, #0d2b14), var(--forest-700, #2e7d32));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .dp-edit-link {
          background: none;
          border: none;
          color: var(--forest-700);
          text-decoration: underline;
          cursor: pointer;
          font-weight: 600;
          padding: 0;
          transition: color 0.2s ease;
        }

        .dp-edit-link:hover {
          color: var(--forest-900);
        }

        .dp-join-btn:hover {
          box-shadow: 0 8px 18px -8px rgba(46, 125, 50, 0.45);
        }

        .dp-error-icon {
          animation: dpIconPulse 1.6s ease-in-out infinite;
        }

        @keyframes dpIconPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .dp-card-eyebrow {
          font-size: var(--text-xs);
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .dp-icon-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .dp-icon-chip-charity {
          background: rgba(46, 125, 50, 0.12);
          color: var(--forest-700);
        }

        .dp-icon-chip-trophy {
          background: rgba(251, 140, 0, 0.14);
          color: #fb8c00;
        }

        .dp-icon-chip-target {
          background: rgba(30, 136, 229, 0.14);
          color: #1e88e5;
        }

        .dp-icon-chip-list {
          background: rgba(46, 125, 50, 0.12);
          color: var(--forest-700);
        }

        .dp-module-card {
          position: relative;
          overflow: hidden;
          transition: box-shadow 0.3s ease;
        }

        .dp-module-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #2e7d32, #43a047);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.35s ease;
        }

        .dp-module-card:hover::before {
          transform: scaleX(1);
        }

        .dp-money-shimmer {
          background: linear-gradient(135deg, var(--forest-900), #43a047, var(--forest-900));
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: dpShimmer 3s linear infinite;
        }

        @keyframes dpShimmer {
          to { background-position: 200% center; }
        }

        .dp-prize-amount {
          font-family: var(--font-numeric);
          font-size: var(--text-2xl);
          font-weight: 700;
          background: linear-gradient(135deg, var(--forest-900), #43a047, var(--forest-900));
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: dpShimmer 3s linear infinite;
        }

        .dp-claim-card {
          transition: box-shadow 0.25s ease, transform 0.25s ease;
        }

        .dp-claim-card:hover {
          box-shadow: var(--shadow-sm);
          transform: translateY(-1px);
        }

        .dp-reject-alert {
          position: relative;
          animation: dpShake 0.4s ease;
        }

        @keyframes dpShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
        }

        .dp-ring-wrap {
          display: inline-flex;
        }

        .dp-ring-glow {
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(67, 160, 71, 0.35), transparent 70%);
          animation: dpRingPulse 2s ease-in-out infinite;
        }

        @keyframes dpRingPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }

        .dp-add-round-btn:hover {
          box-shadow: 0 8px 18px -8px rgba(46, 125, 50, 0.45);
        }

        .dp-table-card {
          transition: box-shadow 0.3s ease;
        }

        .dp-score-row {
          position: relative;
        }

        .dp-score-row::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: linear-gradient(180deg, #2e7d32, #43a047);
          transform: scaleY(0);
          transform-origin: center;
          transition: transform 0.25s ease;
        }

        .dp-score-row:hover::before {
          transform: scaleY(1);
        }

        .dp-delete-btn {
          border-radius: var(--radius-sm);
          transition: background-color 0.2s ease;
        }

        .dp-delete-btn:hover {
          background-color: var(--color-error-bg) !important;
        }

        .dp-empty-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: var(--bg-surface-warm);
          color: var(--forest-600);
          margin-bottom: var(--space-3);
        }

        .dp-file-selected {
          border-left: 2px solid var(--forest-400);
        }

        @media (prefers-reduced-motion: reduce) {
          .dp-orb, .dp-money-shimmer, .dp-prize-amount, .dp-ring-glow,
          .dp-error-icon, .dp-reject-alert, .dp-score-row::before,
          .dp-module-card::before {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </PageContainer>
  );
};
