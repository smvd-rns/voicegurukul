import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';
import { checkRateLimit } from '@/lib/rate-limit';

// Target parent Google Drive folder specified by administration
const TARGET_PARENT_FOLDER_ID = '1rUQ1YoIp9tgL6RUM7S5cQmlHU2h4U4Rd';

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
    // Rate limit check: Maximum 10 receipt uploads per 10 minutes
    const rateLimit = await checkRateLimit(req, null, {
      action: 'camp_upload_accommodation_proof',
      limit: 10,
      windowMs: 10 * 60 * 1000,
      blockDurationMs: 15 * 60 * 1000,
    });

    if (rateLimit.blocked) {
      return NextResponse.json(
        { error: rateLimit.message || 'Too many upload attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Invalid request: Content-Type must be multipart/form-data' }, { status: 400 });
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: 'Malformed multipart form data' }, { status: 400 });
    }

    const file = formData.get('file') as File;
    const campTitle = (formData.get('campTitle') as string) || 'Camp_Retreat';
    const devoteeName = (formData.get('devoteeName') as string) || 'Devotee';
    const hotelName = (formData.get('hotelName') as string) || '';

    if (!file) {
      return NextResponse.json({ error: 'No hotel booking receipt file provided' }, { status: 400 });
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

    const safeCampName = campTitle.replace(/[^a-zA-Z0-9_\-\s]/g, '_').trim().substring(0, 50) || 'General_Camp';
    const safeDevoteeName = devoteeName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
    const safeExt = allowedExtensions.includes(ext) ? ext : 'jpg';
    const fileName = `HotelBooking_${Date.now()}_${safeDevoteeName}.${safeExt}`;

    try {
      const drive = await getDriveClient();

      // 1. Root folder inside target parent: "Camp Accommodation Hotel Bookings"
      const mainFolderId = await findOrCreateFolder(drive, 'Camp Accommodation Hotel Bookings', TARGET_PARENT_FOLDER_ID);

      // 2. Sub-folder for the specific camp: e.g. "Winter Camps 2026"
      const campFolderId = await findOrCreateFolder(drive, safeCampName, mainFolderId);

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
          parents: [campFolderId],
          description: hotelName ? `Hotel Booking Receipt for ${hotelName}` : undefined,
        },
        media: {
          mimeType: file.type || 'image/jpeg',
          body: stream,
        },
        fields: 'id, name, webViewLink, webContentLink',
      });

      const fileId = uploadRes.data.id!;

      // Make file viewable
      try {
        await drive.permissions.create({
          fileId,
          requestBody: { role: 'reader', type: 'anyone' },
        });
      } catch (permErr: any) {
        console.warn('File permission notice:', permErr.message);
      }

      // Permanent Direct LH3 Link or standard Drive link
      const directUrl = file.type === 'application/pdf'
        ? `https://drive.google.com/file/d/${fileId}/view?usp=sharing`
        : `https://lh3.googleusercontent.com/d/${fileId}=s1600`;

      return NextResponse.json({
        success: true,
        fileUrl: directUrl,
        fileId: fileId,
        webViewLink: `https://drive.google.com/file/d/${fileId}/view?usp=sharing`,
        fileName: fileName,
      });
    } catch (driveErr: any) {
      console.error('Drive upload failed for accommodation proof:', driveErr);
      return NextResponse.json(
        { error: 'Failed to upload hotel receipt to Google Drive: ' + (driveErr.message || 'Unknown error') },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error('Accommodation proof upload error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

