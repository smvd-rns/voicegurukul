import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const admin = getAdminClient();
    const { data: settings, error } = await admin
      .from('platform_settings')
      .select('*');

    return NextResponse.json({ settings, error });
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}

