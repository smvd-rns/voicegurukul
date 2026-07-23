import { NextRequest, NextResponse } from 'next/server';
import {  createClient  } from '@/lib/supabase/server-db';
import { roleHierarchy, getRoleDisplayName } from '@/lib/utils/roles';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const groupBy = searchParams.get('groupBy') || 'temple';
    const search = searchParams.get('search')?.toLowerCase();
    const camp = searchParams.get('camp');

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
        return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify permissions
    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

    if (userError || !userData) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userRoles = Array.isArray(userData.role) ? userData.role : [userData.role];
    const maxRole = Math.max(...userRoles.map((r: any) => roleHierarchy.get(r)));

    if (maxRole < 8) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Dynamic select based on groupBy to reduce payload
    let selectQuery = 'id, name, role, email, ashram';

    // If camp filtering is active, we MUST fetch camp columns to filter by
    if (camp) {
        selectQuery += `, ${camp}`;
    }

    switch (groupBy) {
        case 'temple':
            selectQuery += ', current_temple, current_center';
            break;
        case 'counselor':
            selectQuery += ', hierarchy';
            break;
        case 'camp':
            // If grouping by camp, fetch all camp columns
            selectQuery += ', camp_dys, camp_sankalpa, camp_sphurti, camp_utkarsh, camp_faith_and_doubt, camp_srcgd_workshop, camp_nistha, camp_ashray';
            break;
        case 'ashram':
            // already have ashram
            break;
        case 'role':
            // already have role
            break;
        default:
            // Fallback to all handy fields if unsure, or keep minimal
            selectQuery += ', current_temple, current_center, hierarchy, camp_dys';
            break;
    }

    const { data: usersData, error: fetchError } = await supabase
        .from('users')
        .select(selectQuery);

    if (fetchError || !usersData) {
        console.error('Error fetching hierarchy data:', fetchError);
        return NextResponse.json({ error: 'Error fetching hierarchy' }, { status: 500 });
    }

    let users = usersData as any[];

    // Filter by camp if provided
    if (camp) {
        users = users.filter(u => !!u[camp]);
    }

    // Filter by search if provided
    let filteredUsers = users;
    if (search) {
        filteredUsers = users.filter(u =>
            u.name?.toLowerCase().includes(search) ||
            u.email?.toLowerCase().includes(search)
        );
    }

    const root: any = { id: 'root', label: 'Organization View', type: 'root', children: [] };

    if (groupBy === 'temple') {
        const temples: Record<string, any> = {};
        filteredUsers.forEach(u => {
            const templeName = u.current_temple || 'Unassigned Temple';
            const centerName = u.current_center || 'Unassigned Center';

            if (!temples[templeName]) {
                temples[templeName] = { id: `t-${templeName}`, label: templeName, type: 'temple', children: {} };
            }
            if (!temples[templeName].children[centerName]) {
                temples[templeName].children[centerName] = { id: `c-${templeName}-${centerName}`, label: centerName, type: 'center', children: [] };
            }

            temples[templeName].children[centerName].children.push({
                id: u.id,
                label: u.name,
                type: 'user',
                email: u.email,
                role: u.role,
                ashram: u.ashram
            });
        });

        root.children = Object.values(temples).map(t => ({
            ...t,
            children: Object.values(t.children).map((c: any) => ({
                ...c,
                count: c.children.length
            })),
            count: Object.values(t.children).reduce((acc: number, c: any) => acc + c.children.length, 0)
        }));
    } else if (groupBy === 'role') {
        const roles: Record<string, any> = {};
        filteredUsers.forEach(u => {
            const userRoles = Array.isArray(u.role) ? u.role : [u.role];
            userRoles.forEach((r: any) => {
                const roleName = getRoleDisplayName(r);
                if (!roles[roleName]) {
                    roles[roleName] = { id: `r-${roleName}`, label: roleName, type: 'role', children: [] };
                }
                roles[roleName].children.push({
                    id: u.id,
                    label: u.name,
                    type: 'user',
                    email: u.email,
                    role: u.role,
                    ashram: u.ashram
                });
            });
        });

        root.children = Object.values(roles).map(r => ({
            ...r,
            count: r.children.length
        }));
        // Sort by role level if possible, or just alphabetically
        root.children.sort((a: any, b: any) => b.count - a.count);
    } else if (groupBy === 'ashram') {
        const ashrams: Record<string, any> = {};
        filteredUsers.forEach(u => {
            const ashramName = u.ashram || 'Unassigned';
            if (!ashrams[ashramName]) {
                ashrams[ashramName] = { id: `a-${ashramName}`, label: ashramName, type: 'ashram', children: [] };
            }
            ashrams[ashramName].children.push({
                id: u.id,
                label: u.name,
                type: 'user',
                email: u.email,
                role: u.role
            });
        });

        root.children = Object.values(ashrams).map(a => ({
            ...a,
            count: a.children.length
        }));
    } else if (groupBy === 'counselor') {
        const counselors: Record<string, any> = {};
        filteredUsers.forEach(u => {
            const hierarchy = u.hierarchy || {};
            const counselorName = hierarchy.brahmachariCounselor || hierarchy.counselor || 'Unassigned Counselor';

            if (!counselors[counselorName]) {
                counselors[counselorName] = { id: `cn-${counselorName}`, label: counselorName, type: 'role', children: [] };
            }
            counselors[counselorName].children.push({
                id: u.id,
                label: u.name,
                type: 'user',
                email: u.email,
                role: u.role
            });
        });

        root.children = Object.values(counselors).map(c => ({
            ...c,
            count: c.children.length
        }));
    } else if (groupBy === 'camp') {
        const campList = [
            { id: 'camp_dys', label: 'DYS' },
            { id: 'camp_sankalpa', label: 'Sankalpa' },
            { id: 'camp_sphurti', label: 'Sphurti' },
            { id: 'camp_utkarsh', label: 'Utkarsh' },
            { id: 'camp_faith_and_doubt', label: 'Faith & Doubt' },
            { id: 'camp_srcgd_workshop', label: 'SRCGD Workshop' },
            { id: 'camp_nistha', label: 'Nistha' },
            { id: 'camp_ashray', label: 'Ashray' }
        ];

        const camps: Record<string, any> = {};
        campList.forEach(camp => {
            camps[camp.id] = { id: camp.id, label: camp.label, type: 'ashram', children: [] };
        });
        camps['none'] = { id: 'none', label: 'No Camps Completed', type: 'ashram', children: [] };

        filteredUsers.forEach(u => {
            let added = false;
            campList.forEach(camp => {
                if ((u as any)[camp.id]) {
                    camps[camp.id].children.push({
                        id: u.id,
                        label: u.name,
                        type: 'user',
                        email: u.email,
                        role: u.role
                    });
                    added = true;
                }
            });
            if (!added) {
                camps['none'].children.push({
                    id: u.id,
                    label: u.name,
                    type: 'user',
                    email: u.email,
                    role: u.role
                });
            }
        });

        root.children = Object.values(camps)
            .filter((c: any) => c.children.length > 0)
            .map(c => ({
                ...c,
                count: c.children.length
            }));
    }

    return NextResponse.json(root);
}
