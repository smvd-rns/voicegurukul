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
  revokeCampStaffUserAction,
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
  const [selectedPermissions, setSelectedPermissions] = useState<('attendance' | 'refunds' | 'both' | 'scan_pass' | 'prasadam' | 'payment_approvals')[]>(['attendance']);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const togglePermission = (type: 'attendance' | 'refunds' | 'both' | 'scan_pass' | 'prasadam' | 'payment_approvals') => {
    if (type === 'both') {
      if (selectedPermissions.includes('both')) {
        setSelectedPermissions(['attendance']);
      } else {
        setSelectedPermissions(['both', 'attendance', 'refunds', 'prasadam', 'scan_pass', 'payment_approvals']);
      }
      return;
    }
    setSelectedPermissions((prev) => {
      const exists = prev.includes(type);
      const next = exists ? prev.filter((p) => p !== type && p !== 'both') : [...prev, type];
      return next.length > 0 ? next : [type];
    });
  };

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

  // Sync existing user roles when selected devotee or camp changes
  useEffect(() => {
    if (selectedUser && selectedCampId) {
      const existing = allocations
        .filter((a) => a.user_id === selectedUser.id && a.camp_id === selectedCampId)
        .map((a) => a.permission_type);
      if (existing.length > 0) {
        setSelectedPermissions(existing as any);
      } else {
        setSelectedPermissions(['scan_pass']);
      }
    }
  }, [selectedUser, selectedCampId, allocations]);

  // Handle assign staff (supports multi-role selection without overwriting)
  const handleAssignStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser?.id || !selectedCampId) {
      setError('Please select both a devotee and a camp.');
      return;
    }

    if (selectedPermissions.length === 0) {
      setError('Please select at least one access permission role.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await assignCampStaffAction({
        userId: selectedUser.id,
        campId: selectedCampId,
        permissionTypes: selectedPermissions,
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        setSuccessMsg(`Successfully granted ${selectedPermissions.map(p => p.toUpperCase()).join(' & ')} access to ${selectedUser.name}!`);
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

  // Handle revoke ALL roles for user in camp
  const handleRevokeAllUserCampAccess = async (userId: string, campId: string, devoteeName: string, campTitle: string) => {
    if (!window.confirm(`Are you sure you want to revoke ALL delegated access for ${devoteeName} in ${campTitle}?`)) {
      return;
    }

    const key = `${userId}_${campId}`;
    setRevokingId(key);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await revokeCampStaffUserAction(userId, campId);
      if (res.success) {
        setSuccessMsg(`Revoked all camp permissions for ${devoteeName}.`);
        loadAllocations();
      } else {
        setError(res.error || 'Failed to revoke permissions.');
      }
    } catch (err: any) {
      setError(err.message || 'Error revoking access.');
    } finally {
      setRevokingId(null);
    }
  };

  // Group allocations by user and camp so one devotee has all their roles together
  const groupedStaff = React.useMemo(() => {
    const userMap = new Map<
      string,
      {
        user_id: string;
        user_name: string;
        user_email: string;
        user_phone: string;
        camps: Map<
          string,
          {
            camp_id: string;
            camp_title: string;
            notes?: string;
            roles: {
              id: string;
              permission_type: string;
            }[];
          }
        >;
      }
    >();

    for (const alloc of allocations) {
      if (!userMap.has(alloc.user_id)) {
        userMap.set(alloc.user_id, {
          user_id: alloc.user_id,
          user_name: alloc.user_name || 'Staff Member',
          user_email: alloc.user_email || '',
          user_phone: alloc.user_phone || '',
          camps: new Map(),
        });
      }

      const u = userMap.get(alloc.user_id)!;
      if (!u.camps.has(alloc.camp_id)) {
        u.camps.set(alloc.camp_id, {
          camp_id: alloc.camp_id,
          camp_title: alloc.camp_title || 'Camp',
          notes: alloc.notes,
          roles: [],
        });
      }

      const c = u.camps.get(alloc.camp_id)!;
      // Deduplicate identical permission types
      if (!c.roles.some((r) => r.permission_type === alloc.permission_type)) {
        c.roles.push({
          id: alloc.id,
          permission_type: alloc.permission_type,
        });
      }
    }

    return Array.from(userMap.values()).map((u) => ({
      ...u,
      camps: Array.from(u.camps.values()),
    }));
  }, [allocations]);

  const getRoleBadgeConfig = (permissionType: string) => {
    switch (permissionType) {
      case 'scan_pass':
        return {
          label: 'Pass Scanner Only',
          bg: 'bg-blue-50',
          text: 'text-blue-800',
          border: 'border-blue-200',
        };
      case 'attendance':
        return {
          label: 'Attendance Only',
          bg: 'bg-emerald-50',
          text: 'text-emerald-800',
          border: 'border-emerald-200',
        };
      case 'prasadam':
        return {
          label: 'Prasadam Desk Only',
          bg: 'bg-orange-50',
          text: 'text-orange-900',
          border: 'border-orange-200',
        };
      case 'refunds':
        return {
          label: 'Refunds Desk Only',
          bg: 'bg-purple-50',
          text: 'text-purple-800',
          border: 'border-purple-200',
        };
      case 'payment_approvals':
        return {
          label: 'Payment Approvals Only',
          bg: 'bg-teal-50',
          text: 'text-teal-900',
          border: 'border-teal-200',
        };
      case 'both':
      default:
        return {
          label: 'Full Coordinator',
          bg: 'bg-amber-50',
          text: 'text-amber-800',
          border: 'border-amber-200',
        };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[96vh] sm:max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white border-b border-slate-700 gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 sm:w-10 h-9 sm:h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-sm sm:text-base text-white tracking-tight truncate">
                <span>Camp Staff &amp; Role Delegations</span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-300 truncate">
                Grant volunteers &amp; coordinators access to specific camps with custom privileges
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-3.5 sm:p-6 overflow-y-auto flex-1 space-y-4 sm:space-y-6">
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

              {/* Step C: Permission Level Pills (Multi-Role Allowed) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    3. Select Access &amp; Permission Levels (Assign 1 or Many Roles)
                  </label>
                  <span className="text-[10px] text-amber-800 font-black bg-amber-100/70 px-2 py-0.5 rounded-full border border-amber-300">
                    {selectedPermissions.includes('both') ? 'All Roles (Full Access)' : `${selectedPermissions.length} Role(s) Selected`}
                  </span>
                </div>

                {selectedUser && (
                  <div className="mb-2 text-[11px] bg-amber-50/80 border border-amber-200 text-amber-900 rounded-lg p-2 flex items-center justify-between">
                    <span>
                      Current roles for this camp: <strong>{allocations.filter(a => a.user_id === selectedUser.id && a.camp_id === selectedCampId).map(a => a.permission_type.toUpperCase()).join(', ') || 'None yet'}</strong>
                    </span>
                    <span className="text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                      Multi-Role Ready
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Option 0: Pass Scanner Only */}
                  <div
                    onClick={() => togglePermission('scan_pass')}
                    className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition-all select-none ${
                      selectedPermissions.includes('scan_pass') || selectedPermissions.includes('both')
                        ? 'border-blue-600 bg-blue-50 text-blue-950 shadow-sm ring-1 ring-blue-600'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-black text-xs">
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes('scan_pass') || selectedPermissions.includes('both')}
                        onChange={() => {}}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer pointer-events-none"
                      />
                      <span>Pass Scanner &amp; Meal Punch</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      Single-action counter role. Only opens scanner to verify passes &amp; punch meals.
                    </p>
                  </div>

                  {/* Option 1: Attendance & Registrations */}
                  <div
                    onClick={() => togglePermission('attendance')}
                    className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition-all select-none ${
                      selectedPermissions.includes('attendance') || selectedPermissions.includes('both')
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-sm ring-1 ring-emerald-600'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-black text-xs">
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes('attendance') || selectedPermissions.includes('both')}
                        onChange={() => {}}
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer pointer-events-none"
                      />
                      <span>Attendance &amp; Registrations</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      Can view attendee ledger, download Excel, scan passes &amp; coordinate check-ins.
                    </p>
                  </div>

                  {/* Option 2: Prasadam & Kitchen Tally */}
                  <div
                    onClick={() => togglePermission('prasadam')}
                    className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition-all select-none ${
                      selectedPermissions.includes('prasadam') || selectedPermissions.includes('both')
                        ? 'border-orange-600 bg-orange-50 text-orange-950 shadow-sm ring-1 ring-orange-600'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-black text-xs">
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes('prasadam') || selectedPermissions.includes('both')}
                        onChange={() => {}}
                        className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 cursor-pointer pointer-events-none"
                      />
                      <span>Prasadam Logs &amp; Kitchen Tally</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      Kitchen desk. View live meal matrix tallies, consumption counts per slot, and scan passes.
                    </p>
                  </div>

                  {/* Option 3: Refunds Desk */}
                  <div
                    onClick={() => togglePermission('refunds')}
                    className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition-all select-none ${
                      selectedPermissions.includes('refunds') || selectedPermissions.includes('both')
                        ? 'border-purple-600 bg-purple-50 text-purple-950 shadow-sm ring-1 ring-purple-600'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-black text-xs">
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes('refunds') || selectedPermissions.includes('both')}
                        onChange={() => {}}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 cursor-pointer pointer-events-none"
                      />
                      <span>Refunds Desk Only</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      Can view devotee refund requests &amp; process payout approvals.
                    </p>
                  </div>

                  {/* Option 4: IDT & ITT Payment Approvals */}
                  <div
                    onClick={() => togglePermission('payment_approvals')}
                    className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition-all select-none ${
                      selectedPermissions.includes('payment_approvals') || selectedPermissions.includes('both')
                        ? 'border-teal-600 bg-teal-50 text-teal-950 shadow-sm ring-1 ring-teal-600'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-black text-xs">
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes('payment_approvals') || selectedPermissions.includes('both')}
                        onChange={() => {}}
                        className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500 cursor-pointer pointer-events-none"
                      />
                      <span>IDT &amp; ITT Payment Approvals</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      Payment desk. Cross-verify IDT passcodes and bank UTRs to approve pending transfer payments.
                    </p>
                  </div>

                  {/* Option 5: Full Camp Coordinator */}
                  <div
                    onClick={() => togglePermission('both')}
                    className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition-all select-none sm:col-span-2 ${
                      selectedPermissions.includes('both')
                        ? 'border-amber-600 bg-amber-50 text-amber-950 shadow-sm ring-1 ring-amber-600'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-black text-xs">
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes('both')}
                        onChange={() => {}}
                        className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 cursor-pointer pointer-events-none"
                      />
                      <span>Full Camp Coordinator (All Desks Access)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      Full operational access across pass scanning, attendance ledger, prasadam kitchen, refunds, and IDT/ITT payment approvals.
                    </p>
                  </div>
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
            ) : groupedStaff.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                No staff members currently delegated. Super Admins currently have master access.
              </div>
            ) : (
              <div className="space-y-3">
                {groupedStaff.map((staff) => (
                  <div
                    key={staff.user_id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all space-y-3"
                  >
                    {/* Devotee Header */}
                    <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                          {staff.user_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h5 className="font-black text-xs sm:text-sm text-slate-900 truncate">
                            {staff.user_name}
                          </h5>
                          <p className="text-[11px] text-slate-500 font-mono truncate">
                            {staff.user_email || staff.user_phone || 'No contact provided'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUser({
                            id: staff.user_id,
                            name: staff.user_name,
                            email: staff.user_email,
                            phone: staff.user_phone,
                          });
                          setUserQuery(staff.user_name);
                          const modalScroll = document.querySelector('.overflow-y-auto');
                          modalScroll?.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-[11px] font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                        title="Add or edit roles for this devotee"
                      >
                        <Plus className="w-3 h-3 text-amber-700" />
                        <span>Add Role</span>
                      </button>
                    </div>

                    {/* Camps & Roles Assigned */}
                    <div className="space-y-2.5">
                      {staff.camps.map((camp) => (
                        <div
                          key={camp.camp_id}
                          className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-[11px] font-bold text-slate-500">Camp:</span>
                              <span className="font-black text-xs text-blue-900 truncate">
                                {camp.camp_title}
                              </span>
                              {camp.notes && (
                                <span className="text-[10px] text-slate-400 truncate hidden sm:inline">
                                  • {camp.notes}
                                </span>
                              )}
                            </div>

                            {/* Revoke All roles for this camp */}
                            <button
                              type="button"
                              onClick={() => handleRevokeAllUserCampAccess(staff.user_id, camp.camp_id, staff.user_name, camp.camp_title)}
                              disabled={revokingId === `${staff.user_id}_${camp.camp_id}`}
                              title={`Revoke all roles for ${staff.user_name} in ${camp.camp_title}`}
                              className="text-[10px] text-rose-600 hover:text-rose-800 font-bold hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                            >
                              {revokingId === `${staff.user_id}_${camp.camp_id}` ? (
                                <Loader2 className="w-3 h-3 animate-spin text-rose-600" />
                              ) : (
                                <Trash2 className="w-3 h-3 text-rose-500" />
                              )}
                              <span>Revoke All</span>
                            </button>
                          </div>

                          {/* List of Role Badges */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {camp.roles.map((r) => {
                              const config = getRoleBadgeConfig(r.permission_type);
                              return (
                                <span
                                  key={r.id}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${config.bg} ${config.text} ${config.border}`}
                                >
                                  <span>{config.label}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRevokeStaff(r.id, `${staff.user_name} (${config.label})`)}
                                    disabled={revokingId === r.id}
                                    title={`Remove ${config.label}`}
                                    className="hover:opacity-75 cursor-pointer ml-0.5 rounded-full p-0.5 hover:bg-black/10 transition-colors"
                                  >
                                    {revokingId === r.id ? (
                                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                    ) : (
                                      <X className="w-2.5 h-2.5 stroke-[3]" />
                                    )}
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      ))}
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
