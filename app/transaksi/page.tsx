"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Transaction } from "@/types/pos";
import { Receipt, Search, Calendar, Eye, Loader2, X } from "lucide-react";

export default function TransaksiPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Detail Modal
  const [selectedTrx, setSelectedTrx] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const supabase = createClient();

  const fetchTransactions = async () => {
    setLoading(true);
    let query = supabase
      .from("transactions")
      .select("*, profiles(nama), customers(nama)")
      .order("id", { ascending: false });

    if (startDate) {
      query = query.gte("tanggal_transaksi", `${startDate}T00:00:00Z`);
    }
    if (endDate) {
      query = query.lte("tanggal_transaksi", `${endDate}T23:59:59Z`);
    }

    const { data, error } = await query;
    if (!error && data) {
      setTransactions(data as Transaction[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTransactions();
  }, [startDate, endDate]);

  const viewDetail = async (trx: Transaction) => {
    setDetailLoading(true);
    setSelectedTrx(trx);

    const { data } = await supabase
      .from("transaction_items")
      .select("*, products(sku, nama_barang)")
      .eq("transaction_id", trx.id);

    setSelectedTrx({ ...trx, items: data || [] });
    setDetailLoading(false);
  };

  const filtered = transactions.filter((t) => {
    const trxId = `#TRX-${t.id}`.toLowerCase();
    const cust = (t.customers?.nama || "Umum").toLowerCase();
    const kasir = (t.profiles?.nama || "").toLowerCase();
    const s = searchTerm.toLowerCase();
    return trxId.includes(s) || cust.includes(s) || kasir.includes(s);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Riwayat Transaksi</h1>
        <p className="text-sm text-gray-500">Daftar rekap transaksi penjualan toko dan detail invoice</p>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari ID transaksi atau nama..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500">Dari:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-red-600"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500">Sampai:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-red-600"
            />
          </div>
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              className="text-xs text-red-600 hover:underline cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Tabel Transaksi */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-700">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-600 uppercase border-b border-gray-200">
              <tr>
                <th className="px-6 py-3.5">ID Transaksi</th>
                <th className="px-6 py-3.5">Tanggal</th>
                <th className="px-6 py-3.5">Pelanggan</th>
                <th className="px-6 py-3.5">Kasir</th>
                <th className="px-6 py-3.5">Metode</th>
                <th className="px-6 py-3.5 text-right">Total Transaksi</th>
                <th className="px-6 py-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-red-600 mb-2" />
                    <span className="text-gray-400">Memuat transaksi...</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    <Receipt className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    Belum ada riwayat transaksi.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-mono font-bold text-xs text-red-700">
                      #TRX-{t.id}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600">
                      {new Date(t.tanggal_transaksi).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {t.customers?.nama || "Pelanggan Umum"}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600">
                      {t.profiles?.nama || "Kasir"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                        {t.metode_pembayaran}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">
                      Rp {Number(t.total_harga).toLocaleString("id-ID")}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => viewDetail(t)}
                        className="inline-flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 transition"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" /> Detail
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail Transaksi */}
      {selectedTrx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 bg-red-700 text-white">
              <h3 className="font-bold text-base">Invoice #TRX-{selectedTrx.id}</h3>
              <button
                onClick={() => setSelectedTrx(null)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 text-xs gap-2 pb-3 border-b border-gray-100">
                <div>
                  <p className="text-gray-400">Pelanggan:</p>
                  <p className="font-semibold text-gray-800">
                    {selectedTrx.customers?.nama || "Pelanggan Umum"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Metode Bayar:</p>
                  <p className="font-semibold text-gray-800">
                    {selectedTrx.metode_pembayaran}
                  </p>
                </div>
              </div>

              {detailLoading ? (
                <div className="py-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-red-600" />
                </div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
                  {selectedTrx.items?.map((item: any) => (
                    <div key={item.id} className="py-2.5 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-semibold text-gray-800">
                          {item.products?.nama_barang || "Produk"}
                        </p>
                        <p className="text-gray-500">
                          {item.jumlah} x Rp {Number(item.harga_satuan).toLocaleString("id-ID")}
                        </p>
                      </div>
                      <span className="font-bold text-gray-900">
                        Rp {(item.jumlah * item.harga_satuan).toLocaleString("id-ID")}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                <span className="font-bold text-sm text-gray-700">Total Pembayaran:</span>
                <span className="font-extrabold text-lg text-red-700">
                  Rp {Number(selectedTrx.total_harga).toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
