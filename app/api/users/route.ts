import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { email, password, nama, role } = await request.json();

    if (!email || !password || !nama) {
      return NextResponse.json(
        { error: "Email, password, dan nama wajib diisi." },
        { status: 400 }
      );
    }

    const adminSupabase = await createAdminClient();

    // 1. Buat User di Supabase Auth via Admin API
    const { data: authData, error: authError } =
      await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nama, role: role || "kasir" },
      });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // 2. Pastikan Profil tersinkron di tabel profiles
    if (authData.user) {
      await adminSupabase.from("profiles").upsert({
        id: authData.user.id,
        nama,
        role: role || "kasir",
      });
    }

    return NextResponse.json({ success: true, user: authData.user });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
