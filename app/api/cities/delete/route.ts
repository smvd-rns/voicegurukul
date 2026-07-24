import { NextResponse } from 'next/server';
import { deleteCityFromSupabase } from '@/lib/supabase/cities';

export async function POST(request: Request) {
  try {
    const { state, cityName } = await request.json();
    
    await deleteCityFromSupabase(state, cityName);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting city from Supabase:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete city' }, { status: 500 });
  }
}
