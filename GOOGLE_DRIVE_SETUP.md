# Google Drive Photo Upload Setup Guide

This guide explains how to set up Google Drive API integration for user photo uploads using OAuth 2.0.

## Prerequisites

1. A Google Cloud Project
2. Google Drive API enabled
3. OAuth 2.0 credentials (Client ID, Client Secret, Refresh Token)

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

## Step 2: Enable Google Drive API

1. In Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for "Google Drive API"
3. Click **Enable**

## Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. If prompted, configure the OAuth consent screen first:
   - Choose **External** (unless you have a Google Workspace)
   - Fill in required fields (App name, User support email, Developer contact)
   - Add scopes: `https://www.googleapis.com/auth/drive.file`
   - Add test users if needed
   - Save and continue
4. For OAuth client:
   - **Application type**: Choose **Desktop app** or **Web application**
   - **Name**: `ISKCON Photo Upload`
   - Click **Create**
5. Copy the **Client ID** and **Client Secret**

## Step 4: Generate a Fresh Refresh Token (Quick Guide)

Your refresh token is what keeps the server authenticated to Google Drive. Follow these simplified steps to get a fresh refresh token in **2 minutes**:

### Method 1: Using Google OAuth 2.0 Playground (Fastest & Simplest)

1. Go to the [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/).
2. **Configure your credentials (Client ID & Secret):**
   - Click the gear icon (⚙️) in the top-right corner to open Settings.
   - Find and check the checkbox **"Use your own OAuth credentials"** (this will open the fields for Client ID and Client Secret).
   - Paste your **Client ID** and **Client Secret** (from Step 3) into the corresponding input fields.
   - Ensure the dropdown **"Access type"** is set to **"Offline"** (this is critical to receive a refresh token).
   - Click the **Close** button.
3. **Select the scopes:**
   - In the left sidebar under "Step 1", scroll down or search for **Drive API v3**.
   - Expand the Drive API v3 category and tick/check `https://www.googleapis.com/auth/drive` (Full access) or `https://www.googleapis.com/auth/drive.file` (Recommended).
   - Click the blue **Authorize APIs** button.
4. **Grant permissions:**
   - Sign in with the Google account associated with the Drive folder.
   - If a warning appears saying *"Google hasn't verified this app"*, click **Advanced** at the bottom, then click **Go to ISKCON Photo Upload (unsafe)** to bypass it.
   - Click **Allow** on the next screen to grant the permissions.
5. **Generate and Copy the Refresh Token:**
   - You will be redirected back to the OAuth Playground (which will now show "Step 2" in the left panel).
   - Click the blue **"Exchange authorization code for tokens"** button.
   - Once clicked, look at the JSON response text on the right: find the `"refresh_token"` line and copy the token string next to it.
   - Paste this new token into the `GOOGLE_REFRESH_TOKEN` variable in your `.env.local` file.

---

### Method 2: Running a Quick Local Command

If you prefer to get a token directly from your terminal, we have a script ready for you.

1. Install `googleapis` if you haven't already:
   ```bash
   npm install googleapis
   ```
2. Create a temporary script file `get-token.js` in your workspace:
   ```javascript
   const { google } = require('googleapis');
   const readline = require('readline');

   const oauth2Client = new google.auth.OAuth2(
     'YOUR_GOOGLE_CLIENT_ID',
     'YOUR_GOOGLE_CLIENT_SECRET',
     'urn:ietf:wg:oauth:2.0:oob'
   );

   const authUrl = oauth2Client.generateAuthUrl({
     access_type: 'offline',
     scope: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'],
     prompt: 'consent' // Forces consent screen to ensure a refresh token is returned
   });

   console.log('\n1. Open this URL in your browser to authorize:\n', authUrl);

   const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
   rl.question('\n2. Enter the authorization code from that page here: ', async (code) => {
     rl.close();
     try {
       const { tokens } = await oauth2Client.getToken(code);
       console.log('\nSUCCESS! Copy the refresh token below:');
       console.log('GOOGLE_REFRESH_TOKEN =', tokens.refresh_token);
     } catch (err) {
       console.error('Error exchanging code:', err.message);
     }
   });
   ```
3. Run `node get-token.js` and follow the instructions in the terminal. Copy the printed token to your `.env.local` file.


## Step 5: Add Environment Variables

Add these to your `.env.local` file:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REFRESH_TOKEN=your-refresh-token
MAIN_DRIVE_FOLDER_ID=19ahwFj8uoW0JXsQDsqXNf7GdWL35gxdg
```

## Step 6: Install Google APIs Package

```bash
npm install googleapis
```

## Step 7: Verify Folder Access

1. Open the Google Drive folder: https://drive.google.com/drive/u/5/folders/19ahwFj8uoW0JXsQDsqXNf7GdWL35gxdg
2. Ensure the Google account associated with the OAuth credentials has access to this folder
3. The account should have **Editor** or **Owner** permissions

## Step 8: Test the Upload

1. Start your development server
2. Go to the registration page
3. Try uploading a photo
4. Check the Google Drive folder to verify the file was uploaded

## Troubleshooting

### Error: "Google Drive OAuth credentials not configured"
- Check that all three environment variables are set: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`
- Restart your development server after adding environment variables

### Error: "invalid_grant" or "Token has been expired or revoked"
- Your refresh token may have expired or been revoked
- Generate a new refresh token using the OAuth 2.0 Playground or script
- Update `GOOGLE_REFRESH_TOKEN` in `.env.local`

### Error: "Permission denied" or "File not found"
- Ensure the Google account has access to the folder
- Verify the `MAIN_DRIVE_FOLDER_ID` is correct
- Check that the folder ID matches: `19ahwFj8uoW0JXsQDsqXNf7GdWL35gxdg`

### Files not appearing in Drive
- Check server logs for detailed error messages
- Verify the OAuth scopes include `https://www.googleapis.com/auth/drive.file`
- Ensure the refresh token has the correct permissions

## Security Notes

1. **Never commit** `.env.local` to version control
2. Add `.env.local` to `.gitignore`
3. Use environment variables in production (Vercel, Netlify, etc.)
4. Refresh tokens don't expire unless revoked, but keep them secure
5. Consider rotating refresh tokens periodically

## File Naming Convention

Photos are automatically renamed using this format:
- Format: `{sanitized_username}_{timestamp}.{extension}`
- Example: `john_doe_1703123456789.jpg`
- Special characters are removed and spaces replaced with underscores

## Step 10: Test the Upload

1. Start your development server
2. Go to the registration page
3. Try uploading a photo
4. Check the Google Drive folder to verify the file was uploaded

## Troubleshooting

### Error: "Google Drive credentials not configured"
- Check that environment variables are set correctly
- Restart your development server after adding environment variables

### Error: "Permission denied"
- Ensure the service account email has Editor access to the Google Drive folder
- Verify the folder ID is correct

### Error: "Invalid credentials"
- Check that the private key includes all `\n` characters
- Ensure the private key is properly quoted in `.env.local`

### Files not appearing in Drive
- Check the folder permissions
- Verify the service account has access
- Check server logs for detailed error messages

## Security Notes

1. **Never commit** the service account JSON file or `.env.local` to version control
2. Add `.env.local` to `.gitignore`
3. Use environment variables in production (Vercel, Netlify, etc.)
4. Consider restricting the service account to only the specific folder
5. Regularly rotate service account keys

## File Naming Convention

Photos are automatically renamed using this format:
- Format: `{sanitized_username}_{timestamp}.{extension}`
- Example: `john_doe_1703123456789.jpg`
- Special characters are removed and spaces replaced with underscores
