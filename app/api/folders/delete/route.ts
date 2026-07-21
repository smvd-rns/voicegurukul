import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';
import { getAdminSadhanaSupabase } from '@/lib/supabase/sadhana';
import { getUserData } from '@/lib/supabase/auth';
import { isAdminRoleNumber, getRoleHierarchyNumber } from '@/lib/utils/roles';

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUserFromRequest(request as any);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 });
        }


        const sadhanaDbAdmin = getAdminSadhanaSupabase();
        if (!sadhanaDbAdmin) {
            console.error('[Folder Delete API] Failed to initialize Sadhana DB client');
            return NextResponse.json({ error: 'Database initialization error' }, { status: 500 });
        }

        // Check ownership or admin status of the target folder
        const { data: targetFolder, error: fetchError } = await sadhanaDbAdmin
            .from('folders')
            .select('user_id, name')
            .eq('id', id)
            .maybeSingle();

        if (fetchError) {
            console.error(`[Folder Delete API] Error fetching folder ${id}:`, fetchError);
            return NextResponse.json({
                error: `Database error: ${fetchError.message}`,
                details: fetchError.hint || fetchError.details
            }, { status: 500 });
        }

        if (!targetFolder) {
            console.warn(`[Folder Delete API] Folder ${id} not found in database`);
            return NextResponse.json({ error: 'Folder not found in database' }, { status: 404 });
        }

        // Check Permissions: Owner OR Admin
        const profile = await getUserData(user.id);
        const userRoles = profile?.role ? (Array.isArray(profile.role) ? profile.role : [profile.role]) : [];
        const isAdmin = userRoles.some(r => isAdminRoleNumber(getRoleHierarchyNumber(r as any)));

        console.log(`[Folder Delete API] User ${user.id} attempting to delete folder "${targetFolder.name}" (${id}). IsAdmin: ${isAdmin}, Owner: ${targetFolder.user_id}`);

        if (targetFolder.user_id !== user.id && !isAdmin) {
            return NextResponse.json({ error: 'Forbidden: You do not own this folder and do not have admin permissions' }, { status: 403 });
        }

        // --- Recursive Deletion Logic ---

        // 1. Fetch all folders for this user once to build a tree in-memory
        const folderUserIds = isAdmin ? [targetFolder.user_id, user.id] : [user.id];
        
        const { data: allFolders, error: allFoldersError } = await sadhanaDbAdmin
            .from('folders')
            .select('id, parent_id, user_id')
            .in('user_id', folderUserIds);

        if (allFoldersError) throw allFoldersError;

        // 2. Find all child folders recursively
        const idsToDelete: string[] = [id];
        const findChildren = (parentId: string) => {
            const children = (allFolders as any[] || []).filter((f: any) => f.parent_id === parentId);
            children.forEach(child => {
                idsToDelete.push(child.id);
                findChildren(child.id);
            });
        };
        findChildren(id);

        console.log(`[Folder Delete API] User ${user.id} deleting ${idsToDelete.length} folders recursively:`, idsToDelete);

        // 3. Delete all files linked to any of these folders
        const { error: filesDeleteError } = await sadhanaDbAdmin
            .from('files')
            .delete()
            .in('folder_id', idsToDelete);

        if (filesDeleteError) {
            console.error('Error deleting files linked to folders:', filesDeleteError);
            return NextResponse.json({ error: filesDeleteError.message }, { status: 500 });
        }

        // 4. Delete the folders themselves
        const { error: foldersDeleteError, count: deletedFoldersCount } = await sadhanaDbAdmin
            .from('folders')
            .delete({ count: 'exact' })
            .in('id', idsToDelete);

        if (foldersDeleteError) {
            console.error('Error deleting folders:', foldersDeleteError);
            return NextResponse.json({ error: foldersDeleteError.message }, { status: 500 });
        }

        console.log(`[Folder Delete API] Successfully deleted ${deletedFoldersCount || 0} folders and their associated files.`);

        return NextResponse.json({
            success: true,
            deletedFoldersCount: idsToDelete.length
        });
    } catch (error: any) {
        console.error('Folder Delete Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
