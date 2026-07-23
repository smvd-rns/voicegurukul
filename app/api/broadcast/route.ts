import { NextRequest, NextResponse } from 'next/server';
import {  createClient  } from '@/lib/supabase/server-db';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';
import { validateTextField, validateMessageField, createErrorResponse } from '@/lib/utils/api-validation';

// Initialize Supabase client with service role key for privileged operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
    try {
        // Create Supabase client with service role for user verification
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // Get user from request
        const user = await getAuthUserFromRequest(request);
        if (!user) {
            return createErrorResponse('Unauthorized - Invalid session', 401);
        }

        // Get user data to check role and jurisdiction
        const { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .select('role, name, hierarchy, bc_voice_manager_approved_centers')
            .eq('id', user.id)
            .single();

        if (userError || !userData) {
            return createErrorResponse('User not found', 404);
        }

        // Helper to get numeric role level
        const getRoleLevel = (role: any): number => {
            if (typeof role === 'number') return role;
            const roleMap: Record<string, number> = {
                'super_admin': 8,
                'zonal_admin': 7,
                'state_admin': 6,
                'city_admin': 5,
                'center_admin': 4,
                'bc_voice_manager': 4,
                'voice_manager': 3,
                'senior_counselor': 3,
                'counselor': 2,
                'student': 1
            };
            return roleMap[role] || 1;
        };

        const userRoles = Array.isArray(userData.role) ? userData.role : [userData.role];
        const maxRoleLevel = Math.max(...userRoles.map(getRoleLevel));

        // Check if user has at least level 4 access
        if (maxRoleLevel < 4) {
            return createErrorResponse('Forbidden - You do not have permission to send broadcast messages', 403);
        }

        // Parse request body
        const body = await request.json();
        const { subject, content, priority, category, filterType, filterValue, selectedCamps } = body;

        // Validate and sanitize subject
        const subjectValidation = validateTextField(subject, 'Subject', {
            required: true,
            minLength: 3,
            maxLength: 200
        });
        if (!subjectValidation.valid) {
            return createErrorResponse(subjectValidation.error!, 400);
        }

        // Validate and sanitize content
        const contentValidation = validateMessageField(content, {
            required: true,
            maxLength: 5000
        });
        if (!contentValidation.valid) {
            return createErrorResponse(contentValidation.error!, 400);
        }

        const sanitizedSubject = subjectValidation.sanitizedValue;
        const sanitizedContent = contentValidation.sanitizedValue;

        // Base query
        let query = supabaseAdmin.from('users').select('id');

        // Apply Hierarchical Scoping Enforcement
        // Identify the restriction based on the HIGHEST role they hold.
        // If they are Super Admin (8), no restriction.
        // If 7, restrict to assigned Zone.
        // If 6, restrict to assigned State.
        // If 5, restrict to assigned City.
        // If 4, restrict to Approved Centers.

        if (maxRoleLevel === 8) {
            // Super Admin: Global Access - No scope restrictions
        } else if (maxRoleLevel === 7) {
            // Zonal Admin
            const assignedZone = userData.hierarchy?.assignedZone;
            if (!assignedZone) {
                return NextResponse.json(
                    { error: 'Forbidden - No assigned zone found for your account' },
                    { status: 403 }
                );
            }
            // Filter users by their zone (stored in hierarchy->zone)
            query = query.eq('hierarchy->>zone', assignedZone);

        } else if (maxRoleLevel === 6) {
            // State Admin
            const assignedState = userData.hierarchy?.assignedState;
            if (!assignedState) {
                return NextResponse.json(
                    { error: 'Forbidden - No assigned state found for your account' },
                    { status: 403 }
                );
            }
            // Filter users by state column
            query = query.eq('state', assignedState);

        } else if (maxRoleLevel === 5) {
            // City Admin
            const assignedCity = userData.hierarchy?.assignedCity;
            if (!assignedCity) {
                return NextResponse.json(
                    { error: 'Forbidden - No assigned city found for your account' },
                    { status: 403 }
                );
            }
            // Filter users by city column
            query = query.eq('city', assignedCity);

        } else if (maxRoleLevel === 4) {
            // Center Admin / BC Voice Manager
            const approvedCenterIds = userData.bc_voice_manager_approved_centers || [];
            if (approvedCenterIds.length === 0) {
                return NextResponse.json(
                    { error: 'Forbidden - No approved centers assigned to your account' },
                    { status: 403 }
                );
            }

            // Resolve Center IDs to Names because 'users' table stores Center Name in 'center' column
            const { data: centerData, error: centerError } = await supabaseAdmin
                .from('centers')
                .select('name')
                .in('id', approvedCenterIds);

            const approvedCenterNames = centerData ? (centerData as any[]).map((c: any) => c.name) : [];

            // Filter users in approved centers (by Name)
            query = query.in('center', approvedCenterNames);
        }

        // Apply filters requested by the user (intersecting with the scope above)
        if (selectedCamps && selectedCamps.length > 0) {
            // Handle multiple camp selections
            const orConditions = selectedCamps.map((camp: string) => {
                if (camp === 'royal') {
                    return 'royal_member.eq.yes';
                }
                return `${camp}.eq.true`;
            }).join(',');
            query = query.or(orConditions);
        } else if (filterType && filterValue) {
            // Get filtered user IDs for single filter
            switch (filterType) {
                case 'state':
                    // If restricted to a different state by scope, this will yield 0 results automatically
                    query = query.eq('state', filterValue);
                    break;
                case 'city':
                    // If restricted to a different city/state by scope, this will yield 0 results automatically
                    query = query.eq('city', filterValue);
                    break;
                case 'center':
                    query = query.eq('center', filterValue);
                    break;
            }
        }

        // Execute query
        const { data: users, error } = await query;

        if (error) {
            throw new Error(error.message);
        }

        let allUserIds = (users || []).map((u: any) => u.id);


        // Get the highest role number for the sender
        const senderRole = Math.max(...userRoles.filter((r: any) => typeof r === 'number'));

        // Insert broadcast message directly using service role client (bypasses RLS)
        const { data: messageData, error: insertError } = await supabaseAdmin
            .from('messages')
            .insert({
                sender_id: user.id,
                recipient_ids: allUserIds,
                recipient_groups: [],
                subject: sanitizedSubject,
                content: sanitizedContent,
                priority: priority || 'normal',
                category: category || 'administrative',
                read_by: [],
                is_broadcast: true,
                sender_role: senderRole,
                created_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (insertError) {
            console.error('Error inserting broadcast message:', insertError);
            throw new Error(insertError.message);
        }

        return NextResponse.json({
            success: true,
            messageId: messageData.id,
            recipientCount: allUserIds.length,
            filterApplied: selectedCamps && selectedCamps.length > 0
                ? `Camps: ${selectedCamps.length} selected`
                : filterType
                    ? `${filterType}: ${filterValue}`
                    : 'All Users',
        });
    } catch (error: any) {
        console.error('Error sending broadcast message:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to send broadcast message' },
            { status: 500 }
        );
    }
}
