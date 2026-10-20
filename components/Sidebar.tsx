"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  Calculator,
  Package,
  Boxes,
  Receipt,
  Users,
  FileText,
  Settings,
  Store,
  LogOut
} from "lucide-react";

interface MenuItem {
  name: string;
  href: string;
  icon: any;
  adminOnly?: boolean;
}

const allMenuItems: MenuItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Kasir", href: "/kasir", icon: Calculator },
  { name: "Barang", href: "/barang", icon: Package },
  { name: "Stok", href: "/stok", icon: Boxes },
  { name: "Transaksi", href: "/transaksi", icon: Receipt },
  { name: "Pelanggan", href: "/pelanggan", icon: Users },
  { name: "Laporan", href: "/laporan", icon: FileText },
  { name: "Pengaturan", href: "/pengaturan", icon: Settings, adminOnly: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userRole, setUserRole] = useState<string>("kasir");
  const [userName, setUserName] = useState<string>("Memuat...");

  useEffect(() => {
    async function fetchUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("nama, role")
          .eq("id", user.id)
          .single();

        if (profile) {
          setUserRole(profile.role);
          setUserName(profile.nama || user.email || "Kasir");
        } else {
          setUserName(user.email || "Kasir");
        }
      }
    }
    fetchUser();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  };

  // Filter menu: jika role bukan admin, jangan tampilkan menu khusus admin (Pengaturan)
  const menuItems = allMenuItems.filter(
    (item) => !item.adminOnly || userRole === "admin"
  );

  return (
    <aside className="w-64 bg-red-700 text-white flex flex-col h-screen sticky top-0 shadow-lg select-none">
      <div className="h-16 flex items-center px-6 border-b border-red-800 bg-red-800">
        <Store className="w-6 h-6 mr-3 text-red-200" />
        <span className="text-lg font-bold tracking-wide">Adi Grosir</span>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? "bg-red-800 text-white font-medium shadow-inner"
                      : "text-red-100 hover:bg-red-600 hover:text-white"
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Info User & Tombol Logout */}
      <div className="p-4 border-t border-red-800 bg-red-800/40">
        <div className="flex items-center justify-between">
          <div className="text-xs overflow-hidden pr-2">
            <p className="text-red-300 capitalize font-medium">{userRole}</p>
            <p className="font-semibold text-white truncate max-w-[130px]">{userName}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Keluar"
            className="p-2 rounded-lg bg-red-800 hover:bg-red-600 text-red-200 hover:text-white transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
