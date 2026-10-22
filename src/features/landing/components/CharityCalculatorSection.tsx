import React, { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { Heart, Sparkles, TrendingUp } from "lucide-react";
import { Badge } from "../../../components/ui/Badge";

/* -------------------------------------------------------------------------- */
/*  Animated Number                                                           */
/* -------------------------------------------------------------------------- */

const AnimatedNumber: React.FC<{
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}> = ({ value, decimals = 0, prefix = "", suffix = "" }) => {
  const motionVal = useMotionValue(value);
  const spring = useSpring(motionVal, {
    stiffness: 140,
    damping: 20,
    mass: 0.6,
  });
  const [display, setDisplay] = useState(value.toFixed(decimals));

  useEffect(() => {
    motionVal.set(value);
  }, [value, motionVal]);

  useEffect(() => {
    const unsub = spring.on("change", (v) => setDisplay(v.toFixed(decimals)));
    return () => unsub();
  }, [spring, decimals]);

  return (
    <span>
      {prefix}
      {display}
      {suffix}
    </span>
  );
};

/* -------------------------------------------------------------------------- */
/*  Milestones                                                                */
/* -------------------------------------------------------------------------- */

const MILESTONES = [
  { value: 10, label: "10% Min" },
  { value: 25, label: "25%" },
  { value: 50, label: "50%" },
  { value: 100, label: "100%" },
];

/* -------------------------------------------------------------------------- */
/*  Section                                                                   */
/* -------------------------------------------------------------------------- */

export const CharityCalculatorSection: React.FC = () => {
  const [charityPercent, setCharityPercent] = useState(15);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLInputElement>(null);

  const monthlyFee = 2090;
  const charityAmount = (monthlyFee * charityPercent) / 100;
  const prizePoolAmount = monthlyFee * 0.4;
  const trackFillPercent = ((charityPercent - 10) / (100 - 10)) * 100;

  return (
    <section
      className="section"
      style={{
        backgroundColor: "var(--bg-primary)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient background */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 20% 20%, rgba(34,139,87,0.06) 0%, transparent 45%), radial-gradient(circle at 80% 80%, rgba(190,230,110,0.10) 0%, transparent 45%)",
          zIndex: 0,
        }}
      />

      <div className="container" style={{ position: "relative", zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{
            maxWidth: "840px",
            margin: "0 auto",
            backgroundColor: "var(--bg-surface)",
            borderRadius: "var(--radius-xl)",
            padding: "var(--space-8)",
            border: "1px solid var(--border-default)",
            boxShadow: "var(--shadow-md)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Floating decorative heart */}
          <motion.div
            aria-hidden
            animate={{ y: [0, -10, 0], opacity: [0.5, 0.9, 0.5] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute",
              top: "var(--space-6)",
              right: "var(--space-6)",
              color: "var(--lime-300, var(--lime-200))",
              zIndex: 0,
            }}
          >
            <Heart size={54} fill="currentColor" strokeWidth={0} />
          </motion.div>

          <div
            style={{
              textAlign: "center",
              marginBottom: "var(--space-8)",
              position: "relative",
              zIndex: 1,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              style={{
                display: "inline-block",
                marginBottom: "var(--space-2)",
              }}
            >
              <Badge variant="lime">
                <Sparkles size={12} style={{ marginRight: 6 }} />
                Interactive Contribution Calculator
              </Badge>
            </motion.div>
            <h3>Give back with every round.</h3>
            <p style={{ maxWidth: "580px", margin: "0 auto" }}>
              GreenPulse guarantees a minimum 10% charity contribution on all
              memberships. Golfer subscribers can voluntarily direct an even
              greater share of their membership to their selected cause.
            </p>
          </div>

          <div
            style={{
              padding: "0 var(--space-4)",
              position: "relative",
              zIndex: 1,
            }}
          >
            <div
              className="flex justify-between items-center"
              style={{ marginBottom: "var(--space-4)" }}
            >
              <span
                style={{
                  fontWeight: 600,
                  fontSize: "var(--text-sm)",
                  color: "var(--charcoal-800)",
                }}
              >
                Your Charity Contribution Pledge:
              </span>
              <motion.span
                key={charityPercent}
                initial={{ scale: 1.15, color: "var(--lime-600)" }}
                animate={{ scale: 1, color: "var(--forest-800)" }}
                transition={{ duration: 0.35 }}
                style={{
                  fontFamily: "var(--font-numeric)",
                  fontWeight: 700,
                  fontSize: "var(--text-2xl)",
                  display: "inline-block",
                }}
              >
                <AnimatedNumber value={charityPercent} suffix="%" />
              </motion.span>
            </div>

            {/* Custom slider track */}
            <div style={{ position: "relative", padding: "14px 0" }}>
              {/* Base track */}
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  top: "50%",
                  left: 0,
                  right: 0,
                  height: "8px",
                  borderRadius: "999px",
                  backgroundColor: "var(--border-subtle)",
                  transform: "translateY(-50%)",
                }}
              />
              {/* Filled track */}
              <motion.div
                aria-hidden
                animate={{ width: `${trackFillPercent}%` }}
                transition={{ type: "spring", stiffness: 200, damping: 26 }}
                style={{
                  position: "absolute",
                  top: "50%",
                  left: 0,
                  height: "8px",
                  borderRadius: "999px",
                  background:
                    "linear-gradient(90deg, var(--forest-500, var(--forest-600)), var(--lime-400, var(--lime-500)))",
                  transform: "translateY(-50%)",
                  boxShadow: isDragging
                    ? "0 0 12px rgba(34,139,87,0.45)"
                    : "none",
                }}
              />

              {/* Milestone dots */}
              {MILESTONES.map((m) => {
                const pos = ((m.value - 10) / (100 - 10)) * 100;
                const reached = charityPercent >= m.value;
                return (
                  <div
                    key={m.value}
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: `${pos}%`,
                      transform: "translate(-50%, -50%)",
                      pointerEvents: "none",
                    }}
                  >
                    <motion.div
                      animate={{
                        scale: reached ? 1.1 : 1,
                        backgroundColor: reached
                          ? "var(--forest-600)"
                          : "var(--bg-surface)",
                        borderColor: reached
                          ? "var(--forest-600)"
                          : "var(--border-default)",
                      }}
                      transition={{ duration: 0.3 }}
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        border: "2px solid",
                      }}
                    />
                  </div>
                );
              })}

              <input
                ref={sliderRef}
                type="range"
                min="10"
                max="100"
                step="5"
                value={charityPercent}
                onChange={(e) => setCharityPercent(Number(e.target.value))}
                onMouseDown={() => setIsDragging(true)}
                onMouseUp={() => setIsDragging(false)}
                onTouchStart={() => setIsDragging(true)}
                onTouchEnd={() => setIsDragging(false)}
                style={{
                  position: "relative",
                  width: "100%",
                  height: "8px",
                  background: "transparent",
                  accentColor: "var(--forest-800)",
                  cursor: "pointer",
                  zIndex: 2,
                }}
                className="charity-range"
              />
            </div>

            <div
              className="flex justify-between text-muted"
              style={{
                fontSize: "var(--text-xs)",
                marginTop: "var(--space-1)",
              }}
            >
              {MILESTONES.map((m) => (
                <span
                  key={m.value}
                  style={{
                    color:
                      charityPercent >= m.value
                        ? "var(--forest-700)"
                        : "var(--text-muted)",
                    fontWeight: charityPercent >= m.value ? 600 : 400,
                    transition: "color 0.3s ease, font-weight 0.3s ease",
                  }}
                >
                  {m.value === 10
                    ? "10% (Platform Standard)"
                    : m.value === 100
                      ? "100% (Direct Impact)"
                      : `${m.value}%`}
                </span>
              ))}
            </div>

            {/* Impact bar visualization */}
            <div style={{ marginTop: "var(--space-8)" }}>
              <div
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-muted)",
                  marginBottom: "var(--space-2)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <TrendingUp size={13} />
                Fee Allocation Breakdown
              </div>
              <div
                style={{
                  display: "flex",
                  width: "100%",
                  height: "14px",
                  borderRadius: "999px",
                  overflow: "hidden",
                  backgroundColor: "var(--border-subtle)",
                }}
              >
                <motion.div
                  animate={{ width: `${100 - charityPercent}%` }}
                  transition={{ type: "spring", stiffness: 180, damping: 24 }}
                  style={{
                    backgroundColor:
                      "var(--charcoal-300, var(--border-default))",
                    height: "100%",
                  }}
                />
                <motion.div
                  animate={{ width: `${charityPercent}%` }}
                  transition={{ type: "spring", stiffness: 180, damping: 24 }}
                  style={{
                    background:
                      "linear-gradient(90deg, var(--forest-500, var(--forest-600)), var(--lime-400, var(--lime-500)))",
                    height: "100%",
                  }}
                />
              </div>
              <div
                className="flex justify-between"
                style={{
                  fontSize: "var(--text-xs)",
                  marginTop: "var(--space-1)",
                  color: "var(--text-muted)",
                }}
              >
                <span>Platform & Operations</span>
                <span style={{ color: "var(--forest-700)", fontWeight: 600 }}>
                  Charity Pledge
                </span>
              </div>
            </div>

            {/* Stat cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "var(--space-4)",
                marginTop: "var(--space-8)",
                paddingTop: "var(--space-6)",
                borderTop: "1px solid var(--border-subtle)",
              }}
            >
              <motion.div
                whileHover={{ y: -3 }}
                style={{
                  textAlign: "center",
                  padding: "var(--space-3)",
                  borderRadius: "var(--radius-md)",
                  transition: "background-color 0.3s ease",
                }}
              >
                <div
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--text-muted)",
                  }}
                >
                  Monthly Membership
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-numeric)",
                    fontWeight: 700,
                    fontSize: "var(--text-xl)",
                  }}
                >
                  ₹{monthlyFee.toLocaleString('en-IN')}.00
                </div>
              </motion.div>

              <motion.div
                whileHover={{ y: -3 }}
                style={{
                  textAlign: "center",
                  padding: "var(--space-3)",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--forest-50, rgba(34,139,87,0.06))",
                }}
              >
                <div
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--color-success)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                  }}
                >
                  <Heart size={11} fill="currentColor" strokeWidth={0} />
                  Charity Pledged
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-numeric)",
                    fontWeight: 700,
                    fontSize: "var(--text-xl)",
                    color: "var(--forest-800)",
                  }}
                >
                  ₹<AnimatedNumber value={charityAmount} decimals={2} />
                </div>
              </motion.div>

              <motion.div
                whileHover={{ y: -3 }}
                style={{
                  textAlign: "center",
                  padding: "var(--space-3)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <div
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--text-muted)",
                  }}
                >
                  Prize Pool Contribution
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-numeric)",
                    fontWeight: 700,
                    fontSize: "var(--text-xl)",
                  }}
                >
                  ₹{prizePoolAmount.toFixed(2)}{" "}
                  <span
                    style={{
                      fontSize: "var(--text-xs)",
                      fontWeight: 500,
                      color: "var(--text-muted)",
                    }}
                  >
                    (40%)
                  </span>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>

      <style>{`
        .charity-range {
          -webkit-appearance: none;
          appearance: none;
        }
        .charity-range::-webkit-slider-runnable-track {
          background: transparent;
          height: 8px;
        }
        .charity-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--bg-surface);
          border: 3px solid var(--forest-700);
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
          cursor: pointer;
          margin-top: 0;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .charity-range::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }
        .charity-range:active::-webkit-slider-thumb {
          transform: scale(1.25);
          box-shadow: 0 0 0 8px rgba(34,139,87,0.15);
        }
        .charity-range::-moz-range-track {
          background: transparent;
          height: 8px;
        }
        .charity-range::-moz-range-thumb {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--bg-surface);
          border: 3px solid var(--forest-700);
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .charity-range:active::-moz-range-thumb {
          transform: scale(1.25);
          box-shadow: 0 0 0 8px rgba(34,139,87,0.15);
        }
      `}</style>
    </section>
  );
};
