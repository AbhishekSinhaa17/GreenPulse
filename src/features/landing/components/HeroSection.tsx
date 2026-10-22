import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, type Variants } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Users,
  Trophy,
  Heart,
} from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { ScoreBall } from "../../../components/ui/ScoreBall";
import { useToast } from "../../../context/ToastContext";
import { useAuth } from "../../../hooks/useAuth";




/* -------------------------------------------------------------------------- */
/*  Animation Variants                                                        */
/* -------------------------------------------------------------------------- */

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const floatAnim = (delay = 0) => ({
  animate: {
    y: [0, -14, 0],
    transition: { duration: 6, repeat: Infinity, ease: "easeInOut" as const, delay },
  },
});

/* -------------------------------------------------------------------------- */
/*  Animated Counter                                                          */
/* -------------------------------------------------------------------------- */

const AnimatedCounter: React.FC<{
  end: number;
  prefix?: string;
  suffix?: string;
}> = ({ end, prefix = "", suffix = "" }) => {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frameId: number;
    const duration = 1400;
    const startTime = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * end));
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };
    frameId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [end]);

  return (
    <span>
      {prefix}
      {value.toLocaleString()}
      {suffix}
    </span>
  );
};

/* -------------------------------------------------------------------------- */
/*  Hero Section                                                              */
/* -------------------------------------------------------------------------- */

export const HeroSection: React.FC = () => {
  const { success } = useToast();
  const { user, isAdmin } = useAuth();

  const sampleScores = [38, 34, 41, 36, 32];
  const sampleWinningNumbers = [34, 18, 41, 29, 36];
  const matchedNumbers = sampleWinningNumbers.filter((n) =>
    sampleScores.includes(n),
  );

  const stats = [
    {
      icon: <Trophy size={16} />,
      label: "Prizes Paid",
      value: 27500000,
      prefix: "₹",
      suffix: "+",
    },
    {
      icon: <Users size={16} />,
      label: "Golfers Active",
      value: 1200,
      suffix: "+",
    },
    { icon: <TrendingUp size={16} />, label: "Charities Funded", value: 48 },
  ];

  return (
    <section
      className="section-hero"
      style={{
        position: "relative",
        overflow: "hidden",
        paddingTop: "var(--space-16)",
        paddingBottom: "var(--space-16)",
      }}
    >
      {/* ---------------------------------------------------------------- */}
      {/* Decorative animated background                                   */}
      {/* ---------------------------------------------------------------- */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 15% 20%, rgba(34,139,87,0.10) 0%, transparent 45%), radial-gradient(circle at 85% 15%, rgba(190,230,150,0.18) 0%, transparent 40%), radial-gradient(circle at 50% 100%, rgba(34,139,87,0.08) 0%, transparent 50%)",
          zIndex: 0,
        }}
      />

      <motion.div
        {...floatAnim(0)}
        aria-hidden
        style={{
          position: "absolute",
          top: "8%",
          left: "6%",
          width: 140,
          height: 140,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, var(--lime-200) 0%, transparent 70%)",
          filter: "blur(10px)",
          opacity: 0.6,
          zIndex: 0,
        }}
      />
      <motion.div
        {...floatAnim(1.5)}
        aria-hidden
        style={{
          position: "absolute",
          bottom: "12%",
          right: "8%",
          width: 180,
          height: 180,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, var(--forest-200) 0%, transparent 70%)",
          filter: "blur(14px)",
          opacity: 0.5,
          zIndex: 0,
        }}
      />

      <div className="container" style={{ position: "relative", zIndex: 1 }}>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          style={{ maxWidth: "860px", margin: "0 auto", textAlign: "center" }}
        >
          <motion.div
            variants={fadeUp}
            style={{ display: "inline-block", marginBottom: "var(--space-4)" }}
          >
            <motion.div
              animate={{ scale: [1, 1.04, 1] }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{ display: "inline-flex" }}
            >
              <Badge variant="forest">
                <Sparkles size={12} style={{ marginRight: 6 }} />
                The Purpose-Driven Golf Club · 2026 Season
              </Badge>
            </motion.div>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            style={{ marginBottom: "var(--space-6)", fontWeight: 600 }}
          >
            Play with purpose.{" "}
            <motion.span
              initial={{ backgroundPosition: "0% 50%" }}
              animate={{ backgroundPosition: "100% 50%" }}
              transition={{
                duration: 6,
                repeat: Infinity,
                repeatType: "mirror",
                ease: "linear",
              }}
              style={{
                fontStyle: "italic",
                backgroundImage:
                  "linear-gradient(90deg, var(--forest-600), var(--lime-500), var(--forest-600))",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Create lasting impact.
            </motion.span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="lead"
            style={{ maxWidth: "680px", margin: "0 auto var(--space-8)" }}
          >
            GreenPulse unites your golf performance tracking with verified
            monthly charity prize draws. Enter your Stableford scores, support
            causes you care about, and compete in monthly number-match prize
            pools with rollover jackpots.
          </motion.p>

          <motion.div
            variants={fadeUp}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-4)",
              flexWrap: "wrap",
            }}
          >
            <Link to={isAdmin ? "/admin" : user ? "/dashboard" : "/subscribe"}>
              <motion.div
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
              >
                <Button
                  variant="primary"
                  size="lg"
                  rightIcon={<ArrowRight size={18} />}
                >
                  {isAdmin
                    ? "Admin Portal"
                    : user
                      ? "Go to Dashboard"
                      : "Join the Platform"}
                </Button>
              </motion.div>
            </Link>
            <Link to="/charities">
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Button
                  variant="outline"
                  size="lg"
                  leftIcon={<Heart size={18} />}
                >
                  Explore Causes
                </Button>
              </motion.div>
            </Link>
          </motion.div>

          {/* Stats row */}
          <motion.div
            variants={fadeUp}
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "var(--space-8)",
              flexWrap: "wrap",
              marginTop: "var(--space-10)",
            }}
          >
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.12, duration: 0.5 }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    color: "var(--forest-600)",
                    fontWeight: 700,
                    fontSize: "var(--text-xl)",
                  }}
                >
                  {stat.icon}
                  <AnimatedCounter
                    end={stat.value}
                    prefix={stat.prefix}
                    suffix={stat.suffix}
                  />
                </div>
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--text-muted)",
                  }}
                >
                  {stat.label}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* ------------------------------------------------------------ */}
        {/* Interactive Draw Teaser Card                                  */}
        {/* ------------------------------------------------------------ */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{ marginTop: "var(--space-14)" }}
        >
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
          >
            <Card
              variant="warm"
              style={{
                maxWidth: "960px",
                margin: "0 auto",
                border: "1px solid var(--border-default)",
                boxShadow: "var(--shadow-lg)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* subtle shimmer accent */}
              <motion.div
                aria-hidden
                animate={{ x: ["-30%", "130%"] }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "linear",
                  repeatDelay: 2,
                }}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "30%",
                  height: "100%",
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)",
                  pointerEvents: "none",
                }}
              />

              <div
                className="flex flex-col md-flex-row justify-between items-center gap-6"
                style={{
                  padding: "var(--space-2)",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <div>
                  <div
                    className="flex items-center gap-2"
                    style={{ marginBottom: "var(--space-1)" }}
                  >
                    <motion.div
                      animate={{ opacity: [1, 0.4, 1] }}
                      transition={{ duration: 1.6, repeat: Infinity }}
                    >
                      <Badge variant="lime">● Live Draw Preview</Badge>
                    </motion.div>
                    <span
                      style={{
                        fontSize: "var(--text-xs)",
                        color: "var(--text-muted)",
                      }}
                    >
                      Cutoff: End of Month
                    </span>
                  </div>
                  <h3
                    style={{
                      fontSize: "var(--text-xl)",
                      color: "var(--forest-950)",
                    }}
                  >
                    October ₹27,50,000 Charity Prize Draw
                  </h3>
                  <p
                    style={{
                      fontSize: "var(--text-sm)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    40% 5-Match Rollover Jackpot · 35% 4-Match · 25% 3-Match
                  </p>
                </div>

                {/* Score Balls Demonstration */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "var(--space-3)",
                    flexWrap: "wrap",
                  }}
                >
                  {sampleWinningNumbers.map((num, i) => {
                    const isMatched = sampleScores.includes(num);
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.4, rotate: -90 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{
                          delay: 0.7 + i * 0.1,
                          type: "spring",
                          stiffness: 260,
                          damping: 16,
                        }}
                        whileHover={{ scale: 1.15, rotate: 4 }}
                      >
                        <motion.div
                          animate={
                            isMatched
                              ? {
                                  boxShadow: [
                                    "0 0 0px rgba(34,139,87,0)",
                                    "0 0 16px rgba(34,139,87,0.55)",
                                    "0 0 0px rgba(34,139,87,0)",
                                  ],
                                }
                              : {}
                          }
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.3,
                          }}
                          style={{ borderRadius: "50%" }}
                        >
                          <ScoreBall
                            number={num}
                            status={isMatched ? "matched" : "winning"}
                            label={`#${i + 1}`}
                          />
                        </motion.div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <div
                style={{
                  marginTop: "var(--space-6)",
                  paddingTop: "var(--space-4)",
                  borderTop: "1px solid var(--border-subtle)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "var(--space-4)",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.2, duration: 0.5 }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                  }}
                >
                  <CheckCircle2 size={16} color="var(--color-success)" />
                  <span
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "var(--charcoal-700)",
                    }}
                  >
                    Golfer Ticket matches{" "}
                    <strong>
                      {matchedNumbers.length} numbers (
                      {matchedNumbers.join(", ")})
                    </strong>{" "}
                    — Tier 3 Payout Eligible!
                  </span>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      success(
                        "Match Confirmed",
                        "You have 3 matching Stableford numbers for Tier 3.",
                      )
                    }
                  >
                    Simulate Claim Verification
                  </Button>
                </motion.div>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
