import { UserRole } from '@/types';

export type RoleNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31 | 32 | 33;

// Helper function to get role hierarchy number
export const getRoleHierarchyNumber = (role: UserRole): number => {
  if (typeof role === 'number') {
    if (role === 20) return 2; // Special case for Care Giver
    return role;
  }
  // Check if it's a numeric string
  if (typeof role === 'string' && !isNaN(Number(role)) && role.trim() !== '') {
    const numRole = Number(role);
    if (numRole === 20) return 2; // Special case for Care Giver
    if ((numRole >= 1 && numRole <= 17) || numRole === 21 || (numRole >= 22 && numRole <= 33)) {
      return numRole;
    }
  }

  const hierarchy: Record<string, number> = {
    oc: 17,
    acting_manager: 16,
    project_manager: 15,
    project_advisor: 14,
    central_voice_manager: 13,
    director: 12,
    managing_director: 11,
    president: 10,
    vice_president: 9,
    super_admin: 8,
    zonal_admin: 7,
    state_admin: 6,
    city_admin: 5,
    center_admin: 4,
    bc_voice_manager: 4, // BC Voice Manager (same as center_admin)
    senior_counselor: 3,
    voice_manager: 3, // Voice Manager (same as senior_counselor)
    counselor: 2,
    care_giver: 2,
    youth_preacher: 21,
    internal_manager: 22,
    preaching_coordinator: 23,
    morning_program_in_charge: 24,
    mentor: 25,
    frontliner: 26,
    accountant: 27,
    kitchen_head: 28,
    study_in_charge: 29,
    event_admin: 30,
    grihstha_counselor: 31,
    easy_incharge: 32,
    prerna_incharge: 33,
    student: 1,
  };
  return hierarchy[role] || 1;
};

export const roleHierarchy = {
  get: (role: UserRole): number => getRoleHierarchyNumber(role),
} as any; // Using a getter-like object to handle both string and number roles

// Reverse mapping: number to role name
export const roleNumberToName: Record<RoleNumber, UserRole> = {
  17: 'oc',
  16: 'acting_manager',
  15: 'project_manager',
  14: 'project_advisor',
  13: 'central_voice_manager',
  12: 'director',
  11: 'managing_director',
  10: 'president',
  9: 'vice_president',
  8: 'super_admin',
  7: 'zonal_admin',
  6: 'state_admin',
  5: 'city_admin',
  4: 'center_admin',
  3: 'senior_counselor',
  2: 'counselor',
  20: 'care_giver',
  21: 'youth_preacher',
  22: 'internal_manager',
  23: 'preaching_coordinator',
  24: 'morning_program_in_charge',
  25: 'mentor',
  26: 'frontliner',
  27: 'accountant',
  28: 'kitchen_head',
  29: 'study_in_charge',
  30: 'event_admin',
  31: 'grihstha_counselor',
  32: 'easy_incharge',
  33: 'prerna_incharge',
  1: 'student',
};

// Convert role name(s) to number(s) for Firestore storage
export const roleToNumber = (role: UserRole | UserRole[]): RoleNumber | RoleNumber[] => {
  if (Array.isArray(role)) {
    return role.map(r => getRoleHierarchyNumber(r) as RoleNumber);
  }
  return getRoleHierarchyNumber(role) as RoleNumber;
};

// Convert role number(s) to name(s) from Firestore
export const numberToRole = (roleNumber: RoleNumber | RoleNumber[] | number | number[]): UserRole | UserRole[] => {
  // Handle both single numbers and arrays
  const numbers = Array.isArray(roleNumber) ? roleNumber : [roleNumber];
  const roles = numbers.map(num => {
    const role = roleNumberToName[num as RoleNumber];
    if (!role) {
      // Fallback: if number doesn't match, default to student (1)
      console.warn(`Invalid role number: ${num}, defaulting to student`);
      return 'student';
    }
    return role;
  });
  return Array.isArray(roleNumber) ? roles : roles[0];
};

// Helper to normalize role from Firestore (handles both old string format and new number format)
export const normalizeRoleFromFirestore = (role: any): UserRole | UserRole[] => {
  if (role === null || role === undefined) {
    return 'student';
  }

  // If it's already a string (backward compatibility)
  if (typeof role === 'string') {
    return role as UserRole;
  }

  // If it's a number or array of numbers (new format)
  if (typeof role === 'number' || (Array.isArray(role) && typeof role[0] === 'number')) {
    return numberToRole(role);
  }

  // If it's an array of strings (backward compatibility)
  if (Array.isArray(role) && typeof role[0] === 'string') {
    return role as UserRole[];
  }

  // Default fallback
  return 'student';
};

export const canAccessLevel = (userRole: UserRole | UserRole[], targetRole: UserRole): boolean => {
  const userRoles = Array.isArray(userRole) ? userRole : [userRole];
  const userMaxLevel = Math.max(...userRoles.map(role => getRoleHierarchyNumber(role)));
  return userMaxLevel >= getRoleHierarchyNumber(targetRole);
};

export const getRoleDisplayName = (role: any): string => {
  // Handle numeric roles (number or numeric string) by converting to string name first
  if (typeof role === 'number' || (typeof role === 'string' && !isNaN(Number(role)) && role.trim() !== '')) {
    const roleNum = Number(role);
    const roleName = roleNumberToName[roleNum as RoleNumber];
    role = roleName || 'student';
  }

  const displayNames: Record<string, string> = {
    oc: 'OC',
    acting_manager: 'Acting Manager',
    project_manager: 'Project Manager',
    project_advisor: 'Project Advisor',
    central_voice_manager: 'Central VOICE Manager',
    director: 'Director',
    managing_director: 'Managing Director',
    president: 'President',
    vice_president: 'Vice-President',
    super_admin: 'Super Admin',
    zonal_admin: 'Zone Manager',
    state_admin: 'State Manager',
    city_admin: 'City Manager',
    center_admin: 'BC Voice Manager',
    bc_voice_manager: 'BC Voice Manager',
    senior_counselor: 'Voice Manager',
    voice_manager: 'Voice Manager',
    counselor: 'Counselor',
    care_giver: 'Care Giver',
    youth_preacher: 'Youth Preacher',
    internal_manager: 'Internal Manager',
    preaching_coordinator: 'Preaching Coordinator',
    morning_program_in_charge: 'Morning Program In-charge',
    mentor: 'Mentor',
    frontliner: 'Frontliner',
    accountant: 'Accountant',
    kitchen_head: 'Kitchen Head',
    study_in_charge: 'Study In-charge',
    event_admin: 'Event Admin',
    grihstha_counselor: 'Grihstha Counselor',
    easy_incharge: 'Easy Incharge',
    prerna_incharge: 'Prerna Incharge',
    student: 'Student',
  };
  return displayNames[role as string] || 'Student';
};

export const getRolesDisplayNames = (roles: UserRole | UserRole[]): string => {
  const rolesArray = Array.isArray(roles) ? roles : [roles];
  return rolesArray.map(role => getRoleDisplayName(role)).join(', ');
};

export const getUserMaxRoleLevel = (roles: UserRole | UserRole[]): number => {
  const rolesArray = Array.isArray(roles) ? roles : [roles];
  return Math.max(...rolesArray.map(role => getRoleHierarchyNumber(role)));
};

/**
 * Normalizes role hierarchy into a "Power Level" for comparison.
 * Lower number = More power.
 * Order: Super Admin (8) < MD (11) < Director (12) < Manager (13) < ... < OC (17) < Spiritual (98) < Student (99)
 */
export const getRolePowerLevel = (role: UserRole): number => {
  const h = getRoleHierarchyNumber(role);
  if (h === 1) return 99; // Student is lowest power
  if (h === 2 || h === 20) return 98; // Spiritual roles are below administrative roles
  if (role === 21 || role === 'youth_preacher') return 11; // Equivalent to MD
  return h;
};

/**
 * Determines if an admin can manage a target user based on their roles.
 * Rule: Admin must have a HIGHER rank than the target (Strictly lower power level).
 * Also, no one can edit their own roles.
 */
export const canAdminManageTarget = (adminRoles: UserRole | UserRole[], targetRoles: UserRole | UserRole[], adminId?: string, targetId?: string): boolean => {
  if (adminId && targetId && adminId === targetId) return false;

  const adminRolesArray = Array.isArray(adminRoles) ? adminRoles : [adminRoles];
  const targetRolesArray = Array.isArray(targetRoles) ? targetRoles : [targetRoles];

  const isAdminSuper = adminRolesArray.some(r => Number(r) === 8 || String(r) === 'super_admin');
  if (isAdminSuper) return true;

  const adminHighestPower = Math.min(...adminRolesArray.map(r => getRolePowerLevel(r)));
  const targetHighestPower = Math.min(...targetRolesArray.map(r => getRolePowerLevel(r)));

  // Admin must be strictly more powerful (smaller numeric power level)
  return adminHighestPower < targetHighestPower;
};

// Get the highest role from an array of roles
export const getHighestRole = (roles: UserRole | UserRole[]): UserRole => {
  const rolesArray = Array.isArray(roles) ? roles : [roles];

  if (rolesArray.length === 0) {
    return 'student';
  }

  if (rolesArray.length === 1) {
    return rolesArray[0];
  }

  // Find the role with the highest hierarchy number
  let highestRole = rolesArray[0];
  let highestLevel = getRoleHierarchyNumber(rolesArray[0]);

  for (let i = 1; i < rolesArray.length; i++) {
    const level = getRoleHierarchyNumber(rolesArray[i]);
    if (level > highestLevel) {
      highestLevel = level;
      highestRole = rolesArray[i];
    }
  }

  return highestRole;
};

export const hasRole = (userRoles: UserRole | UserRole[], targetRole: UserRole): boolean => {
  const rolesArray = Array.isArray(userRoles) ? userRoles : [userRoles];
  return rolesArray.includes(targetRole);
};

// Check if a role number represents an admin role
export const isAdminRoleNumber = (roleNumber: number): boolean => {
  return (roleNumber >= 4 && roleNumber <= 17) || roleNumber === 21 || roleNumber === 30; // center_admin (4) to oc (17) OR youth_preacher (21) OR event_admin (30)
};

// Check if a role number represents super admin
export const isSuperAdminRoleNumber = (roleNumber: number): boolean => {
  return roleNumber === 8;
};
