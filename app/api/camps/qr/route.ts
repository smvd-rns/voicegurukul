import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const data = searchParams.get('data') || searchParams.get('text') || searchParams.get('id');

  if (!data) {
    return new NextResponse('Missing data parameter', { status: 400 });
  }

  // If parameter is a registration ID, form verification URL
  let targetUrl = data;
  if (!data.startsWith('http://') && !data.startsWith('https://')) {
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://voicegurukul.com';
    targetUrl = `${origin.replace(/\/$/, '')}/camps/verify-pass?id=${encodeURIComponent(data)}`;
  }

  try {
    const pngBuffer = await QRCode.toBuffer(targetUrl, {
      width: 320,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    return new NextResponse(new Uint8Array(pngBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('Failed to generate QR code PNG:', error);
    return new NextResponse('Error generating QR code', { status: 500 });
  }
}
