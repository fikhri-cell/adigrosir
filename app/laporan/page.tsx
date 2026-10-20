"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  FileText,
  Printer,
  Calendar,
  Download,
  TrendingUp,
  CreditCard,
  ShoppingBag,
  Loader2
} from "lucide-react";

export default function LaporanPage() {
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [transactions, setTransactions] = useState<any[]>([]);

  const supabase = createClient();

  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const today = now.toISOString().split("T")[0];
    setStartDate(firstDay);
    setEndDate(today);
  }, []);

  const fetchLaporan = async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    const { data } = await supabase
      .from("transactions")
      .select("*, profiles(nama), customers(nama), transaction_items(*, products(nama_barang))")
      .gte("tanggal_transaksi", `${startDate}T00:00:00Z`)
      .lte("tanggal_transaksi", `${endDate}T23:59:59Z`)
      .order("tanggal_transaksi", { ascending: false });

    setTransactions(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (startDate && endDate) {
      fetchLaporan();
    }
  }, [startDate, endDate]);

  const totalOmzet = transactions.reduce(
    (acc, t) => acc + Number(t.total_harga || 0),
    0
  );
  const totalTrxCount = transactions.length;
  const totalItemTerjual = transactions.reduce((acc, t) => {
    const items = t.transaction_items || [];
    return acc + items.reduce((iAcc: number, item: any) => iAcc + item.jumlah, 0);
  }, 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header & Tombol Export / Print */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Penjualan</h1>
          <p className="text-sm text-gray-500">
            Rekap pendapatan dan performa penjualan toko grosir
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center px-4 py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-lg text-sm font-semibold shadow-xs transition cursor-pointer"
          >
            <Printer className="w-4 h-4 mr-2" />
            Cetak / PDF
          </button>
        </div>
      </div>

      {/* Filter Tanggal */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap items-center gap-4 print:hidden">
        <span className="text-sm font-medium text-gray-700">Periode Laporan:</span>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-red-600"
          />
          <span className="text-gray-400">s/d</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-red-600"
          />
        </div>
      </div>

      {/* Ringkasan Laporan (Kartu Statistik) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-700 mr-4">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Total Omzet</p>
            <p className="text-xl font-black text-gray-900">
              Rp {totalOmzet.toLocaleString("id-ID")}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 mr-4">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Jumlah Transaksi</p>
            <p className="text-xl font-black text-gray-900">{totalTrxCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-700 mr-4">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Item Terjual</p>
            <p className="text-xl font-black text-gray-900">{totalItemTerjual} unit</p>
          </div>
        </div>
      </div>

      {/* Tabel Rincian Penjualan */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-gray-800 text-sm">Rincian Penjualan Periode Ini</h3>
          <span className="text-xs text-gray-500 font-mono">
            {startDate} hingga {endDate}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-700">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-600 uppercase border-b border-gray-200">
              <tr>
                <th className="px-6 py-3">ID</th>
                <th className="px-6 py-3">Tanggal</th>
                <th className="px-6 py-3">Pelanggan</th>
                <th className="px-6 py-3">Metode</th>
                <th className="px-6 py-3 text-right">Nilai Transaksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-red-600 mb-2" />
                    <span className="text-gray-400">Mengambil rekap data...</span>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    Tidak ada transaksi pada periode tanggal ini.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3.5 font-mono text-xs text-red-700 font-semibold">
                      #TRX-{t.id}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-gray-600">
                      {new Date(t.tanggal_transaksi).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-6 py-3.5 font-medium text-gray-900">
                      {t.customers?.nama || "Pelanggan Umum"}
                    </td>
                    <td className="px-6 py-3.5 text-xs">
                      {t.metode_pembayaran}
                    </td>
                    <td className="px-6 py-3.5 text-right font-bold text-gray-900">
                      Rp {Number(t.total_harga).toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {transactions.length > 0 && (
              <tfoot className="bg-gray-50 font-bold text-gray-900">
                <tr>
                  <td colSpan={4} className="px-6 py-3.5 text-right">
                    TOTAL KESELURUHAN:
                  </td>
                  <td className="px-6 py-3.5 text-right text-red-700 text-base">
                    Rp {totalOmzet.toLocaleString("id-ID")}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
