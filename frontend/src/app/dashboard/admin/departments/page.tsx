"use client";

import React, { useState, useEffect } from "react";
import api from "@/lib/axios";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import { useToastStore } from "@/components/Toast";

interface Department {
  id: string;
  name: string;
  code: string;
}

interface DepartmentRequest {
  id: string;
  applicantId: string;
  requestedName: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  applicant?: {
    firstName: string;
    lastName: string;
    alternateEmail: string;
  };
}

export default function ManageDepartmentsPage() {
  const { addToast } = useToastStore();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [requests, setRequests] = useState<DepartmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"list" | "requests">("list");

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModal, setEditModal] = useState<Department | null>(null);
  const [approveModal, setApproveModal] = useState<DepartmentRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({ name: "", code: "" });
  const [approveData, setApproveData] = useState({ code: "", remarks: "" });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [deptRes, reqRes] = await Promise.all([
        api.get("/departments"),
        api.get("/departments/requests")
      ]);
      setDepartments(deptRes.data.success ? deptRes.data.data : deptRes.data);
      setRequests(reqRes.data.success ? reqRes.data.data : reqRes.data);
    } catch (err) {
      console.error(err);
      addToast({ message: "Failed to load departments data.", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.post("/departments/admin", formData);
      addToast({ message: "Department created successfully.", variant: "success" });
      setAddModalOpen(false);
      setFormData({ name: "", code: "" });
      fetchData();
    } catch (err: any) {
      addToast({ message: err.response?.data?.message || "Failed to create department.", variant: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal) return;
    setActionLoading(true);
    try {
      await api.patch(`/departments/admin/${editModal.id}`, formData);
      addToast({ message: "Department updated successfully.", variant: "success" });
      setEditModal(null);
      fetchData();
    } catch (err: any) {
      addToast({ message: err.response?.data?.message || "Failed to update department.", variant: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivate = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to deactivate the department "${name}"? It will no longer appear in dropdowns.`)) return;
    try {
      await api.patch(`/departments/admin/${id}/deactivate`);
      addToast({ message: "Department deactivated.", variant: "success" });
      fetchData();
    } catch (err: any) {
      addToast({ message: err.response?.data?.message || "Failed to deactivate.", variant: "error" });
    }
  };

  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approveModal) return;
    setActionLoading(true);
    try {
      await api.patch(`/departments/requests/${approveModal.id}/approve`, approveData);
      addToast({ message: "Department approved and created.", variant: "success" });
      setApproveModal(null);
      fetchData();
    } catch (err: any) {
      addToast({ message: err.response?.data?.message || "Failed to approve request.", variant: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Are you sure you want to reject this department request?")) return;
    try {
      await api.patch(`/departments/requests/${id}/reject`, { remarks: "Rejected by admin" });
      addToast({ message: "Request rejected.", variant: "success" });
      fetchData();
    } catch (err: any) {
      addToast({ message: err.response?.data?.message || "Failed to reject request.", variant: "error" });
    }
  };

  const openEditModal = (dept: Department) => {
    setFormData({ name: dept.name, code: dept.code });
    setEditModal(dept);
  };

  const openApproveModal = (req: DepartmentRequest) => {
    setApproveData({ code: req.requestedName.substring(0, 5).toUpperCase(), remarks: "" });
    setApproveModal(req);
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
            Manage Departments
          </h1>
          <p className="text-sm text-amber-600 mt-1">Add, edit, and approve university departments</p>
        </div>
        <Button icon="add" variant="filled" onClick={() => {
          setFormData({ name: "", code: "" });
          setAddModalOpen(true);
        }}>
          Add Department
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant">
        <button
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "list" ? "border-primary text-primary" : "border-transparent text-outline hover:text-foreground"}`}
          onClick={() => setActiveTab("list")}
        >
          Departments List ({departments.length})
        </button>
        <button
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === "requests" ? "border-primary text-primary" : "border-transparent text-outline hover:text-foreground"}`}
          onClick={() => setActiveTab("requests")}
        >
          Pending Requests
          {requests.length > 0 && (
            <span className="bg-error text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{requests.length}</span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-outline">Loading...</div>
        ) : activeTab === "list" ? (
          departments.length === 0 ? (
            <div className="p-16 text-center">
              <span className="material-symbols-rounded text-[32px] text-outline mb-4">apartment</span>
              <h3 className="text-lg font-bold text-foreground">No departments found</h3>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-surface-variant/50 text-outline text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 font-semibold">Code</th>
                    <th className="px-4 py-3 font-semibold">Department Name</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept) => (
                    <tr key={dept.id} className="border-t border-outline-variant hover:bg-surface-variant/20">
                      <td className="px-4 py-3 font-mono text-sm align-middle">{dept.code}</td>
                      <td className="px-4 py-3 font-medium align-middle">{dept.name}</td>
                      <td className="px-4 py-3 text-right align-middle">
                        <div className="flex items-center justify-end gap-2">
                          <Button icon="edit" variant="text" size="sm" onClick={() => openEditModal(dept)}>Edit</Button>
                          <Button icon="block" variant="text" size="sm" className="text-error hover:bg-error-container/20" onClick={() => handleDeactivate(dept.id, dept.name)}>Deactivate</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          requests.length === 0 ? (
            <div className="p-16 text-center">
              <span className="material-symbols-rounded text-[32px] text-outline mb-4">check_circle</span>
              <h3 className="text-lg font-bold text-foreground">No pending requests</h3>
              <p className="text-sm text-outline mt-1">All custom department requests have been processed.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-surface-variant/50 text-outline text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Requested Name</th>
                    <th className="px-4 py-3 font-semibold">Applicant</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr key={req.id} className="border-t border-outline-variant hover:bg-surface-variant/20">
                      <td className="px-4 py-3 text-sm text-outline align-middle">{new Date(req.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-medium align-middle text-primary">{req.requestedName}</td>
                      <td className="px-4 py-3 text-sm align-middle">
                        {req.applicant ? `${req.applicant.firstName} ${req.applicant.lastName} (${req.applicant.alternateEmail})` : "Unknown"}
                      </td>
                      <td className="px-4 py-3 text-right align-middle">
                        <div className="flex items-center justify-end gap-2">
                          <Button icon="check" variant="filled" size="sm" className="bg-success hover:bg-success/90 text-white" onClick={() => openApproveModal(req)}>Approve</Button>
                          <Button icon="close" variant="text" size="sm" className="text-error hover:bg-error-container/20" onClick={() => handleReject(req.id)}>Reject</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Add Modal */}
      <Modal isOpen={addModalOpen} onClose={() => !actionLoading && setAddModalOpen(false)} title="Add Department">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Department Name</label>
            <input required type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Computer Science" className="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Department Code</label>
            <input required type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="e.g. CS" className="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 uppercase" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant">
            <Button variant="text" onClick={() => setAddModalOpen(false)} disabled={actionLoading}>Cancel</Button>
            <Button variant="filled" type="submit" loading={actionLoading}>Add Department</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editModal} onClose={() => !actionLoading && setEditModal(null)} title="Edit Department">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Department Name</label>
            <input required type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Department Code</label>
            <input required type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 uppercase" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant">
            <Button variant="text" onClick={() => setEditModal(null)} disabled={actionLoading}>Cancel</Button>
            <Button variant="filled" type="submit" loading={actionLoading}>Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* Approve Request Modal */}
      <Modal isOpen={!!approveModal} onClose={() => !actionLoading && setApproveModal(null)} title="Approve Department Request">
        <form onSubmit={handleApproveSubmit} className="space-y-4">
          <div className="p-3 bg-surface-variant/30 rounded-lg">
            <p className="text-xs text-outline mb-1">Requested Name:</p>
            <p className="text-sm font-bold text-foreground">{approveModal?.requestedName}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Assign Department Code *</label>
            <input required type="text" value={approveData.code} onChange={(e) => setApproveData({ ...approveData, code: e.target.value.toUpperCase() })} placeholder="e.g. NEW_DEPT" className="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 uppercase" />
            <p className="text-xs text-outline mt-1">Every department needs a unique short code.</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Admin Remarks (Optional)</label>
            <input type="text" value={approveData.remarks} onChange={(e) => setApproveData({ ...approveData, remarks: e.target.value })} placeholder="Any internal notes" className="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant">
            <Button variant="text" onClick={() => setApproveModal(null)} disabled={actionLoading}>Cancel</Button>
            <Button variant="filled" type="submit" loading={actionLoading} className="bg-success hover:bg-success/90">Approve & Create</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
