"use client";

import React, { useState, useEffect } from "react";
import api from "@/lib/axios";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import { useToastStore } from "@/components/Toast";
import DepartmentSelect from "@/components/DepartmentSelect";

interface Official {
  id: string;
  firstName: string;
  lastName: string;
  bhuEmail: string;
  alternateEmail: string;
  role: "HOD" | "DEAN";
  departmentId: string | null;
  roleExpiryDate: string;
}

export default function ManageHodsAndDeansPage() {
  const { addToast } = useToastStore();
  const [officials, setOfficials] = useState<Official[]>([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<{ id: string; name: string; code: string }[]>([]);

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModal, setEditModal] = useState<Official | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    designationEmail: "",
    personalEmail: "",
    role: "HOD",
    departmentId: "",
    roleExpiryDate: "",
  });

  const fetchOfficials = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/v1/admin/users/hod-dean");
      setOfficials(Array.isArray(data) ? data : data?.data || []);
    } catch (err) {
      console.error(err);
      addToast({ message: "Failed to load officials.", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data } = await api.get("/departments");
      setDepartments(data.success ? data.data : data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOfficials();
    fetchDepartments();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.post("/api/v1/admin/users/hod-dean", formData);
      addToast({ message: "Official provisioned successfully. Welcome email sent.", variant: "success" });
      setAddModalOpen(false);
      setFormData({ firstName: "", lastName: "", designationEmail: "", personalEmail: "", role: "HOD", departmentId: "", roleExpiryDate: "" });
      fetchOfficials();
    } catch (err: any) {
      addToast({ message: err.response?.data?.message || "Failed to provision official.", variant: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal) return;
    setActionLoading(true);
    try {
      await api.patch(`/api/v1/admin/users/hod-dean/${editModal.id}`, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        personalEmail: formData.personalEmail,
        roleExpiryDate: formData.roleExpiryDate,
      });
      addToast({ message: "Official details updated.", variant: "success" });
      setEditModal(null);
      fetchOfficials();
    } catch (err: any) {
      addToast({ message: err.response?.data?.message || "Failed to update details.", variant: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (id: string) => {
    if (!confirm("Are you sure you want to send a new password reset link to their personal email?")) return;
    
    try {
      await api.post(`/api/v1/admin/users/hod-dean/${id}/reset-password`);
      addToast({ message: "Password reset link sent to personal email.", variant: "success" });
    } catch (err: any) {
      addToast({ message: err.response?.data?.message || "Failed to send reset link.", variant: "error" });
    }
  };

  const openEditModal = (off: Official) => {
    setFormData({
      firstName: off.firstName,
      lastName: off.lastName,
      designationEmail: off.bhuEmail,
      personalEmail: off.alternateEmail,
      role: off.role,
      departmentId: off.departmentId || "",
      roleExpiryDate: off.roleExpiryDate ? new Date(off.roleExpiryDate).toISOString().split('T')[0] : "",
    });
    setEditModal(off);
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <a href="/dashboard/admin" className="text-sm text-outline hover:text-primary flex items-center gap-1 mb-2">
            <span className="material-symbols-rounded text-[18px]">arrow_back</span>
            Back to Dashboard
          </a>
          <h1 className="text-2xl lg:text-[32px] font-bold text-amber-800" style={{ fontFamily: "var(--font-serif)" }}>
            Manage HODs & Deans
          </h1>
          <p className="text-sm text-amber-600 mt-1">Provision and manage official accounts</p>
        </div>
        <Button icon="add" variant="filled" onClick={() => {
          setFormData({ firstName: "", lastName: "", designationEmail: "", personalEmail: "", role: "HOD", departmentId: "", roleExpiryDate: "" });
          setAddModalOpen(true);
        }}>
          Provision New Official
        </Button>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-outline">Loading...</div>
        ) : officials.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 rounded-full bg-surface-variant flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-rounded text-[32px] text-outline">person_off</span>
            </div>
            <h3 className="text-lg font-bold text-foreground">No officials found</h3>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-surface-variant/50 text-outline text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Designation Email</th>
                  <th className="px-4 py-3 font-semibold">Personal Email</th>
                  <th className="px-4 py-3 font-semibold">Department</th>
                  <th className="px-4 py-3 font-semibold">Tenure Expiry</th>
                  <th className="px-4 py-3 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {officials.map((off) => {
                  const dept = departments.find(d => d.id === off.departmentId)?.name || "—";
                  return (
                    <tr key={off.id} className="border-t border-outline-variant hover:bg-surface-variant/20">
                      <td className="px-4 py-3 align-middle">
                        <span className={`px-2 py-1 rounded-md text-xs font-bold ${off.role === 'HOD' ? 'bg-secondary-container text-secondary' : 'bg-amber-100 text-amber-800'}`}>
                          {off.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium align-middle">{off.firstName} {off.lastName}</td>
                      <td className="px-4 py-3 text-primary font-medium align-middle">{off.bhuEmail}</td>
                      <td className="px-4 py-3 text-outline align-middle">{off.alternateEmail}</td>
                      <td className="px-4 py-3 text-outline align-middle text-sm">{dept}</td>
                      <td className="px-4 py-3 text-outline align-middle text-sm">
                        {off.roleExpiryDate ? new Date(off.roleExpiryDate).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-center align-middle">
                        <div className="flex items-center justify-center gap-2">
                          <Button icon="edit" variant="outlined" size="sm" onClick={() => openEditModal(off)}>Edit</Button>
                          <Button icon="lock_reset" variant="outlined" size="sm" onClick={() => handleResetPassword(off.id)}>Reset Password</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      <Modal isOpen={addModalOpen} onClose={() => !actionLoading && setAddModalOpen(false)} title="Provision New Official">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">First Name</label>
              <input required type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Last Name</label>
              <input required type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Role</label>
              <select required value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30">
                <option value="HOD">Head of Department (HOD)</option>
                <option value="DEAN">Dean</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Department</label>
              <DepartmentSelect departments={departments} value={formData.departmentId} onChange={(val) => setFormData({ ...formData, departmentId: val })} required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Designation Email (e.g. hod.cs@bhu.ac.in)</label>
            <input required type="email" value={formData.designationEmail} onChange={(e) => setFormData({ ...formData, designationEmail: e.target.value })} className="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30" />
            <p className="text-xs text-outline mt-1">This email will be provisioned in Google Workspace with a 20GB quota.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Personal Email (e.g. current personal bhu.ac.in or gmail.com)</label>
            <input required type="email" value={formData.personalEmail} onChange={(e) => setFormData({ ...formData, personalEmail: e.target.value })} className="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30" />
            <p className="text-xs text-outline mt-1">Welcome email and password reset links will be sent here.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Tenure Expiry Date</label>
            <input required type="date" value={formData.roleExpiryDate} onChange={(e) => setFormData({ ...formData, roleExpiryDate: e.target.value })} className="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30" />
            <p className="text-xs text-outline mt-1">On this date, the system will automatically remove the HOD/Dean role and convert them back to Applicant.</p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant">
            <Button variant="text" onClick={() => setAddModalOpen(false)} disabled={actionLoading}>Cancel</Button>
            <Button variant="filled" type="submit" loading={actionLoading}>Provision Official</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editModal} onClose={() => !actionLoading && setEditModal(null)} title="Edit Official Details">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">First Name</label>
              <input required type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Last Name</label>
              <input required type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Personal Email</label>
            <input required type="email" value={formData.personalEmail} onChange={(e) => setFormData({ ...formData, personalEmail: e.target.value })} className="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Tenure Expiry Date</label>
            <input required type="date" value={formData.roleExpiryDate} onChange={(e) => setFormData({ ...formData, roleExpiryDate: e.target.value })} className="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant">
            <Button variant="text" onClick={() => setEditModal(null)} disabled={actionLoading}>Cancel</Button>
            <Button variant="filled" type="submit" loading={actionLoading}>Save Changes</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
