import React, { useState, useMemo } from "react";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Edit2,
  Trophy,
  Users,
  Filter,
  MapPin,
} from "lucide-react";
import type { UserProfile } from "../../../types";
import { EditUserModal } from "./EditUserModal";
import { InspectScoresModal } from "./InspectScoresModal";

interface UsersSectionProps {
  usersList: UserProfile[];
  onRefresh: () => Promise<void>;
  currentUserId?: string;
}

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

const avatarColor = (seed: string) => {
  const colors = [
    "#2e7d32",
    "#1e88e5",
    "#8e24aa",
    "#fb8c00",
    "#00897b",
    "#5e35b1",
    "#c62828",
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++)
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

export const UsersSection: React.FC<UsersSectionProps> = ({
  usersList,
  onRefresh,
  currentUserId,
}) => {
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<
    "all" | "subscriber" | "admin"
  >("all");
  const [userCurrentPage, setUserCurrentPage] = useState(1);
  const usersPerPage = 8;

  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [inspectUser, setInspectUser] = useState<UserProfile | null>(null);

  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      const matchesSearch =
        u.full_name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        (u.home_club &&
          u.home_club.toLowerCase().includes(userSearchQuery.toLowerCase()));
      const matchesRole = userRoleFilter === "all" || u.role === userRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [usersList, userSearchQuery, userRoleFilter]);

  const totalUserPages = Math.ceil(filteredUsers.length / usersPerPage) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (userCurrentPage - 1) * usersPerPage;
    return filteredUsers.slice(start, start + usersPerPage);
  }, [filteredUsers, userCurrentPage]);

  const subCount = usersList.filter((u) => u.role === "subscriber").length;
  const adminCount = usersList.filter((u) => u.role === "admin").length;

  return (
    <div className="us-wrap">
      <style>{`
        @keyframes usFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes usRowIn {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes usPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(46,125,50,0.3); }
          50% { box-shadow: 0 0 0 5px rgba(46,125,50,0); }
        }

        .us-wrap {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
          animation: usFadeIn 0.4s ease;
        }

        .us-card {
          overflow: hidden;
          border-radius: 16px !important;
        }

        .us-toolbar {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          gap: var(--space-4);
          padding: var(--space-5);
          background: linear-gradient(135deg, var(--bg-surface-warm), #fff);
          border-bottom: 1px solid var(--border-default);
          position: relative;
          overflow: hidden;
        }

        .us-toolbar::before {
          content: '';
          position: absolute;
          top: -40px;
          right: -20px;
          width: 150px;
          height: 150px;
          background: radial-gradient(circle, rgba(46,125,50,0.1), transparent 70%);
          pointer-events: none;
        }

        .us-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          position: relative;
          z-index: 1;
        }

        .us-title-icon {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #2e7d32, #43a047);
          color: #fff;
          flex-shrink: 0;
          animation: usPulse 2.4s infinite;
        }

        .us-controls {
          display: flex;
          gap: var(--space-2);
          flex-wrap: wrap;
          align-items: center;
          position: relative;
          z-index: 1;
        }

        .us-search-box {
          position: relative;
          transition: transform 0.2s ease;
        }

        .us-search-box:focus-within {
          transform: translateY(-1px);
        }

        .us-search-box svg {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          transition: color 0.2s ease;
        }

        .us-search-box:focus-within svg {
          color: #2e7d32;
        }

        .us-search-input {
          padding: 8px 12px 8px 30px;
          font-size: var(--text-xs);
          width: 220px;
          border-radius: 10px !important;
          transition: box-shadow 0.2s ease, border-color 0.2s ease;
        }

        .us-search-input:focus {
          box-shadow: 0 0 0 3px rgba(46,125,50,0.14);
          border-color: #2e7d32;
        }

        .us-filter-pills {
          position: relative;
          display: inline-flex;
          padding: 4px;
          border-radius: 11px;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
        }

        .us-filter-indicator {
          position: absolute;
          top: 4px;
          bottom: 4px;
          border-radius: 8px;
          background: linear-gradient(135deg, #2e7d32, #43a047);
          box-shadow: 0 3px 10px -2px rgba(46,125,50,0.45);
          transition: left 0.3s cubic-bezier(0.65,0,0.35,1), width 0.3s cubic-bezier(0.65,0,0.35,1);
        }

        .us-filter-btn {
          position: relative;
          z-index: 1;
          padding: 7px 13px;
          border: none;
          background: transparent;
          font-size: 12px;
          font-weight: 700;
          color: var(--charcoal-700);
          cursor: pointer;
          border-radius: 8px;
          white-space: nowrap;
          transition: color 0.25s ease;
        }

        .us-filter-btn.active {
          color: #fff;
        }

        .us-thead-row th {
          padding: var(--space-4);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-muted);
          font-weight: 700;
          background: var(--bg-surface);
          border-bottom: 1px solid var(--border-default);
        }

        .us-row {
          position: relative;
          border-bottom: 1px solid var(--border-subtle);
          animation: usRowIn 0.35s ease both;
          transition: background 0.2s ease;
        }

        .us-row::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: transparent;
          transition: background 0.2s ease;
        }

        .us-row:hover {
          background: rgba(46,125,50,0.035);
        }

        .us-row:hover::before {
          background: #2e7d32;
        }

        .us-user-cell {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .us-avatar {
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
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        }

        .us-name {
          font-weight: 700;
          color: var(--forest-950);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .us-email {
          font-size: var(--text-xs);
          color: var(--charcoal-600);
        }

        .us-handicap-value {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .us-handicap-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #2e7d32;
          flex-shrink: 0;
        }

        .us-club-cell {
          display: flex;
          align-items: center;
          gap: 5px;
          color: var(--charcoal-700);
        }

        .us-club-cell svg {
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .us-actions {
          display: inline-flex;
          gap: 6px;
          justify-content: flex-end;
          width: 100%;
        }

        .us-actions button {
          transition: transform 0.15s ease;
        }

        .us-actions button:hover {
          transform: translateY(-1px);
        }

        .us-empty-state {
          padding: var(--space-12);
          text-align: center;
          color: var(--text-muted);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .us-empty-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--bg-surface-warm);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
        }

        .us-pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-4) var(--space-5);
          background: var(--bg-surface-warm);
          border-top: 1px solid var(--border-default);
          font-size: var(--text-xs);
        }

        .us-pagination-info {
          color: var(--text-muted);
        }

        .us-pagination-controls {
          display: flex;
          gap: 6px;
          align-items: center;
        }

        .us-page-indicator {
          font-weight: 700;
          padding: 0 4px;
        }

        .us-advisory {
          padding: var(--space-4) var(--space-5);
          background: rgba(44, 95, 45, 0.08);
          border: 1px solid var(--forest-200, #c8e6c9);
          border-radius: var(--radius-md);
          font-size: var(--text-xs);
          color: var(--forest-950);
          display: flex;
          gap: var(--space-3);
          align-items: flex-start;
          animation: usFadeIn 0.5s ease;
          transition: box-shadow 0.25s ease;
        }

        .us-advisory:hover {
          box-shadow: 0 8px 20px -14px rgba(0,0,0,0.3);
        }

        .us-advisory svg {
          color: var(--forest-700, #2e7d32);
          flex-shrink: 0;
          margin-top: 2px;
        }
      `}</style>

      <Card padding="none" className="us-card">

        <div className="us-toolbar">
          <div>
            <div className="us-title-row">
              <span className="us-title-icon">
                <Users size={16} />
              </span>
              <div>
                <h4 style={{ color: "var(--forest-950)" }}>
                  User & Subscription Registry
                </h4>
                <p
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--text-muted)",
                    marginTop: 2,
                  }}
                >
                  Manage golfer profiles, handicap indices (-10.0 to 54.0), home
                  clubs, and score audit histories.
                </p>
              </div>
            </div>
          </div>

          <div className="us-controls">
            <div className="us-search-box">
              <Search size={14} />
              <input
                type="text"
                placeholder="Search name, email, club..."
                className="form-input us-search-input"
                value={userSearchQuery}
                onChange={(e) => {
                  setUserSearchQuery(e.target.value);
                  setUserCurrentPage(1);
                }}
              />
            </div>

            <div className="us-filter-pills">
              <div
                className="us-filter-indicator"
                style={
                  userRoleFilter === "all"
                    ? { left: 4, width: "calc(33.33% - 2.67px)" }
                    : userRoleFilter === "subscriber"
                      ? {
                          left: "calc(33.33% + 1.33px)",
                          width: "calc(33.33% - 2.67px)",
                        }
                      : {
                          left: "calc(66.66% - 1.33px)",
                          width: "calc(33.33% - 2.67px)",
                        }
                }
              />
              <button
                className={`us-filter-btn${userRoleFilter === "all" ? " active" : ""}`}
                onClick={() => {
                  setUserRoleFilter("all");
                  setUserCurrentPage(1);
                }}
              >
                All ({usersList.length})
              </button>
              <button
                className={`us-filter-btn${userRoleFilter === "subscriber" ? " active" : ""}`}
                onClick={() => {
                  setUserRoleFilter("subscriber");
                  setUserCurrentPage(1);
                }}
              >
                Golfers ({subCount})
              </button>
              <button
                className={`us-filter-btn${userRoleFilter === "admin" ? " active" : ""}`}
                onClick={() => {
                  setUserRoleFilter("admin");
                  setUserCurrentPage(1);
                }}
              >
                Admins ({adminCount})
              </button>
            </div>
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="us-empty-state">
            <span className="us-empty-icon">
              <Filter size={18} />
            </span>
            No users match the active search or role criteria.
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
                <tr className="us-thead-row">
                  <th>Golfer / User</th>
                  <th>Role</th>
                  <th>Handicap Index</th>
                  <th>Home Club</th>
                  <th>Joined</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((u, i) => {
                  const isCurrentUser = currentUserId === u.id;
                  const name = u.full_name || "Anonymous Golfer";
                  const accent = avatarColor(u.id || u.email || name);
                  return (
                    <tr
                      key={u.id}
                      className="us-row"
                      style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                    >
                      <td style={{ padding: "var(--space-4)" }}>
                        <div className="us-user-cell">
                          <span
                            className="us-avatar"
                            style={{ background: accent }}
                          >
                            {getInitials(name)}
                          </span>
                          <div>
                            <div className="us-name">
                              {name}
                              {isCurrentUser && (
                                <Badge variant="lime" size="sm">
                                  You
                                </Badge>
                              )}
                            </div>
                            <div className="us-email">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "var(--space-4)" }}>
                        <Badge
                          variant={u.role === "admin" ? "forest" : "lime"}
                          size="sm"
                        >
                          {u.role.toUpperCase()}
                        </Badge>
                      </td>
                      <td
                        style={{
                          padding: "var(--space-4)",
                          fontFamily: "var(--font-numeric)",
                        }}
                      >
                        {u.handicap !== undefined && u.handicap !== null ? (
                          <span className="us-handicap-value">
                            <span className="us-handicap-dot" />
                            <span style={{ fontWeight: 700 }}>
                              {u.handicap > 0 ? `+${u.handicap}` : u.handicap}
                            </span>
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "var(--space-4)" }}>
                        {u.home_club ? (
                          <span className="us-club-cell">
                            <MapPin size={12} />
                            {u.home_club}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>
                            None set
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "var(--space-4)",
                          color: "var(--text-muted)",
                          fontSize: "var(--text-xs)",
                        }}
                      >
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "var(--space-4)" }}>
                        <div className="us-actions">
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Edit2 size={12} />}
                            onClick={() => setEditingUser(u)}
                            title="Edit profile and role"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Trophy size={12} />}
                            onClick={() => setInspectUser(u)}
                            title="Inspect golf score rounds"
                          >
                            Scores
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

        {filteredUsers.length > usersPerPage && (
          <div className="us-pagination">
            <span className="us-pagination-info">
              Showing {(userCurrentPage - 1) * usersPerPage + 1}–
              {Math.min(userCurrentPage * usersPerPage, filteredUsers.length)}{" "}
              of {filteredUsers.length} users
            </span>
            <div className="us-pagination-controls">
              <Button
                variant="outline"
                size="sm"
                disabled={userCurrentPage <= 1}
                onClick={() => setUserCurrentPage((p) => Math.max(1, p - 1))}
                leftIcon={<ChevronLeft size={14} />}
              >
                Prev
              </Button>
              <span className="us-page-indicator">
                Page {userCurrentPage} of {totalUserPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={userCurrentPage >= totalUserPages}
                onClick={() =>
                  setUserCurrentPage((p) => Math.min(totalUserPages, p + 1))
                }
                rightIcon={<ChevronRight size={14} />}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      <div className="us-advisory">
        <ShieldAlert size={18} />
        <div>
          <strong>
            Subscription Status & Payment Authority Note:
          </strong>{" "}
          Subscription statuses reflect real recorded database states. In
          accordance with platform security guidelines, administrators cannot
          toggle unpaid subscriptions to &ldquo;active&rdquo; or &ldquo;paid&rdquo;
          without confirmed payment processor webhooks.
        </div>
      </div>

      {editingUser && (
        <EditUserModal
          key={editingUser.id}
          userToEdit={editingUser}
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          onSaveSuccess={onRefresh}
          currentUserId={currentUserId}
        />
      )}

      {inspectUser && (
        <InspectScoresModal
          key={inspectUser.id}
          userToInspect={inspectUser}
          isOpen={!!inspectUser}
          onClose={() => setInspectUser(null)}
        />
      )}
    </div>
  );
};
