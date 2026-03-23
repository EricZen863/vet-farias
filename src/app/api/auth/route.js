import { NextResponse } from 'next/server';
import { initDB, getSQL, isDBAvailable } from '../../../lib/db';

export async function POST(request) {
  const body = await request.json();
  const { action, username, password, currentPassword, newUsername, newPassword } = body;

  if (!isDBAvailable()) {
    if (action === 'login') {
      if (username === 'admin' && password === 'vetfarias2024') {
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ success: false, error: 'Usu\u00e1rio ou senha inv\u00e1lidos' });
    }
    return NextResponse.json({ success: false, error: 'Banco de dados n\u00e3o dispon\u00edvel' });
  }

  await initDB();
  const sql = getSQL();

  if (action === 'login') {
    const rows = await sql`SELECT * FROM credentials WHERE username = ${username} AND password = ${password}`;
    if (rows.length > 0) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false, error: 'Usu\u00e1rio ou senha inv\u00e1lidos' });
  }

  if (action === 'change') {
    const rows = await sql`SELECT * FROM credentials WHERE password = ${currentPassword}`;
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Senha atual incorreta' });
    }
    if (!newUsername || newUsername.trim().length < 3) {
      return NextResponse.json({ success: false, error: 'Novo usu\u00e1rio deve ter pelo menos 3 caracteres' });
    }
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ success: false, error: 'Nova senha deve ter pelo menos 6 caracteres' });
    }
    await sql`UPDATE credentials SET username = ${newUsername.trim()}, password = ${newPassword} WHERE id = ${rows[0].id}`;
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
