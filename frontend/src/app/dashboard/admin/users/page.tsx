"use client";

import React, { useState, useEffect } from "react";
import api from "@/lib/axios";
import StatsCard from "@/components/StatsCard";
import Button from "@/components/Button";
import Modal from "@/components/Modal";

interface User {
  id: string;
  alternateEmail: string;
  bhuEmail?: string | null;
  firstName: string;
  lastName: string;
  role: "APPLICANT" | "HOD" | "CC_ADMIN";
  departmentId?: string;
  createdAt: string;
}

const roleLabels: Record<string, { label: string; bg: string; text: string }> = {
  APPLICANT: {
    label: "Applicant",
    bg: "bg-primary-container",
    text: "text-on-primary-container",
  },
  HOD: {
    label: "Head of Dept",
    bg: "bg-secondary-container",
    text: "text-secondary",
  },
  CC_ADMIN: {
    label: "CC Admin",
    bg: "bg-tertiary-container",
    text: "text-tertiary",
  },
};

/**
 * CC Admin — User Management
 *
 * Lists all registered users with role filtering and search.
 * Displays user details in a side modal.
 */
export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const { data } = await api.get("/users");
      setUsers(data.success ? data.data : data);
    } catch {
      // empty
    } finally {
      setLoading(false);
    }
  }

  const filtered = users.filter((u) => {
    const matchesRole =
      roleFilter === "all" || u.role === roleFilter;
    const matchesSearch =
      !search ||
      `${u.firstName} ${u.lastName} ${u.alternateEmail}`
        .toLowerCase()
        .includes(search.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const roleCounts = {
    all: users.length,
    APPLICANT: users.filter((u) => u.role === "APPLICANT").length,
    HOD: users.filter((u) => u.role === "HOD").length,
    CC_ADMIN: users.filter((u) => u.role === "CC_ADMIN").length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 skeleton" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 skeleton rounded-2xl" />
          ))}
        </div>
        <div className="space-y-3 mt-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            User Management
          </h1>
          <p className="text-sm text-outline mt-1">
            {users.length} registered user{users.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="p-2 rounded-lg hover:bg-surface-variant transition-colors cursor-pointer"
          title="Refresh"
        >
          <span className="material-symbols-rounded text-[22px] text-outline">
            refresh
          </span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard
          icon="group"
          label="Total Users"
          value={roleCounts.all}
          variant="primary"
        />
        <StatsCard
          icon="person"
          label="Applicants"
          value={roleCounts.APPLICANT}
          variant="default"
        />
        <StatsCard
          icon="supervisor_account"
          label="HODs"
          value={roleCounts.HOD}
          variant="warning"
        />
        <StatsCard
          icon="admin_panel_settings"
          label="Admins"
          value={roleCounts.CC_ADMIN}
          variant="error"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full rounded-xl border-2 border-outline-variant bg-surface pl-11 pr-4 py-2.5 text-sm text-foreground placeholder-outline/50 focus:border-primary focus:outline-none transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-surface-variant cursor-pointer"
            >
              <span className="material-symbols-rounded text-[16px] text-outline">
                close
              </span>
            </button>
          )}
        </div>

        {/* Role tabs */}
        <div className="flex items-center gap-1 bg-surface-variant/50 rounded-xl p-1">
          {(
            [
              { key: "all", label: "All" },
              { key: "APPLICANT", label: "Applicants" },
              { key: "HOD", label: "HODs" },
              { key: "CC_ADMIN", label: "Admins" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setRoleFilter(tab.key)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                roleFilter === tab.key
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-outline hover:text-foreground"
              }`}
            >
              {tab.label}
              <span className="ml-1 text-outline/60">
                ({roleCounts[tab.key as keyof typeof roleCounts]})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      {filtered.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-outline-variant p-12 text-center">
          <span className="material-symbols-rounded text-[48px] text-outline/40 mb-3">
            person_search
          </span>
          <p className="text-sm text-outline">
            No users match your search criteria.
          </p>
        </div>
      ) : (
        <div className="bg-surface rounded-2xl border border-outline-variant overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-variant/30 border-b border-outline-variant">
                  <th className="text-left text-[11px] uppercase tracking-wider font-semibold text-outline py-3 px-5">
                    User
                  </th>
                  <th className="text-left text-[11px] uppercase tracking-wider font-semibold text-outline py-3 px-5">
                    Email
                  </th>
                  <th className="text-left text-[11px] uppercase tracking-wider font-semibold text-outline py-3 px-5">
                    Role
                  </th>
                  <th className="text-left text-[11px] uppercase tracking-wider font-semibold text-outline py-3 px-5">
                    BHU Email
                  </th>
                  <th className="text-left text-[11px] uppercase tracking-wider font-semibold text-outline py-3 px-5">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => {
                  const roleConfig = roleLabels[user.role];
                  return (
                    <tr
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className="border-b border-outline-variant/50 hover:bg-surface-variant/20 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-xs font-bold text-on-primary-container shrink-0">
                            {user.firstName[0]}
                            {user.lastName[0]}
                          </div>
                          <p className="text-sm font-medium text-foreground">
                            {user.firstName} {user.lastName}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-5 text-sm text-outline">
                        {user.alternateEmail}
                      </td>
                      <td className="py-3 px-5">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${roleConfig.bg} ${roleConfig.text}`}
                        >
                          {roleConfig.label}
                        </span>
                      </td>
                      <td className="py-3 px-5">
                        {user.bhuEmail ? (
                          <span className="text-sm text-success font-medium">
                            {user.bhuEmail}
                          </span>
                        ) : (
                          <span className="text-xs text-outline/50">—</span>
                        )}
                      </td>
                      <td className="py-3 px-5 text-xs text-outline whitespace-nowrap">
                        {new Date(user.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      <Modal
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title="User Details"
        size="md"
        footer={
          <div className="w-full flex justify-end">
            <Button variant="outlined" onClick={() => setSelectedUser(null)}>
              Close
            </Button>
          </div>
        }
      >
        {selectedUser && (
          <div className="space-y-5">
            {/* Profile header */}
            <div className="flex items-center gap-4 p-5 bg-surface-variant/30 rounded-xl">
              <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center text-xl font-bold text-on-primary-container">
                {selectedUser.firstName[0]}
                {selectedUser.lastName[0]}
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">
                  {selectedUser.firstName} {selectedUser.lastName}
                </p>
                <p className="text-sm text-outline">
                  {selectedUser.alternateEmail}
                </p>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold mt-1 ${
                    roleLabels[selectedUser.role].bg
                  } ${roleLabels[selectedUser.role].text}`}
                >
                  {roleLabels[selectedUser.role].label}
                </span>
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-variant/30 rounded-lg px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-outline font-medium">
                  User ID
                </p>
                <p className="text-xs text-foreground font-mono truncate">
                  {selectedUser.id}
                </p>
              </div>
              <div className="bg-surface-variant/30 rounded-lg px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-outline font-medium">
                  Joined
                </p>
                <p className="text-sm text-foreground font-medium">
                  {new Date(selectedUser.createdAt).toLocaleDateString(
                    "en-IN",
                    {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }
                  )}
                </p>
              </div>
              <div className="bg-surface-variant/30 rounded-lg px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-outline font-medium">
                  BHU Email
                </p>
                <p className="text-sm text-foreground font-medium">
                  {selectedUser.bhuEmail || "Not provisioned"}
                </p>
              </div>
              <div className="bg-surface-variant/30 rounded-lg px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-outline font-medium">
                  Department ID
                </p>
                <p className="text-sm text-foreground font-medium truncate">
                  {selectedUser.departmentId || "—"}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
