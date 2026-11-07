import React, { useState, useEffect } from 'react';
import { X, Shield, Check, Info, ChevronRight, User, Landmark, Receipt } from 'lucide-react';
import { UserRole, User as UserType } from '@/types';
import { getRoleHierarchyNumber, getRoleDisplayName } from '@/lib/utils/roles';

interface RoleAssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (userId: string, roles: UserRole[], templeId?: string, centerId?: string, canViewAllDonations?: boolean) => Promise<void>;
    user: UserType | null;
    currentUserRoles: UserRole[];
    temples: any[];
}

// Grouped roles for better organization
const ROLE_GROUPS: { category: string; description: string; roles: UserRole[] }[] = [
    {
        category: 'Executive Leadership',
        description: 'Top-level strategic roles with improved view access.',
        roles: [
            'oc', 'acting_manager', 'project_manager', 'project_advisor',
            'central_voice_manager', 'director', 'managing_director',
            'youth_preacher', 'president', 'vice_president'
        ]
    },
    {
        category: 'Administration',
        description: 'System and Zone management.',
        roles: ['super_admin', 'zonal_admin', 'state_admin', 'city_admin']
    },
    {
        category: 'Field Operations',
        description: 'Center and Counselor management.',
        roles: ['bc_voice_manager', 'voice_manager', 'counselor', 'student']
    }
];

const roleDescriptions: Record<string, string> = {
    oc: 'Operating Committee Member',
    acting_manager: 'Can add OC & ROYAL Members',
    project_manager: 'View access only',
    project_advisor: 'View access only',
    central_voice_manager: 'Can add Centers & Counselors',
    director: 'View access only',
    managing_director: 'View access only',
    youth_preacher: 'Youth Preacher (Same as MD)',
    president: "Bird's eye view of organization",
    vice_president: "Bird's eye view of organization",
    super_admin: 'Full system access',
    zonal_admin: 'Manage specific zones',
    state_admin: 'Manage specific states',
    city_admin: 'Manage specific cities',
    bc_voice_manager: 'Manage center operations',
    voice_manager: 'Senior Counselor / Team Lead',
    counselor: 'Manage students/devotees',
    student: 'Standard user access'
};

export default function RoleAssignmentModal({
    isOpen,
    onClose,
    onSave,
    user,
    currentUserRoles,
    temples
}: RoleAssignmentModalProps) {
    const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([]);
    const [selectedTempleId, setSelectedTempleId] = useState<string>('');
    const [canViewAllDonations, setCanViewAllDonations] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (user) {
            const roles = Array.isArray(user.role) ? user.role : [user.role];
            setSelectedRoles(roles);
            setCanViewAllDonations(Boolean(
                user.canViewAllDonations || 
                (user as any).can_view_all_donations || 
                user.hierarchy?.canViewAllDonations || 
                user.hierarchy?.can_view_all_donations
            ));

            // Check if user is already assigned to a temple
            const assignedTemple = temples.find(t =>
                t.managing_director_id === user.id ||
                t.director_id === user.id ||
                t.central_voice_manager_id === user.id ||
                t.yp_id === user.id
            );
            if (assignedTemple) {
                setSelectedTempleId(assignedTemple.id);
            } else {
                setSelectedTempleId('');
            }
        }
    }, [user, temples]);

    if (!isOpen || !user) return null;

    const toggleRole = (role: UserRole) => {
        setSelectedRoles(prev => {
            const isSelected = prev.some(r => getRoleHierarchyNumber(r) === getRoleHierarchyNumber(role));
            if (isSelected) {
                return prev.filter(r => getRoleHierarchyNumber(r) !== getRoleHierarchyNumber(role));
            } else {
                return [...prev, role];
            }
        });
    };

    const handleConfirmSave = async () => {
        setIsSaving(true);
        try {
            let finalRoles = [...selectedRoles];
            if (finalRoles.length === 0) finalRoles = ['student'];
            await onSave(user.id, finalRoles, selectedTempleId || undefined, undefined, canViewAllDonations);
            onClose();
        } catch (error) {
            console.error('Failed to save roles', error);
        } finally {
            setIsSaving(false);
        }
    };

    const hasAdminRole = selectedRoles.some(r => [11, 12, 13, 21].includes(getRoleHierarchyNumber(r)));

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative bg-white rounded-[2.5rem] w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden transition-all scale-in-center animate-in zoom-in-95 duration-200" style={{ maxHeight: '90vh' }}>
                {/* Header - Fixed */}
                <div className="flex items-center justify-between p-6 md:p-8 border-b border-gray-100 flex-shrink-0">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 md:w-14 md:h-14 bg-orange-50 rounded-2xl flex items-center justify-center border border-orange-100 shadow-sm flex-shrink-0">
                            <Shield className="w-6 h-6 md:w-7 md:h-7 text-orange-600" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-xl md:text-2xl font-bold font-display text-gray-900 tracking-tight truncate">Assign Roles</h2>
                            <p className="text-gray-500 font-medium flex items-center gap-2 mt-1 text-sm overflow-hidden">
                                <span className="truncate">For</span>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-bold ring-1 ring-gray-200 truncate max-w-[150px]">
                                    <User className="w-3 h-3 flex-shrink-0" />
                                    {user.name}
                                </span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 md:p-3 hover:bg-gray-100 rounded-2xl transition-all duration-200 group active:scale-95"
                    >
                        <X className="w-5 h-5 md:w-6 md:h-6 text-gray-400 group-hover:text-gray-900" />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto px-6 md:px-8 py-6 space-y-10 custom-scrollbar overscroll-contain">
                    {/* Temple Selection Integration - TOP Positioned */}
                    {hasAdminRole && (
                        <div className="animate-in slide-in-from-top-4 duration-300">
                            <div className="bg-gradient-to-br from-orange-50/50 to-amber-50/50 rounded-3xl p-5 md:p-6 border border-orange-100/50 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-500">
                                    <Landmark className="w-16 h-16 md:w-20 md:h-20 text-orange-900" />
                                </div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-9 h-9 bg-white text-orange-600 rounded-xl flex items-center justify-center shadow-sm border border-orange-50 flex-shrink-0">
                                            <Landmark className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] md:text-xs font-black text-gray-900 uppercase tracking-widest leading-none">Target Temple Assignment</h4>
                                            <p className="text-[10px] text-gray-400 font-medium mt-1">Assignment is required for admin roles.</p>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <select
                                            value={selectedTempleId}
                                            onChange={(e) => setSelectedTempleId(e.target.value)}
                                            className="w-full p-3 md:p-3.5 bg-white border border-orange-100 rounded-xl md:rounded-2xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none font-bold text-sm text-gray-700 transition-all cursor-pointer shadow-sm appearance-none pr-10"
                                            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23ea580c\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\' /%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1rem' }}
                                        >
                                            <option value="">Select a Temple...</option>
                                            {temples.map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {!selectedTempleId && (
                                        <div className="mt-2 flex items-center gap-1.5 text-[9px] font-bold text-amber-600">
                                            <Info className="w-3 h-3 flex-shrink-0" />
                                            Please select a temple to complete the assignment
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="h-px bg-gradient-to-r from-transparent via-gray-100 to-transparent mt-8" />
                        </div>
                    )}

                    {ROLE_GROUPS.map((group) => (
                        <div key={group.category} className="space-y-4">
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-[10px] md:text-xs font-black text-gray-900 border-b-2 border-orange-200 pb-0.5 uppercase tracking-widest leading-none">{group.category}</h3>
                                    <div className="h-px flex-1 bg-gradient-to-r from-gray-100/50 to-transparent" />
                                </div>
                                <p className="text-[10px] font-medium text-gray-400 italic leading-none">{group.description}</p>
                            </div>

                            <div className="flex flex-wrap gap-2.5">
                                {group.roles.map((role) => {
                                    const isSelected = selectedRoles.some(r => getRoleHierarchyNumber(role) === getRoleHierarchyNumber(r));

                                    return (
                                        <button
                                            key={role as string}
                                            onClick={() => toggleRole(role)}
                                            className={`px-4 py-2.5 rounded-xl text-left border transition-all duration-300 relative group flex items-center gap-2.5
                                                ${isSelected
                                                    ? 'bg-gray-900 border-gray-900 shadow-md ring-4 ring-gray-900/5'
                                                    : 'bg-white border-gray-100 hover:border-orange-200 hover:bg-orange-50/10'
                                                }`}
                                        >
                                            {isSelected && (
                                                <div className="w-3.5 h-3.5 bg-orange-500 rounded-full flex items-center justify-center shadow-lg animate-in fade-in scale-in duration-300 flex-shrink-0">
                                                    <Check className="w-2.5 h-2.5 text-white stroke-[4px]" />
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <span className={`font-bold text-[11px] md:text-xs tracking-tight block whitespace-nowrap ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                                                    {getRoleDisplayName(role)}
                                                </span>
                                            </div>

                                            {/* Hover tooltip for description */}
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-gray-900 text-white text-[9px] font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-50 shadow-xl border border-white/10 hidden md:block">
                                                {roleDescriptions[role as string]}
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {/* Special Financial View Privileges */}
                    <div className="pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-2.5">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Receipt className="w-3.5 h-3.5 text-amber-600" />
                                Special Financial Permissions
                            </h3>
                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                                Optional
                            </span>
                        </div>
                        <label className="flex items-start gap-3 p-3.5 bg-amber-50/70 hover:bg-amber-50 border border-amber-200/90 rounded-2xl cursor-pointer transition-colors shadow-xs">
                            <input
                                type="checkbox"
                                checked={canViewAllDonations}
                                onChange={e => setCanViewAllDonations(e.target.checked)}
                                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 accent-amber-600"
                            />
                            <div>
                                <span className="text-xs font-bold text-gray-900 block">All Donation Logs (View-Only Access)</span>
                                <span className="text-[11px] text-gray-600 leading-relaxed block mt-0.5">
                                    Allows this user to access the full donation logs page to view all temple collections and behalf devotee names without giving them gateway or user management access.
                                </span>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Footer - Fixed */}
                <div className="p-6 md:p-8 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 flex-shrink-0">
                    <div className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-gray-400 order-2 sm:order-1">
                        <Info className="w-3.5 h-3.5 md:w-4 md:h-4 text-orange-400" />
                        <span>Changes will take effect immediately</span>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto order-1 sm:order-2">
                        <button
                            onClick={onClose}
                            className="flex-1 sm:flex-none px-6 py-3 text-xs md:text-sm font-bold text-gray-500 hover:text-gray-900 transition-all active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirmSave}
                            disabled={isSaving || (hasAdminRole && !selectedTempleId)}
                            className="flex-1 sm:flex-none px-8 md:px-10 py-3 md:py-3.5 bg-orange-600 text-white rounded-xl md:rounded-2xl text-xs md:text-sm font-black shadow-xl shadow-orange-600/20 hover:shadow-orange-600/30 hover:bg-orange-700 active:scale-95 disabled:opacity-50 disabled:grayscale transition-all flex items-center justify-center gap-3 group"
                        >
                            {isSaving ? (
                                <div className="w-4 h-4 md:w-5 md:h-5 border-2 md:border-3 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    Save Changes
                                    <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
