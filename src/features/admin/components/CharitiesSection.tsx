import React, { useState, useMemo } from "react";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Archive,
  Heart,
  ShieldCheck,
  Star,
  Filter,
} from "lucide-react";
import type { Charity } from "../../../types";
import { CharityFormModal } from "./CharityFormModal";
import { DeleteCharityModal } from "./DeleteCharityModal";

interface CharitiesSectionProps {
  charitiesList: Charity[];
  isConfigured: boolean;
  onRefresh: () => Promise<void>;
}

const CATEGORY_COLORS: Record<string, string> = {
  environment: "#2e7d32",
  youth_sports: "#fb8c00",
  health: "#e53935",
  community: "#5e35b1",
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

export const CharitiesSection: React.FC<CharitiesSectionProps> = ({
  charitiesList,
  isConfigured,
  onRefresh,
}) => {
  const [charitySearchQuery, setCharitySearchQuery] = useState("");
  const [charityCategoryFilter, setCharityCategoryFilter] =
    useState<string>("all");
  const [charityStatusFilter, setCharityStatusFilter] = useState<
    "all" | "active" | "archived"
  >("all");

  const [isCharityModalOpen, setIsCharityModalOpen] = useState(false);
  const [charityModalMode, setCharityModalMode] = useState<"add" | "edit">(
    "add",
  );
  const [charityToEdit, setCharityToEdit] = useState<Charity | null>(null);
  const [charityToDelete, setCharityToDelete] = useState<Charity | null>(null);

  const filteredCharities = useMemo(() => {
    return charitiesList.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(charitySearchQuery.toLowerCase()) ||
        c.slug.toLowerCase().includes(charitySearchQuery.toLowerCase()) ||
        (c.tagline &&
          c.tagline.toLowerCase().includes(charitySearchQuery.toLowerCase()));
      const matchesCategory =
        charityCategoryFilter === "all" || c.category === charityCategoryFilter;
      const matchesStatus =
        charityStatusFilter === "all"
          ? true
          : charityStatusFilter === "archived"
            ? !!c.is_archived
            : !c.is_archived;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [
    charitiesList,
    charitySearchQuery,
    charityCategoryFilter,
    charityStatusFilter,
  ]);

  const handleOpenAddCharity = () => {
    setCharityModalMode("add");
    setCharityToEdit(null);
    setIsCharityModalOpen(true);
  };

  const handleOpenEditCharity = (c: Charity) => {
    setCharityModalMode("edit");
    setCharityToEdit(c);
    setIsCharityModalOpen(true);
  };

  const activeCount = charitiesList.filter((c) => !c.is_archived).length;

  return (
    <div className="charities-wrap">
      <style>{`
        @keyframes charityFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes charityRowIn {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes charityPulseRing {
          0% { box-shadow: 0 0 0 0 rgba(46,125,50,0.35); }
          100% { box-shadow: 0 0 0 8px rgba(46,125,50,0); }
        }
        @keyframes charityShine {
          0% { background-position: -150% 0; }
          100% { background-position: 250% 0; }
        }

        .charities-wrap {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
          animation: charityFadeIn 0.4s ease;
        }

        .charity-card {
          overflow: hidden;
          border-radius: 16px !important;
        }

        .charity-toolbar {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          gap: var(--space-4);
          padding: var(--space-5) var(--space-5);
          background: linear-gradient(135deg, var(--bg-surface-warm), #fff);
          border-bottom: 1px solid var(--border-default);
          position: relative;
        }

        .charity-toolbar::before {
          content: '';
          position: absolute;
          top: -40px;
          left: -40px;
          width: 140px;
          height: 140px;
          background: radial-gradient(circle, rgba(46,125,50,0.1), transparent 70%);
          pointer-events: none;
        }

        .charity-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          position: relative;
          z-index: 1;
        }

        .charity-title-icon {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #2e7d32, #43a047);
          color: #fff;
          flex-shrink: 0;
          animation: charityPulseRing 2.4s infinite;
        }

        .charity-count-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 9px;
          border-radius: 999px;
          background: rgba(46,125,50,0.12);
          color: #2e7d32;
          font-size: 11px;
          font-weight: 700;
          margin-left: 6px;
        }

        .charity-controls {
          display: flex;
          gap: var(--space-2);
          flex-wrap: wrap;
          align-items: center;
          position: relative;
          z-index: 1;
        }

        .charity-search-box {
          position: relative;
          transition: transform 0.2s ease;
        }

        .charity-search-box:focus-within {
          transform: translateY(-1px);
        }

        .charity-search-box svg {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          transition: color 0.2s ease;
        }

        .charity-search-box:focus-within svg {
          color: #2e7d32;
        }

        .charity-input {
          font-size: var(--text-xs);
          padding: 7px 10px 7px 30px;
          width: 190px;
          border-radius: 10px !important;
          transition: box-shadow 0.2s ease, border-color 0.2s ease;
        }

        .charity-input:focus,
        .charity-select:focus {
          box-shadow: 0 0 0 3px rgba(46,125,50,0.15);
          border-color: #2e7d32;
        }

        .charity-select {
          font-size: var(--text-xs);
          padding: 7px 10px;
          width: auto;
          border-radius: 10px !important;
          cursor: pointer;
        }

        .charity-add-btn {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .charity-add-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 18px -8px rgba(46,125,50,0.5);
        }

        .table-responsive table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: var(--text-sm);
        }

        .charity-thead-row th {
          padding: var(--space-4);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-muted);
          font-weight: 700;
          background: var(--bg-surface);
          border-bottom: 1px solid var(--border-default);
        }

        .charity-row {
          position: relative;
          border-bottom: 1px solid var(--border-subtle);
          animation: charityRowIn 0.35s ease both;
          transition: background 0.2s ease;
        }

        .charity-row::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: transparent;
          transition: background 0.2s ease;
        }

        .charity-row:hover {
          background: rgba(46,125,50,0.035);
        }

        .charity-row:hover::before {
          background: #2e7d32;
        }

        .charity-row.archived-row {
          opacity: 0.62;
        }

        .charity-row.archived-row:hover {
          opacity: 0.85;
        }

        .charity-name-cell {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .charity-avatar {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 800;
          color: #fff;
          letter-spacing: 0.02em;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        }

        .charity-name {
          font-weight: 700;
          color: var(--forest-950);
        }

        .charity-slug {
          font-size: var(--text-xs);
          color: var(--text-muted);
          font-family: monospace;
        }

        .status-badges {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }

        .charity-desc-cell {
          max-width: 280px;
          font-size: var(--text-xs);
          color: var(--charcoal-700);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .charity-raised-cell {
          font-family: var(--font-numeric);
          font-weight: 700;
          color: var(--forest-950);
          position: relative;
        }

        .charity-raised-cell.has-funds {
          background: linear-gradient(90deg, #2e7d32, #66bb6a, #2e7d32);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: charityShine 5s linear infinite;
        }

        .charity-actions {
          display: inline-flex;
          gap: 6px;
          justify-content: flex-end;
          width: 100%;
        }

        .charity-actions button {
          transition: transform 0.15s ease;
        }

        .charity-actions button:hover {
          transform: translateY(-1px);
        }

        .charity-empty-state {
          padding: var(--space-12);
          text-align: center;
          color: var(--text-muted);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .charity-empty-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--bg-surface-warm);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
        }

        .integrity-note {
          padding: var(--space-4) var(--space-5);
          background: var(--bg-surface-warm);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          font-size: var(--text-xs);
          color: var(--charcoal-700);
          display: flex;
          gap: 10px;
          align-items: flex-start;
          animation: charityFadeIn 0.5s ease;
          transition: box-shadow 0.25s ease;
        }

        .integrity-note:hover {
          box-shadow: 0 8px 20px -14px rgba(0,0,0,0.3);
        }

        .integrity-note svg {
          flex-shrink: 0;
          color: #2e7d32;
          margin-top: 2px;
        }

        .integrity-note code {
          background: rgba(0,0,0,0.06);
          padding: 1px 5px;
          border-radius: 4px;
        }
      `}</style>

      <Card padding="none" className="charity-card">

        <div className="charity-toolbar">
          <div>
            <div className="charity-title-row">
              <span className="charity-title-icon">
                <Heart size={16} />
              </span>
              <div>
                <h4
                  style={{
                    color: "var(--forest-950)",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  Charity Partner Directory
                  <span className="charity-count-badge">
                    <ShieldCheck size={11} /> {activeCount} active
                  </span>
                </h4>
                <p
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--text-muted)",
                    marginTop: 2,
                  }}
                >
                  Manage cause partners, content slugs, featured highlights, and
                  safe archival controls.
                </p>
              </div>
            </div>
          </div>

          <div className="charity-controls">
            <div className="charity-search-box">
              <Search size={14} />
              <input
                type="text"
                placeholder="Search charities..."
                className="form-input charity-input"
                value={charitySearchQuery}
                onChange={(e) => setCharitySearchQuery(e.target.value)}
              />
            </div>

            <select
              className="form-input charity-select"
              value={charityCategoryFilter}
              onChange={(e) => setCharityCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              <option value="environment">Environment</option>
              <option value="youth_sports">Youth Sports</option>
              <option value="health">Health</option>
              <option value="community">Community</option>
            </select>

            <select
              className="form-input charity-select"
              value={charityStatusFilter}
              onChange={(e) =>
                setCharityStatusFilter(
                  e.target.value as "all" | "active" | "archived",
                )
              }
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="archived">Archived Only</option>
            </select>

            <Button
              variant="primary"
              size="sm"
              className="charity-add-btn"
              leftIcon={<Plus size={14} />}
              onClick={handleOpenAddCharity}
            >
              Add Charity
            </Button>
          </div>
        </div>

        {filteredCharities.length === 0 ? (
          <div className="charity-empty-state">
            <span className="charity-empty-icon">
              <Filter size={18} />
            </span>
            No charities found matching current filters.
          </div>
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr className="charity-thead-row">
                  <th>Partner Name & Slug</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Description</th>
                  <th>Total Raised</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCharities.map((c, i) => {
                  const accent = CATEGORY_COLORS[c.category] || "#546e7a";
                  const raised = (c.total_raised_cents || 0) / 100;
                  return (
                    <tr
                      key={c.id}
                      className={`charity-row${c.is_archived ? " archived-row" : ""}`}
                      style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
                    >
                      <td style={{ padding: "var(--space-4)" }}>
                        <div className="charity-name-cell">
                          <span
                            className="charity-avatar"
                            style={{ background: accent }}
                          >
                            {getInitials(c.name)}
                          </span>
                          <div>
                            <div className="charity-name">{c.name}</div>
                            <div className="charity-slug">
                              /charities/{c.slug}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "var(--space-4)" }}>
                        <Badge variant="lime" size="sm">
                          {c.category.replace("_", " ")}
                        </Badge>
                      </td>
                      <td style={{ padding: "var(--space-4)" }}>
                        <div className="status-badges">
                          {c.is_featured && (
                            <Badge variant="forest" size="sm">
                              <Star
                                size={10}
                                style={{
                                  marginRight: 3,
                                  verticalAlign: "-1px",
                                }}
                              />
                              Featured
                            </Badge>
                          )}
                          {c.is_archived ? (
                            <Badge variant="warning" size="sm">
                              Archived
                            </Badge>
                          ) : (
                            <Badge variant="success" size="sm">
                              Active
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "var(--space-4)" }}>
                        <div
                          className="charity-desc-cell"
                          title={c.description}
                        >
                          {c.description}
                        </div>
                      </td>
                      <td style={{ padding: "var(--space-4)" }}>
                        <span
                          className={`charity-raised-cell${raised > 0 ? " has-funds" : ""}`}
                        >
                          ₹{raised.toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td style={{ padding: "var(--space-4)" }}>
                        <div className="charity-actions">
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Edit2 size={12} />}
                            onClick={() => handleOpenEditCharity(c)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            style={{ color: "var(--color-error)" }}
                            leftIcon={
                              c.is_archived ? (
                                <Trash2 size={12} />
                              ) : (
                                <Archive size={12} />
                              )
                            }
                            onClick={() => setCharityToDelete(c)}
                            title={
                              c.is_archived
                                ? "Delete / Re-archive"
                                : "Safely archive or delete"
                            }
                          >
                            {c.is_archived ? "Delete" : "Archive"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="integrity-note">
        <ShieldCheck size={16} />
        <span>
          <strong>Data Integrity Guarantee:</strong> Charities with historical
          contributions in <code>donation_ledger</code> or member preferences
          cannot be hard deleted. Attempting deletion will automatically archive
          the charity (<code>is_archived = true</code>), preserving complete
          financial audit trails.
        </span>
      </div>

      {isCharityModalOpen && (
        <CharityFormModal
          key={
            charityModalMode === "edit" && charityToEdit
              ? charityToEdit.id
              : "add"
          }
          isOpen={isCharityModalOpen}
          onClose={() => setIsCharityModalOpen(false)}
          mode={charityModalMode}
          charity={charityToEdit}
          onSaveSuccess={onRefresh}
          isConfigured={isConfigured}
        />
      )}

      <DeleteCharityModal
        isOpen={!!charityToDelete}
        onClose={() => setCharityToDelete(null)}
        charity={charityToDelete}
        onDeleteSuccess={onRefresh}
        isConfigured={isConfigured}
      />
    </div>
  );
};
