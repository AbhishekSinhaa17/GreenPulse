import React from "react";
import { motion, type Variants } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  Trophy,
  Heart,
  ShieldCheck,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";

interface ObjectiveCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: "forest" | "lime";
  index: string;
}

const objectives: ObjectiveCardProps[] = [
  {
    icon: <DollarSign size={22} />,
    title: "Flexible Membership",
    description:
      "Monthly and discounted yearly memberships via PCI-compliant Stripe billing. Automatic renewal handling, flexible plan management, and seamless platform access.",
    accent: "forest",
    index: "01",
  },
  {
    icon: <TrendingUp size={22} />,
    title: "Stableford Score Management",
    description:
      "Log official rounds between 1–45 points. Maintains your five most recent scores with automatic FIFO rotation and duplicate-date validation.",
    accent: "lime",
    index: "02",
  },
  {
    icon: <Trophy size={22} />,
    title: "Monthly Prize Draw",
    description:
      "Dual-mode draw architecture: Lottery-style Random vs. Score-Frequency Algorithmic. 5, 4, and 3-number match tiers with jackpot rollover for unclaimed top prizes.",
    accent: "forest",
    index: "03",
  },
  {
    icon: <Heart size={22} />,
    title: "Charity Impact Pledge",
    description:
      "Every member pledges at least 10% of their subscription fee to a vetted partner charity. Includes voluntary pledge increases, directory discovery, and direct donations.",
    accent: "lime",
    index: "04",
  },
  {
    icon: <ShieldCheck size={22} />,
    title: "Transparent Administration",
    description:
      "Comprehensive operations console: Member profile management, pre-publish draw simulations, charity partnership curation, and real-time winner verification.",
    accent: "forest",
    index: "05",
  },
  {
    icon: <Layers size={22} />,
    title: "Editorial Design System",
    description:
      "A modern aesthetic crafted for today's golfer. Warm cream canvases, deep forest greens, subtle lime accents, and refined micro-interactions.",
    accent: "lime",
    index: "06",
  },
];

const gridVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 32, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

const ObjectiveCard: React.FC<ObjectiveCardProps> = ({
  icon,
  title,
  description,
  accent,
  index,
}) => {
  const iconBg =
    accent === "forest"
      ? "linear-gradient(135deg, var(--forest-100), var(--forest-200))"
      : "linear-gradient(135deg, var(--lime-100), var(--lime-200))";
  const iconColor =
    accent === "forest"
      ? "var(--forest-800)"
      : "var(--lime-700, var(--lime-600))";
  const glowColor =
    accent === "forest" ? "rgba(34,139,87,0.18)" : "rgba(190,230,110,0.28)";

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      style={{ height: "100%" }}
    >
      <Card
        style={{
          height: "100%",
          position: "relative",
          overflow: "hidden",
          cursor: "default",
          transition: "box-shadow 0.3s ease, border-color 0.3s ease",
        }}
        className="objective-card"
      >

        <div
          aria-hidden
          className="objective-card-glow"
          style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 140,
            height: 140,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
            opacity: 0,
            transition: "opacity 0.4s ease",
            pointerEvents: "none",
          }}
        />

        <span
          aria-hidden
          style={{
            position: "absolute",
            top: "var(--space-3)",
            right: "var(--space-4)",
            fontSize: "2.2rem",
            fontWeight: 700,
            fontFamily: "var(--font-serif, serif)",
            color: "var(--border-subtle)",
            opacity: 0.6,
            lineHeight: 1,
            userSelect: "none",
          }}
        >
          {index}
        </span>

        <motion.div
          whileHover={{ rotate: -6, scale: 1.08 }}
          transition={{ type: "spring", stiffness: 300, damping: 14 }}
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "var(--radius-sm)",
            background: iconBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: iconColor,
            marginBottom: "var(--space-4)",
            position: "relative",
            zIndex: 1,
          }}
        >
          {icon}
        </motion.div>

        <h4
          style={{
            marginBottom: "var(--space-2)",
            position: "relative",
            zIndex: 1,
          }}
        >
          {title}
        </h4>
        <p
          style={{
            fontSize: "var(--text-sm)",
            position: "relative",
            zIndex: 1,
            color: "var(--text-secondary)",
          }}
        >
          {description}
        </p>

        <motion.div
          className="objective-card-arrow"
          initial={{ opacity: 0, x: -6 }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginTop: "var(--space-4)",
            fontSize: "var(--text-xs)",
            fontWeight: 600,
            color:
              accent === "forest"
                ? "var(--forest-700)"
                : "var(--lime-700, var(--lime-600))",
            position: "relative",
            zIndex: 1,
          }}
        >
          Learn more <ArrowUpRight size={14} />
        </motion.div>
      </Card>
    </motion.div>
  );
};

export const CoreObjectivesSection: React.FC = () => {
  return (
    <section
      className="section"
      style={{
        backgroundColor: "var(--bg-surface)",
        position: "relative",
        overflow: "hidden",
      }}
    >

      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle at 10% 10%, rgba(34,139,87,0.05) 0%, transparent 40%), radial-gradient(circle at 90% 90%, rgba(190,230,110,0.08) 0%, transparent 40%)",
          zIndex: 0,
        }}
      />

      <div className="container" style={{ position: "relative", zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{
            textAlign: "center",
            maxWidth: "680px",
            margin: "0 auto var(--space-12)",
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            style={{ display: "inline-block", marginBottom: "var(--space-3)" }}
          >
            <Badge variant="forest">Platform Pillars</Badge>
          </motion.div>
          <h2>
            Six Core Pillars.{" "}
            <span style={{ color: "var(--forest-600)", fontStyle: "italic" }}>
              One Purpose-Driven Platform.
            </span>
          </h2>
          <p>
            Engineered with uncompromising standards for performance, golfer
            data integrity, transparent prize mechanics, and community impact.
          </p>
        </motion.div>

        <motion.div
          variants={gridVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
            gap: "var(--space-6)",
          }}
        >
          {objectives.map((obj) => (
            <ObjectiveCard key={obj.index} {...obj} />
          ))}
        </motion.div>
      </div>

      <style>{`
        .objective-card:hover {
          border-color: var(--forest-300, var(--border-default));
          box-shadow: var(--shadow-lg);
        }
        .objective-card:hover .objective-card-glow {
          opacity: 1;
        }
        .objective-card:hover .objective-card-arrow {
          opacity: 1 !important;
          transform: translateX(0) !important;
        }
        .objective-card .objective-card-arrow {
          opacity: 0;
          transform: translateX(-6px);
          transition: opacity 0.3s ease, transform 0.3s ease;
        }
      `}</style>
    </section>
  );
};
