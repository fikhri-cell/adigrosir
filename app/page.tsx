"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  TrendingUp,
  Receipt,
  Package,
  Users,
  AlertTriangle,
  ArrowRight,
  Loader2
} from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPenjualan: 0,
    transaksiHariIni: 0,
    totalBarang: 0,
    totalPelanggan: 0,
  });
  const [recentTrx, setRecentTrx] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);

  const supabase = createClient();

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);

      const today = new Date().toISOString().split("T")[0];

      // 1. Hitung total transaksi & omzet
      const { data: allTrx } = await supabase
        .from("transactions")
        .select("total_harga, tanggal_transaksi");

      const totalPenjualan = (allTrx || []).reduce(
        (acc, t) => acc + Number(t.total_harga || 0),
        0
      );
      const transaksiHariIni = (allTrx || []).filter((t) =>
        t.tanggal_transaksi.startsWith(today)
      ).length;

      // 2. Hitung jumlah produk & pelanggan
      const [{ count: productCount }, { count: customerCount }] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("customers").select("*", { count: "exact", head: true }),
      ]);

      // 3. Ambil 5 transaksi terakhir
      const { data: lastTrx } = await supabase
        .from("transactions")
        .select("*, customers(nama)")
        .order("id", { ascending: false })
        .limit(5);

      // 4. Ambil barang yang stoknya menipis (<= 5)
      const { data: lowStock } = await supabase
        .from("products")
        .select("id, sku, nama_barang, inventory(jumlah_stok)")
        .order("id", { ascending: false });

      const filteredLowStock = (lowStock || [])
        .filter((p: any) => (p.inventory?.jumlah_stok ?? 0) <= 5)
        .slice(0, 5);

      setStats({
        totalPenjualan,
        transaksiHariIni,
        totalBarang: productCount || 0,
        totalPelanggan: customerCount || 0,
      });
      setRecentTrx(lastTrx || []);
      setLowStockItems(filteredLowStock);
      setLoading(false);
    }

    loadDashboardData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Judul & Sapaan */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Toko</h1>
          <p className="text-sm text-gray-500">
            Ringkasan performa dan aktivitas toko grosir terkini
          </p>
        </div>
        <Link
          href="/kasir"
          className="inline-flex items-center px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg text-sm font-semibold shadow-xs transition"
        >
          Buka Kasir <ArrowRight className="w-4 h-4 ml-1.5" />
        </Link>
      </div>

      {/* 4 Kartu Statistik */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-700 mr-4">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Total Penjualan</p>
            <p className="text-xl font-black text-gray-900">
              {loading ? "..." : `Rp ${stats.totalPenjualan.toLocaleString("id-ID")}`}
            </p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 mr-4">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Transaksi Hari Ini</p>
            <p className="text-xl font-black text-gray-900">
              {loading ? "..." : stats.transaksiHariIni}
            </p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-700 mr-4">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Total Barang</p>
            <p className="text-xl font-black text-gray-900">
              {loading ? "..." : stats.totalBarang}
            </p>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center">
          <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 mr-4">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Total Pelanggan</p>
            <p className="text-xl font-black text-gray-900">
              {loading ? "..." : stats.totalPelanggan}
            </p>
          </div>
        </div>
      </div>

      {/* Grid 2 Kolom: Transaksi Terakhir & Peringatan Stok Menipis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kolom Kiri: Transaksi Terkini */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-bold text-gray-900">Transaksi Terakhir</h2>
            <Link href="/transaksi" className="text-xs text-red-700 hover:underline font-semibold">
              Lihat Semua
            </Link>
          </div>

          {loading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-red-600" />
            </div>
          ) : recentTrx.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              Belum ada riwayat transaksi penjualan.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentTrx.map((t) => (
                <div key={t.id} className="py-3 flex justify-between items-center text-sm">
                  <div>
                    <span className="font-mono text-xs font-bold text-red-700 block">
                      #TRX-{t.id}
                    </span>
                    <span className="text-xs text-gray-500">
                      {t.customers?.nama || "Pelanggan Umum"} • {t.metode_pembayaran}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-gray-900 block">
                      Rp {Number(t.total_harga).toLocaleString("id-ID")}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(t.tanggal_transaksi).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Kolom Kanan: Peringatan Stok Menipis */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-bold text-gray-900">Peringatan Stok Menipis</h2>
            </div>
            <Link href="/stok" className="text-xs text-red-700 hover:underline font-semibold">
              Kelola Stok
            </Link>
          </div>

          {loading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-red-600" />
            </div>
          ) : lowStockItems.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              Semua stok barang dalam kondisi aman.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {lowStockItems.map((item: any) => {
                const stok = item.inventory?.jumlah_stok ?? 0;
                return (
                  <div key={item.id} className="py-3 flex justify-between items-center text-sm">
                    <div>
                      <span className="font-semibold text-gray-900 block">
                        {item.nama_barang}
                      </span>
                      <span className="text-xs font-mono text-gray-400">{item.sku}</span>
                    </div>
                    <div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          stok === 0
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        Sisa {stok} unit
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
