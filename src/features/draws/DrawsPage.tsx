import React, { useState, useEffect } from "react";
import {
  motion,
  AnimatePresence,
  type Variants,
  useMotionValue,
  useSpring,
} from "framer-motion";
import { PageContainer } from "../../components/layout/PageContainer";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { ScoreBall } from "../../components/ui/ScoreBall";
import {
  Clock,
  ShieldCheck,
  History,
  Trophy,
  Sparkles,
} from "lucide-react";
import { drawService } from "../../services/drawService";
import { useAuth } from "../../hooks/useAuth";
import type { MonthlyDraw } from "../../types";

const AnimatedCounter: React.FC<{
  value: number;
  prefix?: string;
  suffix?: string;
}> = ({ value, prefix = "", suffix = "" }) => {
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, {
    stiffness: 90,
    damping: 20,
    mass: 0.6,
  });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    motionVal.set(value);
  }, [value, motionVal]);

  useEffect(() => {
    const unsub = spring.on("change", (v) =>
      setDisplay(Math.round(v).toLocaleString()),
    );
    return () => unsub();
  }, [spring]);

  return (
    <span>
      {prefix}
      {display}
      {suffix}
    </span>
  );
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const ballVariants: Variants = {
  hidden: { opacity: 0, scale: 0.3, y: -20, rotate: -90 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    rotate: 0,
    transition: { type: "spring", stiffness: 260, damping: 16 },
  },
};

export const DrawsPage: React.FC = () => {
  const { isConfigured } = useAuth();
  const [publishedDraws, setPublishedDraws] = useState<MonthlyDraw[]>([]);
  const [isLoading, setIsLoading] = useState(() => isConfigured);

  useEffect(() => {
    let isMounted = true;
    if (isConfigured) {
      drawService
        .getPublishedDraws()
        .then((draws) => {
          if (isMounted) setPublishedDraws(draws);
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [isConfigured]);

  const latestDraw = publishedDraws.length > 0 ? publishedDraws[0] : null;
  const pastDraws = publishedDraws.length > 1 ? publishedDraws.slice(1) : [];

  const totalPool = latestDraw
    ? latestDraw.total_prize_pool_cents / 100
    : 3129500;
  const tier5 = latestDraw ? latestDraw.tier_5_pot_cents / 100 : 2153800;
  const tier4 = latestDraw ? latestDraw.tier_4_pot_cents / 100 : 1095270;
  const tier3 = latestDraw ? latestDraw.tier_3_pot_cents / 100 : 782320;
  const tierSum = tier5 + tier4 + tier3 || 1;

  const winningNumbers = latestDraw?.winning_numbers || [14, 27, 33, 38, 42];
  const isRolledOver = latestDraw ? latestDraw.jackpot_rolled_over : true;

  return (
    <PageContainer>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        style={{
          maxWidth: "800px",
          margin: "0 auto var(--space-8)",
          textAlign: "center",
          position: "relative",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -30,
            left: "50%",
            transform: "translateX(-50%)",
            width: 340,
            height: 160,
            background:
              "radial-gradient(ellipse, rgba(34,139,87,0.12) 0%, transparent 70%)",
            zIndex: -1,
          }}
        />
        <div
          className="flex justify-center items-center gap-2"
          style={{ marginBottom: "var(--space-2)" }}
        >
          <Badge variant="forest">
            Monthly Draw & Reward Engine
          </Badge>
          <motion.div
            animate={latestDraw ? { opacity: [1, 0.5, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Badge variant={latestDraw ? "success" : "neutral"}>
              {latestDraw ? "● Official Published Draw" : "Scheduled Cycle"}
            </Badge>
          </motion.div>
        </div>
        <h2>The Monthly Draw. High Stakes, Lasting Purpose.</h2>
        <p>
          Each month, 5 winning numbers between 1 and 45 are drawn. Your active
          5 Stableford scores act as your monthly draw ticket. 40% of net
          subscription revenue funds the prize pool with jackpot rollover.
        </p>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={fadeUp}
        style={{ maxWidth: "960px", margin: "0 auto var(--space-8)" }}
      >
        <Card
          variant="warm"
          style={{
            border: "1px solid var(--border-default)",
            padding: "var(--space-8)",
            position: "relative",
            overflow: "hidden",
          }}
        >

          {isRolledOver && (
            <motion.div
              aria-hidden
              animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.08, 1] }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{
                position: "absolute",
                top: -60,
                right: -60,
                width: 220,
                height: 220,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(190,230,110,0.3) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />
          )}

          <div
            className="flex flex-col md-flex-row justify-between items-center gap-6"
            style={{ position: "relative", zIndex: 1 }}
          >
            <div>
              <div
                className="flex items-center gap-2"
                style={{ marginBottom: "var(--space-2)" }}
              >
                <Badge variant="lime">
                  {latestDraw
                    ? `Cycle: ${latestDraw.draw_month}`
                    : "Upcoming Cycle: October 2026"}
                </Badge>
                <span
                  className="flex items-center gap-1 text-muted"
                  style={{ fontSize: "var(--text-xs)" }}
                >
                  <Clock size={14} />{" "}
                  {latestDraw
                    ? "Official Verified Result"
                    : "Cycle in Progress"}
                </span>
              </div>
              <h3
                style={{
                  fontSize: "var(--text-3xl)",
                  color: "var(--forest-950)",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                {isRolledOver && (
                  <motion.span
                    animate={{ rotate: [0, -8, 8, 0] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 1,
                    }}
                    style={{
                      display: "inline-flex",
                      color: "var(--lime-600, var(--lime-500))",
                    }}
                  >
                    <Trophy size={26} />
                  </motion.span>
                )}
                {latestDraw ? "Verified Pool: " : "Estimated Pool: "}
                <AnimatedCounter value={totalPool} prefix="₹" />
              </h3>
              <p
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--charcoal-700)",
                  marginTop: "var(--space-1)",
                }}
              >
                {latestDraw
                  ? `${latestDraw.jackpot_rolled_over ? "Tier 1 Jackpot unclaimed — Rollover enabled for next cycle." : "Jackpot won and distributed to 5-match golfer(s)."}`
                  : "Includes ₹9,02,000 rollover from previous 5-Number Jackpot."}
              </p>
            </div>

            <div style={{ textAlign: "center" }}>
              <span
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-muted)",
                  display: "block",
                  marginBottom: "var(--space-1)",
                }}
              >
                Eligible Subscribers
              </span>
              <div
                style={{
                  fontFamily: "var(--font-numeric)",
                  fontSize: "var(--text-4xl)",
                  fontWeight: 700,
                  color: "var(--forest-800)",
                }}
              >
                <AnimatedCounter
                  value={
                    latestDraw ? latestDraw.total_eligible_subscribers : 1498
                  }
                />
              </div>
            </div>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "var(--space-4)",
              marginTop: "var(--space-8)",
              paddingTop: "var(--space-6)",
              borderTop: "1px solid var(--border-subtle)",
              position: "relative",
              zIndex: 1,
            }}
          >
            {[
              {
                label: "5-Number Match",
                badge: "40% + Rollover",
                badgeVariant: "forest" as const,
                amount: tier5,
                color: "var(--forest-800)",
                note: "✓ Rollover enabled if unclaimed",
                noteColor: "var(--color-success)",
              },
              {
                label: "4-Number Match",
                badge: "35% Share",
                badgeVariant: "neutral" as const,
                amount: tier4,
                color: "var(--charcoal-900)",
                note: "Split equally among tier winners",
                noteColor: "var(--text-muted)",
              },
              {
                label: "3-Number Match",
                badge: "25% Share",
                badgeVariant: "neutral" as const,
                amount: tier3,
                color: "var(--charcoal-900)",
                note: "Split equally among tier winners",
                noteColor: "var(--text-muted)",
              },
            ].map((tier) => (
              <motion.div
                key={tier.label}
                variants={fadeUp}
                whileHover={{ y: -4 }}
                style={{
                  padding: "var(--space-4)",
                  backgroundColor: "var(--bg-surface)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid transparent",
                  transition: "border-color 0.25s ease, box-shadow 0.25s ease",
                }}
              >
                <div
                  className="flex justify-between items-center"
                  style={{ marginBottom: "var(--space-1)" }}
                >
                  <span style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>
                    {tier.label}
                  </span>
                  <Badge variant={tier.badgeVariant} size="sm">
                    {tier.badge}
                  </Badge>
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-numeric)",
                    fontSize: "var(--text-2xl)",
                    fontWeight: 700,
                    color: tier.color,
                  }}
                >
                  <AnimatedCounter value={tier.amount} prefix="₹" />
                </div>

                <div
                  style={{
                    width: "100%",
                    height: 5,
                    borderRadius: 999,
                    backgroundColor: "var(--border-subtle)",
                    overflow: "hidden",
                    margin: "var(--space-2) 0",
                  }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${(tier.amount / tierSum) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      height: "100%",
                      borderRadius: 999,
                      background:
                        "linear-gradient(90deg, var(--forest-600), var(--lime-400, var(--lime-500)))",
                    }}
                  />
                </div>

                <span
                  style={{ fontSize: "var(--text-xs)", color: tier.noteColor }}
                >
                  {tier.note}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </Card>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={fadeUp}
        style={{ maxWidth: "960px", margin: "0 auto var(--space-8)" }}
      >
        <h4
          style={{
            marginBottom: "var(--space-4)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
          }}
        >
          <ShieldCheck size={18} color="var(--forest-800)" />
          {latestDraw
            ? latestDraw.draw_title
            : "Draw In Progress: October 2026"}
        </h4>

        <Card>
          <div className="flex flex-col md-flex-row justify-between items-center gap-6">
            <div>
              <span
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                }}
              >
                {latestDraw
                  ? "Official Winning Numbers"
                  : "Anticipated Number Draw (1-45)"}
              </span>
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                style={{
                  display: "flex",
                  gap: "var(--space-3)",
                  marginTop: "var(--space-2)",
                  flexWrap: "wrap",
                }}
              >
                {winningNumbers.map((num) => (
                  <motion.div
                    key={num}
                    variants={ballVariants}
                    whileHover={{ scale: 1.12, rotate: 4 }}
                  >
                    <ScoreBall number={num} status="winning" />
                  </motion.div>
                ))}
              </motion.div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "var(--space-4) var(--space-8)",
                flexWrap: "wrap",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--text-muted)",
                  }}
                >
                  5-Match Winners
                </span>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "var(--text-lg)",
                    color: "var(--color-warning)",
                  }}
                >
                  {latestDraw
                    ? latestDraw.tier_5_winners_count > 0
                      ? `${latestDraw.tier_5_winners_count} Winner(s)`
                      : "0 (Rolled Over)"
                    : "0 (Rolled Over)"}
                </div>
              </div>
              <div>
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--text-muted)",
                  }}
                >
                  4-Match Winners
                </span>
                <div style={{ fontWeight: 700, fontSize: "var(--text-lg)" }}>
                  {latestDraw
                    ? `${latestDraw.tier_4_winners_count} winners`
                    : "3 (₹3,12,400 each)"}
                </div>
              </div>
              <div>
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--text-muted)",
                  }}
                >
                  3-Match Winners
                </span>
                <div style={{ fontWeight: 700, fontSize: "var(--text-lg)" }}>
                  {latestDraw
                    ? `${latestDraw.tier_3_winners_count} winners`
                    : "28 (₹20,900 each)"}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {pastDraws.length > 0 && (
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={fadeUp}
          style={{ maxWidth: "960px", margin: "0 auto" }}
        >
          <h4
            style={{
              marginBottom: "var(--space-4)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
            }}
          >
            <History size={18} color="var(--forest-800)" />
            Previous Verified Draw Cycles
          </h4>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
            }}
          >
            {pastDraws.map((draw) => (
              <motion.div
                key={draw.id}
                variants={fadeUp}
                whileHover={{ y: -3, x: 2 }}
              >
                <Card
                  padding="sm"
                  style={{ transition: "box-shadow 0.25s ease" }}
                >
                  <div className="flex flex-col md-flex-row justify-between items-center gap-4">
                    <div>
                      <div style={{ fontWeight: 600 }}>{draw.draw_title}</div>
                      <span
                        style={{
                          fontSize: "var(--text-xs)",
                          color: "var(--text-muted)",
                        }}
                      >
                        Month: {draw.draw_month} · Pool: ₹
                        {(draw.total_prize_pool_cents / 100).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: "var(--space-2)" }}>
                      {(draw.winning_numbers || []).map((num, i) => (
                        <motion.div
                          key={num}
                          initial={{ opacity: 0, scale: 0.5 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{
                            delay: i * 0.05,
                            type: "spring",
                            stiffness: 300,
                            damping: 18,
                          }}
                        >
                          <ScoreBall number={num} status="winning" size="sm" />
                        </motion.div>
                      ))}
                    </div>

                    <div>
                      <Badge
                        variant={
                          draw.jackpot_rolled_over ? "warning" : "success"
                        }
                        size="sm"
                      >
                        {draw.jackpot_rolled_over
                          ? "Jackpot Rolled Over"
                          : "Jackpot Won"}
                      </Badge>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}

      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              maxWidth: "960px",
              margin: "0 auto",
              marginTop: "var(--space-6)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "var(--space-2)",
                padding: "var(--space-4)",
                color: "var(--text-muted)",
                fontSize: "var(--text-sm)",
              }}
            >
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                style={{ display: "inline-flex" }}
              >
                <Sparkles size={14} />
              </motion.span>
              Loading official draw records...
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "var(--space-4)",
              }}
            >
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
                    height: 100,
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-surface-warm)",
                    border: "1px solid var(--border-subtle)",
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageContainer>
  );
};
