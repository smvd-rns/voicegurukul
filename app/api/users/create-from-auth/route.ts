import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-db';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const supabase = createClient();

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing user:', checkError);
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    if (existingUser) {
      return NextResponse.json({ success: true, message: 'User already exists', id: existingUser.id });
    }

    // Create user record
    const { data: insertedUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: user.id,
        email: user.email?.toLowerCase() || '',
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        role: [1],
        state: null,
        city: null,
        center: null,
        counselor: null,
        counselor_id: null,
        hierarchy: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error creating user record:', insertError);
      if (insertError.code === '23505') {
        return NextResponse.json({ success: true, message: 'User already exists' });
      }
      return NextResponse.json({
        error: insertError.message || 'Failed to create user record',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      id: insertedUser?.id
    });
  } catch (error: any) {
    console.error('Error in create-from-auth:', error);
    return NextResponse.json({
      error: error.message || 'Failed to create user',
    }, { status: 500 });
  }
}
