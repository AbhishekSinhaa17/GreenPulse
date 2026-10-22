import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Heart,
  CreditCard,
  X,
  ShieldCheck,
  Search,
  Leaf,
  Users,
  HeartPulse,
  Building2,
  Sparkles,
} from "lucide-react";
import { PageContainer } from "../../components/layout/PageContainer";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { charityService } from "../../services/charityService";
import { stripeService } from "../../services/stripeService";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../context/ToastContext";
import { env } from "../../lib/supabase";
import confetti from "canvas-confetti";
import type { Charity } from "../../types";

const defaultCharities: Charity[] = [
  {
    id: "1",
    name: "Fairway Green Youth Foundation",
    slug: "fairway-green-youth",
    tagline: "Opening golf and mentorship to underprivileged young athletes.",
    description:
      "Provides equipment, PGA junior coaching, and character-building mentorship programs to young golfers from disadvantaged communities across Scotland and northern England.",
    category: "youth_sports",
    is_featured: true,
    total_raised_cents: 1420000,
    created_at: "2026-10-01T00:00:00Z",
  },
  {
    id: "2",
    name: "Open Course Conservation Trust",
    slug: "open-course-conservation",
    tagline: "Rewilding coastal links and protecting native pollinators.",
    description:
      "Collaborates with coastal and parkland golf courses to restore natural habitats, seed wild pollinator corridors, and manage wetland reserves along coastal roughs.",
    category: "environment",
    is_featured: true,
    total_raised_cents: 2850000,
    created_at: "2026-10-01T00:00:00Z",
  },
  {
    id: "3",
    name: "Veterans on the Green",
    slug: "veterans-on-the-green",
    tagline:
      "Rehabilitation, community, and mental health through adaptive golf.",
    description:
      "Supports wounded and transitioning military veterans through adaptive swing equipment, PTSD peer counseling, and regional inclusive golf tournaments.",
    category: "health",
    is_featured: false,
    total_raised_cents: 980000,
    created_at: "2026-10-01T00:00:00Z",
  },
  {
    id: "4",
    name: "Local Parkland Initiative",
    slug: "local-parkland-initiative",
    tagline: "Preserving municipal green spaces and public recreation courses.",
    description:
      "Safeguards municipal golf courses from urban commercial redevelopment, preserving accessible public fairways and community recreation grounds.",
    category: "community",
    is_featured: false,
    total_raised_cents: 640000,
    created_at: "2026-10-01T00:00:00Z",
  },
];

const CATEGORY_META: Record<string, { icon: React.ReactNode; color: string }> =
  {
    environment: { icon: <Leaf size={13} />, color: "var(--forest-700)" },
    youth_sports: {
      icon: <Users size={13} />,
      color: "var(--lime-600, var(--lime-500))",
    },
    health: { icon: <HeartPulse size={13} />, color: "#E0776D" },
    community: { icon: <Building2 size={13} />, color: "#60A5FA" },
  };

const gridVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const modalVariants: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
  exit: { opacity: 0, y: 16, scale: 0.97, transition: { duration: 0.2 } },
};

export const CharitiesPage: React.FC = () => {
  const { isConfigured } = useAuth();
  const toast = useToast();
  const [charities, setCharities] = useState<Charity[]>(defaultCharities);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [isFromDatabase, setIsFromDatabase] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [donatingCharity, setDonatingCharity] = useState<Charity | null>(null);
  const [selectedDonationAmount, setSelectedDonationAmount] =
    useState<number>(2750);
  const [customAmountStr, setCustomAmountStr] = useState<string>("");
  const [isDonating, setIsDonating] = useState<boolean>(false);
  const [donationError, setDonationError] = useState<string | null>(null);

  const handleOpenDonateModal = (charity: Charity) => {
    setDonatingCharity(charity);
    setSelectedDonationAmount(2750);
    setCustomAmountStr("");
    setDonationError(null);
  };

  const handleProceedDonation = async () => {
    if (!donatingCharity) return;
    setDonationError(null);

    const amountInRupees = customAmountStr
      ? parseFloat(customAmountStr)
      : selectedDonationAmount;
    if (isNaN(amountInRupees) || amountInRupees < 110) {
      setDonationError("Minimum donation amount is ₹110.00.");
      return;
    }

    const amountCents = Math.round(amountInRupees * 100);

    setIsDonating(true);
    try {
      const result = await stripeService.createDonationCheckout(
        donatingCharity.id,
        amountCents,
      );

      if (env.demoPayments) {
        setCharities((prev) =>
          prev.map((c) =>
            c.id === donatingCharity.id
              ? { ...c, total_raised_cents: (c.total_raised_cents || 0) + amountCents }
              : c
          )
        );
        try {
          confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
        } catch {

        }
        toast.success(
          "Demo Donation Successful!",
          `Simulated gift of ₹${amountInRupees.toLocaleString('en-IN')} to ${donatingCharity.name} processed.`
        );
        setDonatingCharity(null);
        return;
      }

      if (result.url) {
        window.location.assign(result.url);
      } else {
        throw new Error("Failed to obtain donation checkout URL from server.");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Could not initialize donation checkout.";
      setDonationError(msg);
      setIsDonating(false);
    }
  };

  const fetchCharities = useCallback(() => {
    if (!isConfigured) return;

    queueMicrotask(() => setIsLoading(true));
    charityService
      .getCharities()
      .then((data) => {
        if (data && data.length > 0) {
          setCharities(data);
          setIsFromDatabase(true);
        } else {
          setCharities(defaultCharities);
          setIsFromDatabase(false);
        }
      })
      .catch((err: unknown) => {
        const msg =
          err instanceof Error ? err.message : "Failed to load charities.";
        setLoadError(msg);
        setCharities(defaultCharities);
        setIsFromDatabase(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isConfigured]);

  useEffect(() => {
    fetchCharities();
  }, [fetchCharities]);

  const filtered = charities.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat =
      selectedCategory === "all" || c.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const maxRaised = Math.max(...charities.map((c) => c.total_raised_cents), 1);

  return (
    <PageContainer>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
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
            top: -40,
            left: "50%",
            transform: "translateX(-50%)",
            width: 320,
            height: 160,
            background:
              "radial-gradient(ellipse, rgba(190,230,110,0.18) 0%, transparent 70%)",
            zIndex: -1,
          }}
        />

        <div
          className="flex justify-center items-center gap-2"
          style={{ marginBottom: "var(--space-2)" }}
        >
          <Badge variant="lime">
            <Sparkles size={11} style={{ marginRight: 5 }} />
            Verified Causes Directory
          </Badge>
          <motion.div
            animate={isFromDatabase ? { opacity: [1, 0.5, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Badge variant={isFromDatabase ? "success" : "neutral"}>
              {isFromDatabase
                ? "● Verified Nonprofits"
                : "Partner Network"}
            </Badge>
          </motion.div>
        </div>
        <h2>Causes That Reshape Communities</h2>
        <p>
          Every GreenPulse subscriber directs at least 10% of their subscription
          to their chosen cause. Explore our vetted partners or make an
          independent donation.
        </p>
      </motion.div>

      <AnimatePresence>
        {loadError && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{
              opacity: 1,
              height: "auto",
              marginBottom: "var(--space-6)",
            }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            role="alert"
            style={{
              padding: "var(--space-3) var(--space-4)",
              backgroundColor: "var(--color-warning-bg)",
              border: "1px solid var(--color-warning-border)",
              borderRadius: "var(--radius-md)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              fontSize: "var(--text-sm)",
              overflow: "hidden",
            }}
          >
            <AlertCircle size={16} color="var(--color-warning)" />
            <span>Note: {loadError}. Displaying default directory.</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="flex flex-col md-flex-row gap-4 items-stretch md-items-center justify-between"
        style={{
          marginBottom: "var(--space-8)",
          backgroundColor: "var(--bg-surface)",
          padding: "var(--space-4)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-default)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div style={{ flex: 1, width: "100%", position: "relative" }}>
          <Search
            size={15}
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
              pointerEvents: "none",
            }}
          />
          <Input
            placeholder="Search charities by mission, title, or keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ marginBottom: 0, paddingLeft: 36 }}
          />
        </div>
        <div
          style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}
        >
          {["all", "environment", "youth_sports", "health", "community"].map(
            (cat) => (
              <motion.div
                key={cat}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                style={{ position: "relative" }}
              >
                <Button
                  variant={selectedCategory === cat ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  leftIcon={
                    cat !== "all" ? CATEGORY_META[cat]?.icon : undefined
                  }
                >
                  {cat === "all" ? "All Causes" : cat.replace("_", " ")}
                </Button>
              </motion.div>
            ),
          )}
          <motion.div
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.4 }}
            style={{ display: "inline-block" }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchCharities}
              leftIcon={<RefreshCw size={14} />}
              title="Refresh from Supabase"
            >
              Refresh
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {isLoading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
            gap: "var(--space-6)",
          }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.15 }}
              style={{
                height: 260,
                borderRadius: "var(--radius-lg)",
                backgroundColor: "var(--bg-surface-warm)",
                border: "1px solid var(--border-subtle)",
              }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ textAlign: "center", padding: "var(--space-12)" }}
        >
          <p style={{ color: "var(--text-muted)" }}>
            No charities match your search query.
          </p>
        </motion.div>
      ) : (
        <motion.div
          variants={gridVariants}
          initial="hidden"
          animate="visible"
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
            gap: "var(--space-6)",
          }}
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((charity) => {
              const meta = CATEGORY_META[charity.category];
              const raisedPercent = Math.min(
                (charity.total_raised_cents / maxRaised) * 100,
                100,
              );

              return (
                <motion.div
                  key={charity.id}
                  layout
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  whileHover={{ y: -6 }}
                  transition={{ type: "spring", stiffness: 260, damping: 22 }}
                  style={{ height: "100%" }}
                >
                  <Card
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      height: "100%",
                      position: "relative",
                      overflow: "hidden",
                      border: charity.is_featured
                        ? "1px solid var(--lime-300, rgba(190,230,110,0.6))"
                        : undefined,
                    }}
                  >
                    {charity.is_featured && (
                      <div
                        aria-hidden
                        style={{
                          position: "absolute",
                          top: -30,
                          right: -30,
                          width: 100,
                          height: 100,
                          borderRadius: "50%",
                          background:
                            "radial-gradient(circle, rgba(190,230,110,0.25) 0%, transparent 70%)",
                        }}
                      />
                    )}

                    <div
                      className="flex justify-between items-start"
                      style={{ marginBottom: "var(--space-3)" }}
                    >
                      <Badge variant={charity.is_featured ? "lime" : "neutral"}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          {meta?.icon}
                          {charity.category.replace("_", " ")}
                        </span>
                      </Badge>
                      {charity.is_featured && (
                        <motion.span
                          animate={{ opacity: [1, 0.5, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          style={{
                            fontSize: "var(--text-xs)",
                            fontWeight: 600,
                            color: "var(--forest-700)",
                          }}
                        >
                          ★ Featured Partner
                        </motion.span>
                      )}
                    </div>

                    <h4
                      style={{
                        color: "var(--forest-950)",
                        marginBottom: "var(--space-2)",
                      }}
                    >
                      {charity.name}
                    </h4>
                    <p
                      style={{
                        fontSize: "var(--text-sm)",
                        color: "var(--charcoal-600)",
                        marginBottom: "var(--space-4)",
                        flex: 1,
                      }}
                    >
                      {charity.description}
                    </p>

                    <div style={{ marginBottom: "var(--space-3)" }}>
                      <div
                        style={{
                          width: "100%",
                          height: 6,
                          borderRadius: 999,
                          backgroundColor: "var(--border-subtle)",
                          overflow: "hidden",
                        }}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${raisedPercent}%` }}
                          viewport={{ once: true }}
                          transition={{
                            duration: 0.9,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          style={{
                            height: "100%",
                            borderRadius: 999,
                            background: `linear-gradient(90deg, var(--forest-600), ${meta?.color ?? "var(--lime-500)"})`,
                          }}
                        />
                      </div>
                    </div>

                    <div
                      style={{
                        paddingTop: "var(--space-4)",
                        borderTop: "1px solid var(--border-subtle)",
                        marginTop: "auto",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <span
                          style={{
                            fontSize: "var(--text-xs)",
                            color: "var(--text-muted)",
                            display: "block",
                          }}
                        >
                          Total Raised
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-numeric)",
                            fontWeight: 700,
                            color: "var(--forest-800)",
                          }}
                        >
                          ₹{(charity.total_raised_cents / 100).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "var(--space-2)" }}>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleOpenDonateModal(charity)}
                            leftIcon={<Heart size={14} />}
                          >
                            Donate
                          </Button>
                        </motion.div>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            rightIcon={<ExternalLink size={14} />}
                          >
                            Profile
                          </Button>
                        </motion.div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      <AnimatePresence>
        {donatingCharity && (
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-labelledby="donate-modal-title"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(18, 53, 36, 0.6)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: "var(--space-4)",
            }}
            onClick={() => setDonatingCharity(null)}
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: "var(--bg-surface)",
                borderRadius: "var(--radius-xl)",
                maxWidth: "480px",
                width: "100%",
                padding: "var(--space-6)",
                boxShadow: "var(--shadow-xl)",
                position: "relative",
                border: "1px solid var(--border-default)",
              }}
            >
              <motion.button
                whileHover={{ rotate: 90 }}
                transition={{ duration: 0.2 }}
                onClick={() => setDonatingCharity(null)}
                aria-label="Close donation modal"
                style={{
                  position: "absolute",
                  top: "var(--space-4)",
                  right: "var(--space-4)",
                  background: "none",
                  border: "none",
                  color: "var(--charcoal-500)",
                  cursor: "pointer",
                  padding: "var(--space-1)",
                }}
              >
                <X size={20} />
              </motion.button>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  marginBottom: "var(--space-2)",
                }}
              >
                <Badge variant="lime">Direct Impact Donation</Badge>
              </div>

              <h3
                id="donate-modal-title"
                style={{
                  color: "var(--forest-950)",
                  marginBottom: "var(--space-1)",
                }}
              >
                Donate to {donatingCharity.name}
              </h3>
              <p
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--charcoal-600)",
                  marginBottom: "var(--space-5)",
                }}
              >
                100% of your standalone gift is routed to this cause. Bypasses
                membership and monthly draw pools.
              </p>

              <AnimatePresence>
                {donationError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    role="alert"
                    style={{
                      padding: "var(--space-3)",
                      backgroundColor: "var(--color-error-bg)",
                      border: "1px solid var(--color-error-border)",
                      borderRadius: "var(--radius-md)",
                      marginBottom: "var(--space-4)",
                      fontSize: "var(--text-xs)",
                      color: "var(--color-error)",
                      overflow: "hidden",
                    }}
                  >
                    {donationError}
                  </motion.div>
                )}
              </AnimatePresence>

              <div style={{ marginBottom: "var(--space-4)" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "var(--text-xs)",
                    fontWeight: 600,
                    color: "var(--charcoal-700)",
                    marginBottom: "var(--space-2)",
                  }}
                >
                  Select Amount
                </label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "var(--space-2)",
                  }}
                >
                  {[1100, 2750, 5500, 11000].map((amt) => {
                    const active =
                      selectedDonationAmount === amt && !customAmountStr;
                    return (
                      <motion.button
                        key={amt}
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => {
                          setSelectedDonationAmount(amt);
                          setCustomAmountStr("");
                        }}
                        animate={{
                          borderColor: active
                            ? "var(--forest-800)"
                            : "var(--border-default)",
                          backgroundColor: active
                            ? "var(--forest-50, rgba(34,139,87,0.08))"
                            : "var(--bg-surface)",
                        }}
                        style={{
                          padding: "var(--space-3)",
                          borderRadius: "var(--radius-md)",
                          borderWidth: active ? 2 : 1,
                          borderStyle: "solid",
                          fontWeight: 700,
                          color: active
                            ? "var(--forest-900)"
                            : "var(--charcoal-800)",
                          cursor: "pointer",
                        }}
                      >
                        ₹{amt.toLocaleString('en-IN')}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginBottom: "var(--space-5)" }}>
                <Input
                  label="Or Enter Custom Amount (₹)"
                  type="number"
                  min="110"
                  step="10"
                  placeholder="e.g. 5000"
                  value={customAmountStr}
                  onChange={(e) => {
                    setCustomAmountStr(e.target.value);
                  }}
                  style={{ marginBottom: 0 }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  fontSize: "var(--text-xs)",
                  color: env.demoPayments ? "var(--forest-700)" : "var(--charcoal-600)",
                  marginBottom: "var(--space-5)",
                  backgroundColor: env.demoPayments ? "var(--forest-50)" : "transparent",
                  padding: env.demoPayments ? "var(--space-2) var(--space-3)" : 0,
                  borderRadius: "var(--radius-md)",
                }}
              >
                {env.demoPayments ? (
                  <Sparkles size={16} color="var(--forest-700)" />
                ) : (
                  <ShieldCheck size={16} color="var(--forest-700)" />
                )}
                <span>
                  {env.demoPayments
                    ? "Evaluation Demo Mode: Instant simulated donation without charging a card."
                    : "Processed securely via Stripe Checkout. Receipt emailed directly."}
                </span>
              </div>

              <div style={{ display: "flex", gap: "var(--space-3)" }}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{ width: "100%" }}
                >
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleProceedDonation}
                    isLoading={isDonating}
                    className="w-full"
                    leftIcon={env.demoPayments ? <Sparkles size={16} /> : <CreditCard size={16} />}
                  >
                    {env.demoPayments ? "Complete Demo Donation (₹" : "Proceed to Stripe Checkout (₹"}
                    {customAmountStr
                      ? Number(customAmountStr).toLocaleString('en-IN')
                      : selectedDonationAmount.toLocaleString('en-IN')})
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageContainer>
  );
};
