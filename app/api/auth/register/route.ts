import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const { email, password, data } = await req.json();

    // 1. Check if user exists
    const checkUser = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (checkUser.rows.length > 0) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    // 2. Hash the password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 3. Generate UUID for the user
    const userId = uuidv4();

    // Extract user profile metadata
    const name = data?.name || email.split('@')[0];
    const role = data?.role || [1]; // default 1 (student)

    // 4. Insert user
    await query(
      `INSERT INTO users (id, email, name, role, password_hash) 
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, email, name, role, passwordHash]
    );

    return NextResponse.json({ success: true, message: 'User registered successfully' });
  } catch (error: any) {
    console.error('[Register API Error]', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
