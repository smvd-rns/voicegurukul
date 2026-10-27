import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';

const MAIN_FOLDER_ID = process.env.MAIN_DRIVE_FOLDER_ID || '1xcAsRKFb68aV4k__U7RiTFfblpSXQrlo';

async function getDriveClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google Drive credentials not configured');
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'urn:ietf:wg:oauth:2.0:oob'
  );

  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.drive({ version: 'v3', auth: oauth2Client });
}

async function findFolder(drive: any, folderName: string, parentFolderId: string): Promise<string | null> {
  try {
    const escapedName = folderName.replace(/'/g, "\\'");
    const res = await drive.files.list({
      q: `name = '${escapedName}' and mimeType = 'application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed = false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });
    if (res.data.files && res.data.files.length > 0) {
      return res.data.files[0].id!;
    }
    return null;
  } catch (err: any) {
    console.error('Error finding folder in Google Drive:', err.message);
    return null;
  }
}

async function createFolder(drive: any, folderName: string, parentFolderId: string): Promise<string> {
  const res = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    fields: 'id, name',
  });

  const folderId = res.data.id!;
  try {
    await drive.permissions.create({
      fileId: folderId,
      requestBody: { role: 'reader', type: 'anyone' },
    });
  } catch (permErr: any) {
    console.warn('Folder permission notice:', permErr.message);
  }
  return folderId;
}

async function findOrCreateFolder(drive: any, folderName: string, parentFolderId: string): Promise<string> {
  const existingId = await findFolder(drive, folderName, parentFolderId);
  if (existingId) return existingId;
  return await createFolder(drive, folderName, parentFolderId);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const campTitle = (formData.get('campTitle') as string) || 'General Camps';
    const devoteeName = (formData.get('devoteeName') as string) || 'Devotee';

    if (!file) {
      return NextResponse.json({ error: 'No screenshot file provided' }, { status: 400 });
    }

    // Security Check: Enforce maximum file size (5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds limit (maximum 5MB allowed)' }, { status: 400 });
    }

    // Security Check: Enforce allowed extensions & MIME types (images & PDF only)
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

    if (!allowedExtensions.includes(ext) || (file.type && !allowedMimeTypes.includes(file.type.toLowerCase()))) {
      return NextResponse.json({ error: 'Invalid file type. Only JPG, PNG, WEBP, and PDF files are allowed.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Clean names to prevent path traversal
    const safeCampName = campTitle.replace(/[^a-zA-Z0-9_\-\s]/g, '_').trim().substring(0, 50) || 'General_Camp';
    const safeDevoteeName = devoteeName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
    const safeExt = allowedExtensions.includes(ext) ? ext : 'jpg';
    const fileName = `Payment_${Date.now()}_${safeDevoteeName}.${safeExt}`;

    // Try Google Drive upload first
    try {
      const drive = await getDriveClient();

      // 1. Root "Camps" folder
      const campsRootId = await findOrCreateFolder(drive, 'Camps', MAIN_FOLDER_ID);

      // 2. Camp-specific folder (e.g. "Annual Camp 2026")
      const campSpecificFolderId = await findOrCreateFolder(drive, safeCampName, campsRootId);

      // 3. Upload file
      const stream = new Readable({
        read() {
          this.push(buffer);
          this.push(null);
        },
      });

      const uploadRes = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [campSpecificFolderId],
        },
        media: {
          mimeType: file.type || 'image/jpeg',
          body: stream,
        },
        fields: 'id, name, webViewLink, webContentLink',
      });

      const fileId = uploadRes.data.id;
      if (!fileId) throw new Error('No Drive file ID returned');

      try {
        await drive.permissions.create({
          fileId,
          requestBody: { role: 'reader', type: 'anyone' },
        });
      } catch (permErr: any) {
        console.warn('File permission notice:', permErr.message);
      }

      const directUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
      const webViewLink = uploadRes.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

      return NextResponse.json({
        success: true,
        url: directUrl,
        fileId,
        webViewLink,
        fileName,
      });
    } catch (driveErr: any) {
      console.warn('Google Drive upload failed or unconfigured, using local public fallback:', driveErr.message);

      // Local fallback in public/uploads/camps
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'camps', safeCampName);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, buffer);

      const localUrl = `/uploads/camps/${encodeURIComponent(safeCampName)}/${fileName}`;
      return NextResponse.json({
        success: true,
        url: localUrl,
        fileName,
        note: 'Saved locally',
      });
    }
  } catch (err: any) {
    console.error('Camp payment proof upload error:', err);
    return NextResponse.json({ error: err.message || 'Failed to upload screenshot' }, { status: 500 });
  }
}
