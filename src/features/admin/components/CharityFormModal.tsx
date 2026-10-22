import React, { useState } from "react";
import { Dialog } from "../../../components/ui/Dialog";
import { Button } from "../../../components/ui/Button";
import { useToast } from "../../../context/ToastContext";
import { adminService } from "../../../services/adminService";
import type { Charity, CharityCategory } from "../../../types";
import {
  Leaf,
  Trophy,
  HeartPulse,
  Users2,
  Link2,
  ImageIcon,
  Globe,
  Star,
  FileText,
} from "lucide-react";

interface CharityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  charity: Charity | null;
  onSaveSuccess: () => Promise<void>;
  isConfigured: boolean;
}

const CATEGORY_OPTIONS: {
  value: CharityCategory;
  label: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    value: "environment",
    label: "Environment",
    icon: <Leaf size={15} />,
    color: "#2e7d32",
  },
  {
    value: "youth_sports",
    label: "Youth Sports",
    icon: <Trophy size={15} />,
    color: "#fb8c00",
  },
  {
    value: "health",
    label: "Health",
    icon: <HeartPulse size={15} />,
    color: "#e53935",
  },
  {
    value: "community",
    label: "Community",
    icon: <Users2 size={15} />,
    color: "#5e35b1",
  },
];

const isValidUrl = (value: string) => {
  if (!value) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

export const CharityFormModal: React.FC<CharityFormModalProps> = ({
  isOpen,
  onClose,
  mode,
  charity,
  onSaveSuccess,
  isConfigured,
}) => {
  const { success, warning, error } = useToast();
  const [charityFormName, setCharityFormName] = useState(
    mode === "edit" && charity ? charity.name : "",
  );
  const [charityFormSlug, setCharityFormSlug] = useState(
    mode === "edit" && charity ? charity.slug : "",
  );
  const [charityFormTagline, setCharityFormTagline] = useState(
    mode === "edit" && charity ? charity.tagline || "" : "",
  );
  const [charityFormDescription, setCharityFormDescription] = useState(
    mode === "edit" && charity ? charity.description : "",
  );
  const [charityFormCategory, setCharityFormCategory] =
    useState<CharityCategory>(
      mode === "edit" && charity ? charity.category : "environment",
    );
  const [charityFormLogoUrl, setCharityFormLogoUrl] = useState(
    mode === "edit" && charity ? charity.logo_url || "" : "",
  );
  const [charityFormCoverUrl, setCharityFormCoverUrl] = useState(
    mode === "edit" && charity ? charity.cover_image_url || "" : "",
  );
  const [charityFormWebsiteUrl, setCharityFormWebsiteUrl] = useState(
    mode === "edit" && charity ? charity.website_url || "" : "",
  );
  const [charityFormFeatured, setCharityFormFeatured] = useState(
    mode === "edit" && charity ? !!charity.is_featured : false,
  );
  const [isSavingCharity, setIsSavingCharity] = useState(false);

  const handleAutoSlug = (nameValue: string) => {
    setCharityFormName(nameValue);
    if (mode === "add") {
      const generated = nameValue
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
      setCharityFormSlug(generated);
    }
  };

  const handleSaveCharity = async () => {
    if (
      !charityFormName.trim() ||
      !charityFormSlug.trim() ||
      !charityFormDescription.trim()
    ) {
      warning(
        "Validation Error",
        "Charity name, URL slug, and description are required.",
      );
      return;
    }

    if (!isConfigured) {
      error(
        "Configuration Required",
        "Database connection required to save charities.",
      );
      return;
    }

    setIsSavingCharity(true);
    try {
      if (mode === "add") {
        await adminService.createCharity({
          name: charityFormName.trim(),
          slug: charityFormSlug.trim().toLowerCase(),
          tagline: charityFormTagline.trim() || undefined,
          description: charityFormDescription.trim(),
          category: charityFormCategory,
          logo_url: charityFormLogoUrl.trim() || undefined,
          cover_image_url: charityFormCoverUrl.trim() || undefined,
          website_url: charityFormWebsiteUrl.trim() || undefined,
          is_featured: charityFormFeatured,
        });
        success("Charity Added", `"${charityFormName}" created successfully.`);
      } else if (charity) {
        await adminService.updateCharity(charity.id, {
          name: charityFormName.trim(),
          slug: charityFormSlug.trim().toLowerCase(),
          tagline: charityFormTagline.trim() || undefined,
          description: charityFormDescription.trim(),
          category: charityFormCategory,
          logo_url: charityFormLogoUrl.trim() || undefined,
          cover_image_url: charityFormCoverUrl.trim() || undefined,
          website_url: charityFormWebsiteUrl.trim() || undefined,
          is_featured: charityFormFeatured,
        });
        success(
          "Charity Updated",
          `"${charityFormName}" updated successfully.`,
        );
      }

      onClose();
      await onSaveSuccess();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to save charity partner.";
      error("Save Failed", msg);
    } finally {
      setIsSavingCharity(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={
        mode === "add"
          ? "Add Charity Partner"
          : `Edit Charity: ${charityFormName}`
      }
      description="Charity partners receive 20% of monthly draw subscriber revenue."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            isLoading={isSavingCharity}
            onClick={handleSaveCharity}
          >
            {mode === "add" ? "Create Charity" : "Save Changes"}
          </Button>
        </>
      }
    >
      <div className="cf-wrap">
        <style>{`
          @keyframes cfFadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .cf-wrap {
            display: flex;
            flex-direction: column;
            gap: var(--space-5);
            animation: cfFadeIn 0.3s ease;
          }

          .cf-section {
            display: flex;
            flex-direction: column;
            gap: var(--space-3);
          }

          .cf-section-head {
            display: flex;
            align-items: center;
            gap: 7px;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: var(--forest-700, #2e7d32);
            padding-bottom: 6px;
            border-bottom: 1px dashed var(--border-default);
          }

          .cf-group {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .cf-label {
            font-size: var(--text-xs);
            font-weight: 600;
            color: var(--charcoal-800, #333);
            display: flex;
            justify-content: space-between;
          }

          .cf-required {
            color: #e53935;
          }

          .cf-input {
            width: 100%;
            padding: 9px 12px;
            border-radius: 10px;
            border: 1px solid var(--border-default);
            font-size: var(--text-sm);
            background: #fff;
            transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;
          }

          .cf-input:focus {
            outline: none;
            border-color: #2e7d32;
            box-shadow: 0 0 0 3px rgba(46,125,50,0.14);
          }

          textarea.cf-input {
            resize: vertical;
            min-height: 72px;
            line-height: 1.5;
          }

          .cf-hint {
            font-size: 11px;
            color: var(--text-muted);
            display: flex;
            align-items: center;
            gap: 4px;
          }

          .cf-hint code {
            background: rgba(0,0,0,0.06);
            padding: 1px 5px;
            border-radius: 4px;
            font-size: 10px;
          }

          .cf-char-count {
            font-size: 10px;
            color: var(--text-muted);
            font-variant-numeric: tabular-nums;
          }

          .cf-category-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 8px;
          }

          .cf-category-chip {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 9px 10px;
            border-radius: 10px;
            border: 1.5px solid var(--border-default);
            background: #fff;
            cursor: pointer;
            font-size: var(--text-xs);
            font-weight: 600;
            color: var(--charcoal-700);
            transition: all 0.2s ease;
          }

          .cf-category-chip:hover {
            transform: translateY(-1px);
            border-color: var(--cat-color, #2e7d32);
          }

          .cf-category-chip.active {
            border-color: var(--cat-color, #2e7d32);
            background: color-mix(in srgb, var(--cat-color, #2e7d32) 10%, white);
            color: var(--cat-color, #2e7d32);
            box-shadow: 0 2px 10px -4px var(--cat-color, #2e7d32);
          }

          .cf-category-icon {
            width: 24px;
            height: 24px;
            border-radius: 7px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: var(--cat-color, #2e7d32);
            color: #fff;
            flex-shrink: 0;
            transition: transform 0.2s ease;
          }

          .cf-category-chip:hover .cf-category-icon {
            transform: scale(1.1) rotate(-6deg);
          }

          .cf-media-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: var(--space-3);
          }

          @media (max-width: 520px) {
            .cf-media-grid { grid-template-columns: 1fr; }
          }

          .cf-media-field {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .cf-preview-row {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .cf-preview-thumb {
            width: 38px;
            height: 38px;
            border-radius: 8px;
            object-fit: cover;
            border: 1px solid var(--border-default);
            background: var(--bg-surface-warm);
            flex-shrink: 0;
            animation: cfFadeIn 0.25s ease;
          }

          .cf-preview-placeholder {
            width: 38px;
            height: 38px;
            border-radius: 8px;
            border: 1px dashed var(--border-default);
            background: var(--bg-surface-warm);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: var(--text-muted);
            flex-shrink: 0;
          }

          .cf-toggle-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            padding: 12px 14px;
            border-radius: 12px;
            background: var(--bg-surface-warm);
            border: 1px solid var(--border-default);
            transition: border-color 0.2s ease, background 0.2s ease;
          }

          .cf-toggle-row.on {
            border-color: rgba(46,125,50,0.4);
            background: rgba(46,125,50,0.06);
          }

          .cf-toggle-label {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: var(--text-sm);
            font-weight: 600;
            color: var(--forest-950);
            cursor: pointer;
          }

          .cf-toggle-icon {
            width: 26px;
            height: 26px;
            border-radius: 8px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: #fff5e0;
            color: #f9a825;
            flex-shrink: 0;
            transition: transform 0.25s ease;
          }

          .cf-toggle-row.on .cf-toggle-icon {
            transform: scale(1.1) rotate(10deg);
          }

          .cf-switch {
            position: relative;
            width: 42px;
            height: 24px;
            border-radius: 999px;
            background: #cfd8dc;
            cursor: pointer;
            transition: background 0.25s ease;
            flex-shrink: 0;
            border: none;
          }

          .cf-switch.on {
            background: linear-gradient(135deg, #2e7d32, #43a047);
          }

          .cf-switch-knob {
            position: absolute;
            top: 3px;
            left: 3px;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #fff;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            transition: transform 0.25s cubic-bezier(0.65,0,0.35,1);
          }

          .cf-switch.on .cf-switch-knob {
            transform: translateX(18px);
          }
        `}</style>

        <div className="cf-section">
          <div className="cf-section-head">
            <FileText size={13} /> Basic Information
          </div>

          <div className="cf-group">
            <label className="cf-label">
              Charity Name <span className="cf-required">*</span>
            </label>
            <input
              className="cf-input"
              placeholder="e.g. Marine Conservation Trust"
              value={charityFormName}
              onChange={(e) => handleAutoSlug(e.target.value)}
            />
          </div>

          <div className="cf-group">
            <label className="cf-label">
              URL Slug <span className="cf-required">*</span> (Unique
              Identifier)
            </label>
            <input
              className="cf-input"
              placeholder="e.g. marine-conservation-trust"
              value={charityFormSlug}
              onChange={(e) =>
                setCharityFormSlug(
                  e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                )
              }
            />
            <span className="cf-hint">
              <Link2 size={11} /> Public link:{" "}
              <code>/charities/{charityFormSlug || "slug"}</code>
            </span>
          </div>

          <div className="cf-group">
            <label className="cf-label">
              Category <span className="cf-required">*</span>
            </label>
            <div className="cf-category-grid">
              {CATEGORY_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  className={`cf-category-chip${charityFormCategory === opt.value ? " active" : ""}`}
                  style={{ ["--cat-color" as any]: opt.color }}
                  onClick={() => setCharityFormCategory(opt.value)}
                >
                  <span className="cf-category-icon">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="cf-group">
            <label className="cf-label">
              Tagline (Short Summary)
              <span className="cf-char-count">
                {charityFormTagline.length}/120
              </span>
            </label>
            <input
              className="cf-input"
              placeholder="e.g. Protecting coastal wildlife and marine reserves across the UK"
              maxLength={120}
              value={charityFormTagline}
              onChange={(e) => setCharityFormTagline(e.target.value)}
            />
          </div>

          <div className="cf-group">
            <label className="cf-label">
              Full Description <span className="cf-required">*</span>
              <span className="cf-char-count">
                {charityFormDescription.length} chars
              </span>
            </label>
            <textarea
              className="cf-input"
              rows={3}
              placeholder="Detailed mission and impact narrative..."
              value={charityFormDescription}
              onChange={(e) => setCharityFormDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="cf-section">
          <div className="cf-section-head">
            <ImageIcon size={13} /> Media & Links
          </div>

          <div className="cf-media-grid">
            <div className="cf-media-field">
              <label className="cf-label">Logo Image URL</label>
              <div className="cf-preview-row">
                {isValidUrl(charityFormLogoUrl) ? (
                  <img
                    src={charityFormLogoUrl}
                    alt="Logo preview"
                    className="cf-preview-thumb"
                  />
                ) : (
                  <span className="cf-preview-placeholder">
                    <ImageIcon size={14} />
                  </span>
                )}
                <input
                  className="cf-input"
                  placeholder="https://..."
                  value={charityFormLogoUrl}
                  onChange={(e) => setCharityFormLogoUrl(e.target.value)}
                />
              </div>
            </div>

            <div className="cf-media-field">
              <label className="cf-label">Cover Image URL</label>
              <div className="cf-preview-row">
                {isValidUrl(charityFormCoverUrl) ? (
                  <img
                    src={charityFormCoverUrl}
                    alt="Cover preview"
                    className="cf-preview-thumb"
                  />
                ) : (
                  <span className="cf-preview-placeholder">
                    <ImageIcon size={14} />
                  </span>
                )}
                <input
                  className="cf-input"
                  placeholder="https://..."
                  value={charityFormCoverUrl}
                  onChange={(e) => setCharityFormCoverUrl(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="cf-group">
            <label className="cf-label">Official Website URL</label>
            <input
              className="cf-input"
              placeholder="https://..."
              value={charityFormWebsiteUrl}
              onChange={(e) => setCharityFormWebsiteUrl(e.target.value)}
            />
            <span className="cf-hint">
              <Globe size={11} /> Linked from the public charity profile page
            </span>
          </div>
        </div>

        <div className="cf-section">
          <div className="cf-section-head">
            <Star size={13} /> Visibility Settings
          </div>

          <div className={`cf-toggle-row${charityFormFeatured ? " on" : ""}`}>
            <label
              htmlFor="charityFeaturedCheckbox"
              className="cf-toggle-label"
            >
              <span className="cf-toggle-icon">
                <Star
                  size={14}
                  fill={charityFormFeatured ? "#f9a825" : "none"}
                />
              </span>
              Highlight as Featured Partner on Home & Charity Directory
            </label>
            <button
              type="button"
              id="charityFeaturedCheckbox"
              className={`cf-switch${charityFormFeatured ? " on" : ""}`}
              onClick={() => setCharityFormFeatured((v) => !v)}
              aria-pressed={charityFormFeatured}
            >
              <span className="cf-switch-knob" />
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
