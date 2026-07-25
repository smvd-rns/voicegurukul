/**
 * Generates a membership ID for a user based on their profile data.
 * This is an atomic operation using the database RPC function.
 */
export async function generateMembershipIdForUser(supabaseAdmin: any, userId: string) {
    try {
        // Fetch user data needed for ID generation
        const { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .select('introduced_to_kc_in, parent_temple, other_parent_temple, other_temple, hierarchy')
            .eq('id', userId)
            .single();

        if (userError || !userData) {
            throw new Error(`User profile not found: ${userError?.message}`);
        }

        if (!userData.introduced_to_kc_in || !userData.parent_temple) {
            throw new Error('Missing required profile information: Introduced to KC and Parent Temple required.');
        }

        // 1. Extract year
        let year;
        const dateVal = userData.introduced_to_kc_in;
        if (/^\d{4}$/.test(dateVal)) {
            year = parseInt(dateVal);
        } else {
            year = new Date(dateVal).getFullYear();
        }
        
        if (isNaN(year)) throw new Error('Invalid "Introduced to KC" date format');

        // 2. Extract temple code (3 letters)
        let templeName = userData.parent_temple;
        if (templeName === 'Other') {
            templeName = userData.other_parent_temple || userData.other_temple || userData.hierarchy?.otherParentTemple || 'OTH';
        }

        if (!templeName || templeName.trim().length < 1) {
             throw new Error('Invalid Parent Temple name');
        }

        let cleanTempleName = templeName.trim().replace(/^iskcon\s*/i, '');
        if (!cleanTempleName) {
            cleanTempleName = templeName;
        }
        const templeCode = cleanTempleName.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase().padEnd(3, 'X');

        // 3. Call the atomic RPC function
        const { data: membershipId, error: rpcError } = await supabaseAdmin.rpc('generate_membership_id', {
            p_user_id: userId,
            p_year: year,
            p_temple_code: templeCode
        });

        if (rpcError) {
            throw new Error(`Database error: ${rpcError.message}`);
        }

        // 4. Sync donation_slug in users table
        await supabaseAdmin
            .from('users')
            .update({ donation_slug: membershipId })
            .eq('id', userId);

        return membershipId;
    } catch (error: any) {
        console.error('Error in generateMembershipIdForUser:', error);
        throw error;
    }
}
