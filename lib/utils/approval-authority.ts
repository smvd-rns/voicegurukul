import { query } from '@/lib/db';

export interface ApprovalAuthority {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    roleTitle: string;
    centerName?: string | null;
    templeName?: string | null;
}

function isValidEmail(email: any): boolean {
    return typeof email === 'string' && email.trim() !== '' && email.includes('@');
}

async function getUserById(id: any) {
    if (!id) return null;
    try {
        const res = await query('SELECT id, name, email, phone FROM users WHERE id::text = $1::text LIMIT 1', [String(id)]);
        return res.rows[0] || null;
    } catch {
        return null;
    }
}

/**
 * Resolves the designated approval authority following the strict hierarchy order:
 * 1. Acting Manager (Center)
 * 2. Project Manager (Center)
 * 3. Project Advisor (Center)
 * 4. Counselor (Devotee's counselor)
 * 5. Care Giver (Center)
 * 6. Central VOICE Manager (Temple)
 * 7. Director (Temple)
 * 8. Managing Director (Temple)
 * 9. Super Admin (Global fallback)
 *
 * NOTE: Vice-President (Role 9) and President (Role 10) are explicitly excluded from this routing.
 */
export async function resolveApprovalAuthority(user: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    current_center?: string;
    current_temple?: string;
    counselor?: string;
    counselor_id?: string;
    hierarchy?: any;
}): Promise<ApprovalAuthority> {
    let hierarchy = user.hierarchy;
    if (typeof hierarchy === 'string') {
        try {
            hierarchy = JSON.parse(hierarchy);
        } catch {
            hierarchy = {};
        }
    } else if (!hierarchy || typeof hierarchy !== 'object') {
        hierarchy = {};
    }

    const userCenterName = user.current_center || hierarchy.currentCenter || hierarchy.center || null;
    const userTempleName = user.current_temple || hierarchy.currentTemple || hierarchy.parentTemple || null;
    const userCounselorId = user.counselor_id || hierarchy.counselorId || null;
    const userCounselorName = user.counselor || hierarchy.counselor || null;

    // Load Center record if available
    let center: any = null;
    if (userCenterName && userCenterName !== 'None' && userCenterName !== 'None/None' && userCenterName !== 'Other') {
        try {
            const centerRes = await query(
                `SELECT * FROM centers WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1`,
                [userCenterName]
            );
            center = centerRes.rows[0] || null;
        } catch (cErr) {
            console.warn('Center lookup notice in approval authority resolution:', cErr);
        }
    }

    // 1. Priority 1: Acting Manager (Center)
    if (center?.acting_manager_id) {
        const amUser = await getUserById(center.acting_manager_id);
        if (amUser && isValidEmail(amUser.email)) {
            return {
                id: amUser.id,
                name: amUser.name || center.acting_manager_name || 'Acting Manager',
                email: amUser.email.trim(),
                phone: amUser.phone || null,
                roleTitle: 'Acting Manager',
                centerName: center.name,
                templeName: center.temple_name || userTempleName,
            };
        }
    }

    // 2. Priority 2: Project Manager (Center)
    if (center?.project_manager_id) {
        const pmUser = await getUserById(center.project_manager_id);
        if (pmUser && isValidEmail(pmUser.email)) {
            return {
                id: pmUser.id,
                name: pmUser.name || center.project_manager_name || 'Project Manager',
                email: pmUser.email.trim(),
                phone: pmUser.phone || null,
                roleTitle: 'Project Manager',
                centerName: center.name,
                templeName: center.temple_name || userTempleName,
            };
        }
    }

    // 3. Priority 3: Project Advisor (Center)
    if (center?.project_advisor_id) {
        const paUser = await getUserById(center.project_advisor_id);
        if (paUser && isValidEmail(paUser.email)) {
            return {
                id: paUser.id,
                name: paUser.name || center.project_advisor_name || 'Project Advisor',
                email: paUser.email.trim(),
                phone: paUser.phone || null,
                roleTitle: 'Project Advisor',
                centerName: center.name,
                templeName: center.temple_name || userTempleName,
            };
        }
    }
    if (center?.id) {
        try {
            const ucRes = await query(
                `SELECT u.id, u.name, u.email, u.phone 
                 FROM user_centers uc 
                 JOIN users u ON uc.user_id::text = u.id::text 
                 WHERE uc.center_id::text = $1::text 
                   AND u.email IS NOT NULL AND TRIM(u.email) != '' 
                 LIMIT 1`,
                [center.id]
            );
            const ucUser = ucRes.rows[0];
            if (ucUser && isValidEmail(ucUser.email)) {
                return {
                    id: ucUser.id,
                    name: ucUser.name || 'Project Advisor',
                    email: ucUser.email.trim(),
                    phone: ucUser.phone || null,
                    roleTitle: 'Project Advisor',
                    centerName: center.name,
                    templeName: center.temple_name || userTempleName,
                };
            }
        } catch (ucErr) {
            console.warn('user_centers check notice in approval authority resolution:', ucErr);
        }
    }

    // 4. Priority 4: Counselor (Devotee's assigned counselor)
    if (userCounselorId || (userCounselorName && userCounselorName !== 'None' && userCounselorName !== 'Other')) {
        try {
            let counselorRow: any = null;
            if (userCounselorId) {
                const cRes = await query(
                    `SELECT c.id, c.name, c.email, c.mobile, c.user_id,
                            u.id AS u_id, u.name AS u_name, u.email AS u_email, u.phone AS u_phone
                     FROM counselors c
                     LEFT JOIN users u ON (c.user_id::text = u.id::text OR LOWER(TRIM(c.email)) = LOWER(TRIM(u.email)))
                     WHERE c.id::text = $1::text
                     LIMIT 1`,
                    [userCounselorId]
                );
                counselorRow = cRes.rows[0];
            }
            if (!counselorRow && userCounselorName && userCounselorName !== 'None' && userCounselorName !== 'Other') {
                const cNameRes = await query(
                    `SELECT c.id, c.name, c.email, c.mobile, c.user_id,
                            u.id AS u_id, u.name AS u_name, u.email AS u_email, u.phone AS u_phone
                     FROM counselors c
                     LEFT JOIN users u ON (c.user_id::text = u.id::text OR LOWER(TRIM(c.email)) = LOWER(TRIM(u.email)))
                     WHERE LOWER(TRIM(c.name)) = LOWER(TRIM($1))
                     LIMIT 1`,
                    [userCounselorName]
                );
                counselorRow = cNameRes.rows[0];
            }
            if (counselorRow) {
                const counselorEmail = (counselorRow.u_email || counselorRow.email || '').trim();
                if (isValidEmail(counselorEmail)) {
                    return {
                        id: counselorRow.u_id || counselorRow.user_id || counselorRow.id,
                        name: counselorRow.u_name || counselorRow.name || 'Counselor',
                        email: counselorEmail,
                        phone: counselorRow.u_phone || counselorRow.mobile || null,
                        roleTitle: 'Counselor',
                        centerName: center?.name || userCenterName,
                        templeName: center?.temple_name || userTempleName,
                    };
                }
            }
        } catch (counselorErr) {
            console.warn('Counselor lookup notice in approval authority resolution:', counselorErr);
        }
    }

    // 5. Priority 5: Care Giver (Center)
    if (center?.care_giver_id) {
        const cgUser = await getUserById(center.care_giver_id);
        if (cgUser && isValidEmail(cgUser.email)) {
            return {
                id: cgUser.id,
                name: cgUser.name || center.care_giver_name || 'Care Giver',
                email: cgUser.email.trim(),
                phone: cgUser.phone || null,
                roleTitle: 'Care Giver',
                centerName: center.name,
                templeName: center.temple_name || userTempleName,
            };
        }
    }
    if (userCenterName && userCenterName !== 'None' && userCenterName !== 'None/None') {
        try {
            const cgCenterRes = await query(
                `SELECT id, name, email, phone FROM users 
                 WHERE (role::text LIKE '%20%' OR role::text LIKE '%"care_giver"%') 
                   AND (LOWER(TRIM(current_center)) = LOWER(TRIM($1)) OR LOWER(TRIM(hierarchy->>'currentCenter')) = LOWER(TRIM($1)))
                   AND email IS NOT NULL AND TRIM(email) != '' 
                 ORDER BY created_at ASC LIMIT 1`,
                [userCenterName]
            );
            const cgUser = cgCenterRes.rows[0];
            if (cgUser && isValidEmail(cgUser.email)) {
                return {
                    id: cgUser.id,
                    name: cgUser.name || 'Care Giver',
                    email: cgUser.email.trim(),
                    phone: cgUser.phone || null,
                    roleTitle: 'Care Giver',
                    centerName: center?.name || userCenterName,
                    templeName: center?.temple_name || userTempleName,
                };
            }
        } catch (cgErr) {
            console.warn('Care Giver center lookup notice in approval authority resolution:', cgErr);
        }
    }

    // Load Temple record if available
    const templeToQuery = userTempleName || center?.temple_name;
    let temple: any = null;
    if (templeToQuery && templeToQuery !== 'None' && templeToQuery !== 'None/None' && templeToQuery !== 'Other') {
        try {
            const templeRes = await query(
                `SELECT * FROM temples WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1`,
                [templeToQuery]
            );
            temple = templeRes.rows[0] || null;
        } catch (tErr) {
            console.warn('Temple lookup notice in approval authority resolution:', tErr);
        }
    }

    // 6. Priority 6: Central VOICE Manager (Temple)
    if (temple?.central_voice_manager_id) {
        const cvmUser = await getUserById(temple.central_voice_manager_id);
        if (cvmUser && isValidEmail(cvmUser.email)) {
            return {
                id: cvmUser.id,
                name: cvmUser.name || temple.central_voice_manager_name || 'Central VOICE Manager',
                email: cvmUser.email.trim(),
                phone: cvmUser.phone || null,
                roleTitle: 'Central VOICE Manager',
                centerName: center?.name || userCenterName,
                templeName: temple.name || templeToQuery,
            };
        }
    }
    if (templeToQuery && templeToQuery !== 'None' && templeToQuery !== 'None/None' && templeToQuery !== 'Other') {
        try {
            const cvmRes = await query(
                `SELECT id, name, email, phone FROM users 
                 WHERE (role::text LIKE '%13%' OR role::text LIKE '%"central_voice_manager"%') 
                   AND (LOWER(TRIM(current_temple)) = LOWER(TRIM($1)) OR LOWER(TRIM(hierarchy->>'currentTemple')) = LOWER(TRIM($1)))
                   AND email IS NOT NULL AND TRIM(email) != '' 
                 ORDER BY created_at ASC LIMIT 1`,
                [templeToQuery]
            );
            const cvmUser = cvmRes.rows[0];
            if (cvmUser && isValidEmail(cvmUser.email)) {
                return {
                    id: cvmUser.id,
                    name: cvmUser.name || 'Central VOICE Manager',
                    email: cvmUser.email.trim(),
                    phone: cvmUser.phone || null,
                    roleTitle: 'Central VOICE Manager',
                    centerName: center?.name || userCenterName,
                    templeName: temple?.name || templeToQuery,
                };
            }
        } catch (cvmErr) {
            console.warn('Central VOICE Manager lookup notice in approval authority resolution:', cvmErr);
        }
    }

    // 7. Priority 7: Director (Temple)
    if (temple?.director_id) {
        const dUser = await getUserById(temple.director_id);
        if (dUser && isValidEmail(dUser.email)) {
            return {
                id: dUser.id,
                name: dUser.name || temple.director_name || 'Director',
                email: dUser.email.trim(),
                phone: dUser.phone || null,
                roleTitle: 'Director',
                centerName: center?.name || userCenterName,
                templeName: temple.name || templeToQuery,
            };
        }
    }
    if (templeToQuery && templeToQuery !== 'None' && templeToQuery !== 'None/None' && templeToQuery !== 'Other') {
        try {
            const dRes = await query(
                `SELECT id, name, email, phone FROM users 
                 WHERE (role::text LIKE '%12%' OR role::text LIKE '%"director"%') 
                   AND (LOWER(TRIM(current_temple)) = LOWER(TRIM($1)) OR LOWER(TRIM(hierarchy->>'currentTemple')) = LOWER(TRIM($1)))
                   AND email IS NOT NULL AND TRIM(email) != '' 
                 ORDER BY created_at ASC LIMIT 1`,
                [templeToQuery]
            );
            const dUser = dRes.rows[0];
            if (dUser && isValidEmail(dUser.email)) {
                return {
                    id: dUser.id,
                    name: dUser.name || 'Director',
                    email: dUser.email.trim(),
                    phone: dUser.phone || null,
                    roleTitle: 'Director',
                    centerName: center?.name || userCenterName,
                    templeName: temple?.name || templeToQuery,
                };
            }
        } catch (dErr) {
            console.warn('Director lookup notice in approval authority resolution:', dErr);
        }
    }

    // 8. Priority 8: Managing Director (Temple)
    if (temple?.managing_director_id) {
        const mdUser = await getUserById(temple.managing_director_id);
        if (mdUser && isValidEmail(mdUser.email)) {
            return {
                id: mdUser.id,
                name: mdUser.name || temple.managing_director_name || 'Managing Director',
                email: mdUser.email.trim(),
                phone: mdUser.phone || null,
                roleTitle: 'Managing Director',
                centerName: center?.name || userCenterName,
                templeName: temple.name || templeToQuery,
            };
        }
    }
    if (templeToQuery && templeToQuery !== 'None' && templeToQuery !== 'None/None' && templeToQuery !== 'Other') {
        try {
            const mdRes = await query(
                `SELECT id, name, email, phone FROM users 
                 WHERE (role::text LIKE '%11%' OR role::text LIKE '%"managing_director"%') 
                   AND (LOWER(TRIM(current_temple)) = LOWER(TRIM($1)) OR LOWER(TRIM(hierarchy->>'currentTemple')) = LOWER(TRIM($1)))
                   AND email IS NOT NULL AND TRIM(email) != '' 
                 ORDER BY created_at ASC LIMIT 1`,
                [templeToQuery]
            );
            const mdUser = mdRes.rows[0];
            if (mdUser && isValidEmail(mdUser.email)) {
                return {
                    id: mdUser.id,
                    name: mdUser.name || 'Managing Director',
                    email: mdUser.email.trim(),
                    phone: mdUser.phone || null,
                    roleTitle: 'Managing Director',
                    centerName: center?.name || userCenterName,
                    templeName: temple?.name || templeToQuery,
                };
            }
        } catch (mdErr) {
            console.warn('Managing Director lookup notice in approval authority resolution:', mdErr);
        }
    }

    // 9. Priority 9: Super Admin (Global fallback)
    // NOTE: Vice-President (Role 9) and President (Role 10) are intentionally excluded.
    try {
        const saPrimaryRes = await query(
            "SELECT id, name, email, phone FROM users WHERE LOWER(TRIM(email)) = 'smvd@voicepune.com' LIMIT 1"
        );
        const saPrimary = saPrimaryRes.rows[0];
        if (saPrimary && isValidEmail(saPrimary.email)) {
            return {
                id: saPrimary.id,
                name: saPrimary.name || 'Super Admin',
                email: saPrimary.email.trim(),
                phone: saPrimary.phone || null,
                roleTitle: 'Super Admin',
                centerName: center?.name || userCenterName,
                templeName: temple?.name || templeToQuery,
            };
        }

        const saRes = await query(
            "SELECT id, name, email, phone FROM users WHERE (role::text LIKE '%8%' OR role::text LIKE '%\"super_admin\"%') AND email IS NOT NULL AND TRIM(email) != '' ORDER BY created_at ASC LIMIT 1"
        );
        const saUser = saRes.rows[0];
        if (saUser && isValidEmail(saUser.email)) {
            return {
                id: saUser.id,
                name: saUser.name || 'Super Admin',
                email: saUser.email.trim(),
                phone: saUser.phone || null,
                roleTitle: 'Super Admin',
                centerName: center?.name || userCenterName,
                templeName: temple?.name || templeToQuery,
            };
        }
    } catch (saErr) {
        console.error('Super admin lookup error in approval authority resolution:', saErr);
    }

    return {
        id: 'superadmin',
        name: 'Super Admin',
        email: 'smvd@voicepune.com',
        phone: null,
        roleTitle: 'Super Admin',
        centerName: center?.name || userCenterName,
        templeName: temple?.name || templeToQuery,
    };
}

