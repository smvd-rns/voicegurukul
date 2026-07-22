import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';
import { getAdminSadhanaSupabase } from '@/lib/supabase/sadhana';
import { getUserData } from '@/lib/supabase/auth';
import crypto from 'crypto';

const DATA_CENTER_DRIVE_FOLDER_ID = process.env.DATA_CENTER_DRIVE_FOLDER_ID || '1dmsG_4WS2bJ5OJsNT7iuNtj5b8X7YKNA';

async function getDriveClient() {
  let google;
  try {
    google = require('googleapis').google;
  } catch (error) {
    throw new Error('googleapis package not installed. Please run: npm install googleapis');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google Drive OAuth credentials not configured. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN in environment variables.');
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'urn:ietf:wg:oauth:2.0:oob'
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

// Find folder by name in a parent folder
async function findFolderInDrive(drive: any, folderName: string, parentFolderId: string): Promise<string | null> {
  const response = await drive.files.list({
    q: `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed = false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });
  const files = response.data.files;
  return files && files.length > 0 ? files[0].id : null;
}

async function createFolderInDrive(drive: any, folderName: string, parentFolderId: string): Promise<string> {
  try {
    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id, name',
    });

    if (!response.data.id) {
      throw new Error('Failed to create folder in Google Drive');
    }

    // Make folder viewable by anyone with link
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    return response.data.id;
  } catch (error: any) {
    console.error('Error creating folder in Google Drive:', error);
    throw new Error(`Failed to create folder: ${error.message}`);
  }
}

async function findOrCreateFolderInDrive(drive: any, folderName: string, parentFolderId: string): Promise<string> {
  const existing = await findFolderInDrive(drive, folderName, parentFolderId);
  if (existing) return existing;
  return await createFolderInDrive(drive, folderName, parentFolderId);
}

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUserFromRequest(request as any);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name, parentId } = body;

        if (!name) {
            return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
        }

        const sadhanaDbAdmin = getAdminSadhanaSupabase();
        if (!sadhanaDbAdmin) {
            console.error('[Folder Create API] Failed to initialize Sadhana DB client');
            return NextResponse.json({ error: 'Database initialization error' }, { status: 500 });
        }

        const drive = await getDriveClient();
        const parentFolderId = parentId === 'root' ? null : (parentId || null);
        let finalParentId = '';

        if (parentFolderId) {
             // Retrieve parent folder's google drive folder ID from DB
             const { data: parentFolderData } = await sadhanaDbAdmin
                 .from('folders')
                 .select('google_drive_folder_id')
                 .eq('id', parentFolderId)
                 .single();
             if (parentFolderData?.google_drive_folder_id) {
                 finalParentId = parentFolderData.google_drive_folder_id;
             }
        }

        // If parent folder ID could not be resolved from DB (or it is root), create inside user's folder
        if (!finalParentId) {
             const profile = await getUserData(user.id);
             
             // Check for membership ID
             const { data: membershipData } = await sadhanaDbAdmin
                 .from('membership_ids')
                 .select('membership_id')
                 .eq('user_id', user.id)
                 .maybeSingle();

             if (!membershipData?.membership_id) {
                 return NextResponse.json({ 
                     error: 'Please generate your membership ID first from the Dashboard before using the Data Center.' 
                 }, { status: 400 });
             }

             const userName = profile?.name || user.email?.split('@')[0] || 'User';
             const userFolderName = `${userName} - ${membershipData.membership_id}`;

             // Find or create user folder inside DATA_CENTER_DRIVE_FOLDER_ID
             const userFolderId = await findOrCreateFolderInDrive(drive, userFolderName, DATA_CENTER_DRIVE_FOLDER_ID);
             finalParentId = userFolderId;
        }

        // Create folder directly on Google Drive locally
        const googleDriveId = await createFolderInDrive(drive, name, finalParentId);

        const { data, error } = await sadhanaDbAdmin
            .from('folders')
            .insert({
                id: crypto.randomUUID(),
                name,
                parent_id: parentFolderId,
                user_id: user.id,
                google_drive_folder_id: googleDriveId
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating folder in database:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ folder: data });
    } catch (error: any) {
        console.error('Folder Create Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
