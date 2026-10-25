'use client';

import React, { useState, useEffect } from 'react';
import {
  Users, Shield, Check, X, Trash2, Search, Plus,
  AlertCircle, Loader2, Sparkles, UserCheck, CheckCircle2,
  Lock, RefreshCw, ChevronRight, Building
} from 'lucide-react';
import {
  getCampAllocationsAction,
  assignCampStaffAction,
  revokeCampStaffAction,
  searchUsersForStaffAction
} from '@/app/dashboard/admin/camps/actions';
import { Camp, CampAdminAllocation } from '@/types';

interface CampStaffRoleManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  camps: Camp[];
}

export default function CampStaffRoleManagementModal({
  isOpen,
  onClose,
  camps,
}: CampStaffRoleManagementModalProps) {
  const [allocations, setAllocations] = useState<CampAdminAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state to assign staff
  const [userQuery, setUserQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  const [selectedCampId, setSelectedCampId] = useState<string>(camps[0]?.id || '');
  const [permissionType, setPermissionType] = useState<'attendance' | 'refunds' | 'both' | 'scan_pass'>('scan_pass');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Load allocations
  const loadAllocations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCampAllocationsAction();
      if (res.success && res.allocations) {
        setAllocations(res.allocations);
      } else {
        setError(res.error || 'Failed to load staff allocations.');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading allocations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAllocations();
      if (camps.length > 0 && !selectedCampId) {
        setSelectedCampId(camps[0].id);
      }
    }
  }, [isOpen]);

  // Live user search debounce
  useEffect(() => {
    const term = userQuery.trim();
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingUsers(true);
      try {
        const res = await searchUsersForStaffAction(term);
        if (res.success && res.users) {
          setSearchResults(res.users);
        }
      } catch {
        // ignore
      } finally {
        setSearchingUsers(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [userQuery]);

  // Handle assign staff
  const handleAssignStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser?.id || !selectedCampId) {
      setError('Please select both a devotee and a camp.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await assignCampStaffAction({
        userId: selectedUser.id,
        campId: selectedCampId,
        permissionType,
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        setSuccessMsg(`Successfully granted ${permissionType.toUpperCase()} access to ${selectedUser.name}!`);
        setSelectedUser(null);
        setUserQuery('');
        setNotes('');
        loadAllocations();
      } else {
        setError(res.error || 'Failed to assign staff.');
      }
    } catch (err: any) {
      setError(err.message || 'Error assigning staff.');
    } finally {
      setSaving(false);
    }
  };

  // Handle revoke staff
  const handleRevokeStaff = async (allocationId: string, devoteeName: string) => {
    if (!window.confirm(`Are you sure you want to revoke camp access for ${devoteeName}?`)) {
      return;
    }

    setRevokingId(allocationId);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await revokeCampStaffAction(allocationId);
      if (res.success) {
        setSuccessMsg(`Revoked access for ${devoteeName}.`);
        loadAllocations();
      } else {
        setError(res.error || 'Failed to revoke staff.');
      }
    } catch (err: any) {
      setError(err.message || 'Error revoking access.');
    } finally {
      setRevokingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-white tracking-tight flex items-center gap-2">
                <span>Camp Staff &amp; Role Delegations</span>
              </h3>
              <p className="text-xs text-slate-300">
                Grant volunteers &amp; coordinators access to specific camps with custom privileges
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Notifications */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* SECTION 1: ASSIGN NEW STAFF */}
          <div className="p-4 rounded-xl border border-amber-200/80 bg-amber-50/40 space-y-4">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
              <Plus className="w-4 h-4 text-amber-700" />
              <span>Assign Staff or Volunteer to Camp</span>
            </div>

            <form onSubmit={handleAssignStaff} className="space-y-4">
              {/* Step A: Select Devotee */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  1. Search Devotee / User (Name, Email, or Phone)
                </label>
                {selectedUser ? (
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-emerald-300 bg-emerald-50 text-xs">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-emerald-700" />
                      <div>
                        <span className="font-bold text-emerald-950">{selectedUser.name}</span>
                        <span className="text-emerald-700 ml-1.5 font-mono">({selectedUser.email || selectedUser.phone})</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUser(null);
                        setUserQuery('');
                      }}
                      className="text-xs font-bold text-red-600 hover:text-red-800"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={userQuery}
                      onChange={(e) => setUserQuery(e.target.value)}
                      placeholder="Type devotee name or email..."
                      className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    {searchingUsers && (
                      <Loader2 className="w-4 h-4 text-amber-600 absolute right-3 top-2.5 animate-spin" />
                    )}

                    {/* Autocomplete Dropdown */}
                    {searchResults.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {searchResults.map((u) => (
                          <div
                            key={u.id}
                            onClick={() => {
                              setSelectedUser(u);
                              setSearchResults([]);
                            }}
                            className="p-2.5 text-xs hover:bg-amber-50 cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <div>
                              <div className="font-bold text-slate-900">{u.name}</div>
                              <div className="text-[11px] text-slate-500 font-mono">{u.email || u.phone}</div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                              {u.current_center || 'Center'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Step B: Select Camp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    2. Select Camp
                  </label>
                  <select
                    value={selectedCampId}
                    onChange={(e) => setSelectedCampId(e.target.value)}
                    className="w-full py-2 px-3 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    {camps.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.venue || 'Pune'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Role Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Gate Incharge, Prasadam Volunteer"
                    className="w-full py-2 px-3 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              {/* Step C: Permission Level Pills */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  3. Select Access &amp; Permission Level
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Option 0: Pass Scanner Only (Focused single-action role) */}
                  <label
                    className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition-all ${
                      permissionType === 'scan_pass'
                        ? 'border-blue-600 bg-blue-50 text-blue-950 shadow-sm ring-1 ring-blue-600'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-black text-xs">
                      <input
                        type="radio"
                        name="permission"
                        checked={permissionType === 'scan_pass'}
                        onChange={() => setPermissionType('scan_pass')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>Pass Scanner &amp; Meal Punch Only</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      Single-action counter role. Only opens the scanner to verify passes &amp; punch meals.
                    </p>
                  </label>

                  {/* Option 1: Attendance Only */}
                  <label
                    className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition-all ${
                      permissionType === 'attendance'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-sm ring-1 ring-emerald-600'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-black text-xs">
                      <input
                        type="radio"
                        name="permission"
                        checked={permissionType === 'attendance'}
                        onChange={() => setPermissionType('attendance')}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Attendance &amp; Registrations</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      Can view attendee ledger, download Excel, scan QR passes &amp; punch meals.
                    </p>
                  </label>

                  {/* Option 2: Refunds Only */}
                  <label
                    className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition-all ${
                      permissionType === 'refunds'
                        ? 'border-purple-600 bg-purple-50 text-purple-950 shadow-sm ring-1 ring-purple-600'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-black text-xs">
                      <input
                        type="radio"
                        name="permission"
                        checked={permissionType === 'refunds'}
                        onChange={() => setPermissionType('refunds')}
                        className="text-purple-600 focus:ring-purple-500"
                      />
                      <span>Refunds Desk Only</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      Can view devotee refund requests &amp; process payout approvals.
                    </p>
                  </label>

                  {/* Option 3: Both (Full Coordinator) */}
                  <label
                    className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition-all ${
                      permissionType === 'both'
                        ? 'border-amber-600 bg-amber-50 text-amber-950 shadow-sm ring-1 ring-amber-600'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-black text-xs">
                      <input
                        type="radio"
                        name="permission"
                        checked={permissionType === 'both'}
                        onChange={() => setPermissionType('both')}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <span>Full Camp Coordinator</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      Full operational access (attendance/registrations, scanning, and refunds).
                    </p>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={saving || !selectedUser || !selectedCampId}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  <span>Grant Camp Staff Access</span>
                </button>
              </div>
            </form>
          </div>

          {/* SECTION 2: CURRENT ACTIVE ALLOCATIONS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-600" />
                <span>Active Delegated Camp Managers ({allocations.length})</span>
              </h4>
              <button
                type="button"
                onClick={loadAllocations}
                disabled={loading}
                className="text-slate-500 hover:text-slate-900 text-xs font-bold flex items-center gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {loading ? (
              <div className="py-8 flex justify-center text-slate-400 text-xs">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              </div>
            ) : allocations.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                No staff members currently delegated. Super Admins currently have master access.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {allocations.map((alloc) => (
                  <div
                    key={alloc.id}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">{alloc.user_name || 'Staff Member'}</span>
                        <span className="text-[11px] text-slate-500 font-mono">({alloc.user_email || alloc.user_phone})</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-600">
                        <span className="font-medium text-slate-800">Camp: <strong className="text-blue-900">{alloc.camp_title}</strong></span>
                        {alloc.notes && <span className="text-slate-400">• {alloc.notes}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 self-end sm:self-center">
                      {/* Permission Badge */}
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          alloc.permission_type === 'scan_pass'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : alloc.permission_type === 'attendance'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : alloc.permission_type === 'refunds'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {alloc.permission_type === 'scan_pass'
                          ? 'Pass Scanner Only'
                          : alloc.permission_type === 'attendance'
                          ? 'Attendance Only'
                          : alloc.permission_type === 'refunds'
                          ? 'Refunds Only'
                          : 'Full Coordinator'}
                      </span>

                      {/* Revoke Button */}
                      <button
                        type="button"
                        onClick={() => handleRevokeStaff(alloc.id, alloc.user_name || 'Staff')}
                        disabled={revokingId === alloc.id}
                        title="Revoke access"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        {revokingId === alloc.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
