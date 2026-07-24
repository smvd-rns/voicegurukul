import { NextResponse } from 'next/server';

// Google Drive API configuration
const FOLDER_ID = process.env.MAIN_DRIVE_FOLDER_ID || '1xcAsRKFb68aV4k__U7RiTFfblpSXQrlo';

// Initialize Google Drive API using OAuth 2.0
async function getDriveClient() {
  // Check if googleapis is installed
  let google;
  try {
    google = require('googleapis').google;
  } catch (error) {
    throw new Error('googleapis package not installed. Please run: npm install googleapis');
  }

  // Get OAuth credentials from environment variables
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google Drive OAuth credentials not configured. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN in environment variables.');
  }

  // Create OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'urn:ietf:wg:oauth:2.0:oob' // Redirect URI (not used for refresh token flow)
  );

  // Set the refresh token
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  // Create Drive client with OAuth2
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  return drive;
}

// Upload file to Google Drive
async function uploadToDrive(fileBuffer: Buffer, fileName: string, mimeType: string, targetFolderId: string): Promise<string> {
  try {
    const drive = await getDriveClient();

    // Create file metadata
    const fileMetadata = {
      name: fileName,
      parents: [targetFolderId], // Upload to the specified folder
    };

    // Convert buffer to stream for Google Drive API
    // Create a proper Readable stream from the buffer
    const { Readable } = require('stream');
    const stream = new Readable({
      read() {
        this.push(fileBuffer);
        this.push(null); // End the stream
      }
    });

    const media = {
      mimeType: mimeType,
      body: stream,
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink, webContentLink, thumbnailLink',
    });

    if (!response.data.id) {
      throw new Error('Failed to upload file to Google Drive: No file ID returned');
    }

    // Make the file publicly viewable (optional, adjust based on your needs)
    try {
      const permRes = await drive.permissions.create({
        fileId: response.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
      console.log('Permission set result:', permRes.status);
    } catch (permError: any) {
      // Log but don't fail if permission setting fails
      console.warn('Failed to set file permissions (file still uploaded):', permError.message);
    }

    // Construct the direct image URL for Google Drive files
    // Using the stable lh3 link format directly is the best way to avoid expiring drive-storage URLs
    const directImageUrl = `https://lh3.googleusercontent.com/d/${response.data.id}=s1600`;

    // Return the file ID, view link, and direct image URL
    return JSON.stringify({
      fileId: response.data.id,
      fileName: response.data.name,
      webViewLink: response.data.webViewLink,
      webContentLink: response.data.webContentLink,
      thumbnailLink: response.data.thumbnailLink,
      directImageUrl: directImageUrl, // High-res thumbnail or standard view link
    });
  } catch (error: any) {
    console.error('Error uploading to Google Drive:', error);
    throw new Error(`Failed to upload to Google Drive: ${error.message}`);
  }
}

// Find folder by name in a parent folder
async function findFolder(folderName: string, parentFolderId: string): Promise<string | null> {
  try {
    const drive = await getDriveClient();
    const response = await drive.files.list({
      q: `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed = false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    const files = response.data.files;
    if (files && files.length > 0) {
      return files[0].id!;
    }
    return null;
  } catch (error: any) {
    console.error('Error finding folder in Google Drive:', error);
    throw new Error(`Failed to find folder: ${error.message}`);
  }
}

// Create folder in Google Drive
async function createFolder(folderName: string, parentFolderId: string): Promise<string> {
  try {
    const drive = await getDriveClient();
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

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const action = formData.get('action') as string || 'upload';

    if (action === 'create-folder') {
      const folderName = formData.get('folderName') as string;
      const parentId = formData.get('parentFolderId') as string || FOLDER_ID;
      if (!folderName) {
        return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
      }
      const folderId = await createFolder(folderName, parentId);
      return NextResponse.json({ success: true, folderId });
    }

    if (action === 'find-folder') {
      const folderName = formData.get('folderName') as string;
      const parentId = formData.get('parentFolderId') as string || FOLDER_ID;
      if (!folderName) {
        return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
      }
      const folderId = await findFolder(folderName, parentId);
      return NextResponse.json({ success: true, folderId });
    }

    const file = formData.get('file') as File;
    const userName = formData.get('userName') as string;
    let targetFolderId = formData.get('folderId') as string || FOLDER_ID;

    // Handle stale policy folder ID or dynamic policy folder fallback
    const STALE_POLICY_FOLDER_ID = '1b94q4-8wVGVU_pv4AUVpTFMrnfY9v2ng';
    if (targetFolderId === STALE_POLICY_FOLDER_ID) {
      if (process.env.POLICY_DRIVE_FOLDER_ID) {
        targetFolderId = process.env.POLICY_DRIVE_FOLDER_ID;
      } else {
        // Find or create 'Policies' folder under the main folder ID
        try {
          const mainFolderId = process.env.MAIN_DRIVE_FOLDER_ID || FOLDER_ID;
          let policiesFolderId = await findFolder('Policies', mainFolderId);
          if (!policiesFolderId) {
            policiesFolderId = await createFolder('Policies', mainFolderId);
          }
          targetFolderId = policiesFolderId;
        } catch (folderError: any) {
          console.warn('Failed to resolve/create Policies folder, falling back to main folder:', folderError.message);
          targetFolderId = FOLDER_ID;
        }
      }
    }

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!userName) {
      return NextResponse.json({ error: 'User name is required' }, { status: 400 });
    }

    // Allowed types expanded for general attachments
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg',
      'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'
    ];

    // We allow most types now since it's used for attachments too
    // But we still check common potentially harmful types if needed
    const blockedExtensions = ['exe', 'bat', 'sh', 'js', 'vbs'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    if (blockedExtensions.includes(fileExtension)) {
      return NextResponse.json({ error: 'File type not allowed for security reasons' }, { status: 400 });
    }

    // Sanitize user name for filename
    const sanitizedName = userName
      .trim()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .toLowerCase();

    // Create filename: OriginalName_Date.extension
    const now = new Date();
    const dateString = now.toISOString().split('T')[0];
    const originalName = file.name.split('.')[0].substring(0, 30);
    const fileName = `${originalName}_${dateString}.${fileExtension}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Google Drive (directly or into subfolder)
    const driveResponse = await uploadToDrive(buffer, fileName, file.type, targetFolderId);

    return NextResponse.json({
      success: true,
      data: {
        ...JSON.parse(driveResponse),
        uploadedToFolderId: targetFolderId,
      }
    });
  } catch (error: any) {
    console.error('Error in Google Drive upload route:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to process request',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
