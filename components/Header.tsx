"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/types/pos";
import {
  User,
  KeyRound,
  Camera,
  Loader2,
  X,
  CheckCircle,
  AlertCircle
} from "lucide-react";

export default function Header() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Form State
  const [nama, setNama] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const loadUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) {
      setProfile(data as Profile);
      setNama(data.nama);
      setAvatarUrl(data.avatar_url || "");
    }
  };

  useEffect(() => {
    loadUserProfile();
  }, []);

  // Klik di luar dropdown untuk menutup
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openProfileModal = () => {
    if (profile) {
      setNama(profile.nama);
      setAvatarUrl(profile.avatar_url || "");
    }
    setNewPassword("");
    setConfirmPassword("");
    setMsg(null);
    setIsDropdownOpen(false);
    setIsModalOpen(true);
  };

  // Upload Foto ke Supabase Storage (atau fallback base64 jika bucket belum ada)
  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (file.size > 2 * 1024 * 1024) {
      setMsg({ type: "error", text: "Ukuran foto maksimal 2MB!" });
      return;
    }

    setUploading(true);
    setMsg(null);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Coba upload ke bucket 'avatars' di Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        // Fallback: Jika bucket belum dibuat, gunakan Base64 Data URL agar foto tetap tersimpan & tampil!
        const reader = new FileReader();
        reader.onloadend = () => {
          setAvatarUrl(reader.result as string);
          setUploading(false);
        };
        reader.readAsDataURL(file);
        return;
      }

      // Ambil Public URL jika berhasil di bucket
      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrlData.publicUrl);
    } catch (err: any) {
      setMsg({ type: "error", text: "Gagal mengunggah foto: " + err.message });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    setMsg(null);

    try {
      // 1. Simpan Nama & Foto ke tabel profiles
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          nama: nama.trim(),
          avatar_url: avatarUrl || null,
        })
        .eq("id", profile.id);

      if (profileError) {
        throw new Error("Gagal menyimpan profil: " + profileError.message);
      }

      // 2. Ganti Password jika diisi
      if (newPassword) {
        if (newPassword.length < 6) {
          throw new Error("Password baru minimal harus 6 karakter!");
        }
        if (newPassword !== confirmPassword) {
          throw new Error("Konfirmasi password tidak cocok!");
        }

        const { error: passError } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (passError) {
          throw new Error("Gagal mengubah password: " + passError.message);
        }
      }

      setMsg({ type: "success", text: "Profil dan akun berhasil diperbarui!" });
      loadUserProfile();
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        setIsModalOpen(false);
        setMsg(null);
      }, 1500);
    } catch (err: any) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Inisial Nama (Misal: "Adi Pratama" -> "AP")
  const getInitials = (name?: string) => {
    if (!name) return "AG";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-20">
        <div className="flex items-center">
          <span className="text-sm font-semibold text-gray-700 hidden sm:inline">
            Sistem Kasir Toko Grosir
          </span>
        </div>

        {/* Info Toko & Avatar Profil Interaktif */}
        <div className="flex items-center space-x-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-gray-900 leading-tight">
              {profile?.nama || "Toko Adi Grosir"}
            </p>
            <p className="text-xs text-red-700 capitalize font-medium">
              {profile?.role || "Kasir"}
            </p>
          </div>

          {/* Avatar Dropdown Trigger */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-10 h-10 rounded-full bg-red-100 border-2 border-red-700 flex items-center justify-center text-red-700 font-bold overflow-hidden cursor-pointer shadow-xs hover:opacity-90 transition focus:outline-none"
              title="Menu Profil"
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.nama}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{getInitials(profile?.nama)}</span>
              )}
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-xs text-gray-400">Login sebagai</p>
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {profile?.nama || "Pengguna"}
                  </p>
                </div>
                <button
                  onClick={openProfileModal}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-red-50 hover:text-red-700 flex items-center gap-2 transition cursor-pointer"
                >
                  <User className="w-4 h-4 text-gray-500" />
                  Pengaturan Profil Saya
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modal Edit Profil & Ganti Password */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="flex items-center justify-between px-6 py-4 bg-red-700 text-white">
              <h3 className="font-bold text-base flex items-center gap-2">
                <User className="w-5 h-5" /> Edit Profil Pengguna
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Alert Notifikasi */}
            {msg && (
              <div
                className={`mx-6 mt-4 p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                  msg.type === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {msg.type === "success" ? (
                  <CheckCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{msg.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
              {/* Bagian Ubah Foto Profil */}
              <div className="flex flex-col items-center justify-center pb-2">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-20 h-20 rounded-full border-2 border-red-700 overflow-hidden bg-red-100 flex items-center justify-center text-red-700 font-bold text-xl shadow-md">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      getInitials(nama)
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                    <Camera className="w-6 h-6" />
                  </div>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleUploadImage}
                  accept="image/*"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="mt-2 text-xs font-semibold text-red-700 hover:text-red-800 cursor-pointer"
                >
                  {uploading ? "Mengunggah foto..." : "Ganti Foto Profil"}
                </button>
                <span className="text-[10px] text-gray-400">Format JPG, PNG (Maks 2MB)</span>
              </div>

              {/* Ubah Nama */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Nama lengkap Anda..."
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-600 focus:outline-none"
                />
              </div>

              {/* Ganti Password Section */}
              <div className="pt-2 border-t border-gray-100 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                  <KeyRound className="w-4 h-4 text-red-700" />
                  <span>Ubah Kata Sandi (Opsional)</span>
                </div>
                <p className="text-[11px] text-gray-400 -mt-2">
                  Kosongkan jika Anda tidak ingin mengganti kata sandi.
                </p>

                <div className="space-y-2">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Kata Sandi Baru (Minimal 6 karakter)"
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-600 focus:outline-none"
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi Kata Sandi Baru"
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Tombol Simpan */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center disabled:opacity-50 cursor-pointer"
                >
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
