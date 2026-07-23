import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';
import { getAdminSadhanaSupabase } from '@/lib/supabase/sadhana';
import { getUserData } from '@/lib/supabase/auth';

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
    throw new Error('Google Drive OAuth credentials not configured.');
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, 'urn:ietf:wg:oauth:2.0:oob');
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return { drive: google.drive({ version: 'v3', auth: oauth2Client }), oauth2Client };
}

// Find folder by name in a parent folder
async function findFolder(drive: any, folderName: string, parentFolderId: string): Promise<string | null> {
  const response = await drive.files.list({
    q: `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed = false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });
  const files = response.data.files;
  return files && files.length > 0 ? files[0].id : null;
}

// Create folder in Google Drive and make public read-only
async function createFolder(drive: any, folderName: string, parentFolderId: string): Promise<string> {
  const fileMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentFolderId],
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    fields: 'id, name',
  });

  const folderId = response.data.id;
  if (!folderId) throw new Error('Failed to create folder in Google Drive');

  await drive.permissions.create({
    fileId: folderId,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  return folderId;
}

async function findOrCreateFolder(drive: any, folderName: string, parentFolderId: string): Promise<string> {
  const existing = await findFolder(drive, folderName, parentFolderId);
  if (existing) return existing;
  return await createFolder(drive, folderName, parentFolderId);
}

function getFileCategory(fileName: string, mimeType: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const type = mimeType.split('/')[0];

  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'heic'].includes(ext) || type === 'image') return 'Images';
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext) || type === 'audio') return 'Audios';
  if (['mp4', 'mov', 'avi', 'mkv', 'webm', '3gp'].includes(ext) || type === 'video') return 'Videos';
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf'].includes(ext)) return 'Documents';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'Archives';
  return 'Others';
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request as any);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileName, fileType, targetFolderId, userName } = await request.json();

    const { drive, oauth2Client } = await getDriveClient();
    const tokenRes = await oauth2Client.getAccessToken();
    const accessToken = tokenRes.token;

    if (!accessToken) {
      throw new Error('Failed to retrieve access token');
    }

    let finalFolderId = '';

    // 1. Resolve parent folder from DB
    const STALE_POLICY_FOLDER_ID = '1b94q4-8wVGVU_pv4AUVpTFMrnfY9v2ng';
    if (targetFolderId === STALE_POLICY_FOLDER_ID) {
      if (process.env.POLICY_DRIVE_FOLDER_ID) {
        finalFolderId = process.env.POLICY_DRIVE_FOLDER_ID;
      } else {
        try {
          const mainFolderId = process.env.MAIN_DRIVE_FOLDER_ID || '1xcAsRKFb68aV4k__U7RiTFfblpSXQrlo';
          let policiesFolderId = await findFolder(drive, 'Policies', mainFolderId);
          if (!policiesFolderId) {
            policiesFolderId = await createFolder(drive, 'Policies', mainFolderId);
          }
          finalFolderId = policiesFolderId;
        } catch (folderError: any) {
          console.warn('Failed to resolve/create Policies folder in token route:', folderError.message);
          finalFolderId = process.env.MAIN_DRIVE_FOLDER_ID || '1xcAsRKFb68aV4k__U7RiTFfblpSXQrlo';
        }
      }
    } else if (targetFolderId === 'profile_uploads') {
      try {
        const mainFolderId = process.env.MAIN_DRIVE_FOLDER_ID || '1xcAsRKFb68aV4k__U7RiTFfblpSXQrlo';
        let profileFolderId = await findFolder(drive, 'Profile', mainFolderId);
        if (!profileFolderId) {
          profileFolderId = await createFolder(drive, 'Profile', mainFolderId);
        }
        finalFolderId = profileFolderId;
      } catch (folderError: any) {
        console.warn('Failed to resolve/create Profile folder in token route:', folderError.message);
        finalFolderId = process.env.MAIN_DRIVE_FOLDER_ID || '1xcAsRKFb68aV4k__U7RiTFfblpSXQrlo';
      }
    } else if (targetFolderId && targetFolderId !== 'root') {
      const sadhanaDbAdmin = getAdminSadhanaSupabase();
      if (sadhanaDbAdmin) {
        const { data: folderData } = await sadhanaDbAdmin
          .from('folders')
          .select('google_drive_folder_id')
          .eq('id', targetFolderId)
          .single();

        if (folderData?.google_drive_folder_id) {
          finalFolderId = folderData.google_drive_folder_id;
        }
      }
    }

    // 2. Default root upload flow: Organize by user name and file category
    if (!finalFolderId) {
      const sadhanaDbAdmin = getAdminSadhanaSupabase();
      if (!sadhanaDbAdmin) {
        throw new Error('Database initialization error');
      }

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

      const profile = await getUserData(user.id);
      const safeUserName = profile?.name || user.email?.split('@')[0] || 'User';
      const userFolderName = `${safeUserName} - ${membershipData.membership_id}`;

      const userFolderId = await findOrCreateFolder(drive, userFolderName, DATA_CENTER_DRIVE_FOLDER_ID);
      const fileCategory = getFileCategory(fileName || 'file', fileType || '');
      finalFolderId = await findOrCreateFolder(drive, fileCategory, userFolderId);
    }

    return NextResponse.json({
      accessToken,
      folderId: finalFolderId,
      userId: user.id
    });

  } catch (error: any) {
    console.error('Upload Token Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
