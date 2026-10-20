"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Product } from "@/types/pos";
import { Search, Boxes, ArrowUpRight, ArrowDownRight, RefreshCw, Loader2, X } from "lucide-react";

export default function StokPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal Adjustment
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<"masuk" | "keluar">("masuk");
  const [jumlah, setJumlah] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const supabase = createClient();

  const fetchStok = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*, inventory(jumlah_stok)")
      .order("nama_barang", { ascending: true });

    if (!error && data) {
      setProducts(data as unknown as Product[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStok();
  }, []);

  const openAdjustModal = (product: Product, type: "masuk" | "keluar") => {
    setSelectedProduct(product);
    setAdjustType(type);
    setJumlah("");
    setErrorMsg("");
  };

  const handleUpdateStok = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const qty = parseInt(jumlah);
    if (!qty || qty <= 0) {
      setErrorMsg("Masukkan jumlah yang valid (lebih dari 0)");
      return;
    }

    const currentStok = selectedProduct.inventory?.jumlah_stok ?? 0;
    let newStok = currentStok;

    if (adjustType === "masuk") {
      newStok = currentStok + qty;
    } else {
      if (currentStok < qty) {
        setErrorMsg(`Stok tidak mencukupi untuk dikurangi. Stok saat ini: ${currentStok}`);
        return;
      }
      newStok = currentStok - qty;
    }

    setSubmitting(true);
    setErrorMsg("");

    const { error } = await supabase
      .from("inventory")
      .upsert({
        product_id: selectedProduct.id,
        jumlah_stok: newStok,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      setErrorMsg(error.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setSelectedProduct(null);
    fetchStok();
  };

  const filteredProducts = products.filter(
    (p) =>
      p.nama_barang.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.kategori && p.kategori.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Stok</h1>
          <p className="text-sm text-gray-500">Monitor ketersediaan barang dan lakukan penyesuaian stok masuk/keluar</p>
        </div>
        <button
          onClick={fetchStok}
          className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 rounded-lg text-sm font-medium text-gray-700 shadow-xs transition"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Perbarui Data
        </button>
      </div>

      {/* Pencarian */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center">
        <Search className="w-5 h-5 text-gray-400 mr-3" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cari barang untuk cek atau update stok..."
          className="w-full text-sm text-gray-800 focus:outline-none"
        />
      </div>

      {/* Tabel Stok */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-700">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-600 uppercase border-b border-gray-200">
              <tr>
                <th className="px-6 py-3.5">SKU</th>
                <th className="px-6 py-3.5">Nama Barang</th>
                <th className="px-6 py-3.5">Kategori</th>
                <th className="px-6 py-3.5 text-center">Stok Saat Ini</th>
                <th className="px-6 py-3.5 text-center">Status</th>
                <th className="px-6 py-3.5 text-center">Aksi Penyesuaian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-red-600 mb-2" />
                    <span className="text-gray-400">Memuat data inventori...</span>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <Boxes className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    Tidak ada barang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const stok = p.inventory?.jumlah_stok ?? 0;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 font-mono font-medium text-xs text-gray-600">
                        {p.sku}
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {p.nama_barang}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {p.kategori || "Umum"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-base text-gray-900">
                        {stok}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {stok > 10 ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                            Aman
                          </span>
                        ) : stok > 0 ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                            Menipis
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                            Habis
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openAdjustModal(p, "masuk")}
                            className="inline-flex items-center px-2.5 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium transition cursor-pointer"
                            title="Tambah Stok Masuk"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
                            Stok Masuk
                          </button>
                          <button
                            onClick={() => openAdjustModal(p, "keluar")}
                            className="inline-flex items-center px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-medium transition cursor-pointer"
                            title="Kurangi Stok (Keluar/Rusak)"
                          >
                            <ArrowDownRight className="w-3.5 h-3.5 mr-1" />
                            Stok Keluar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Penyesuaian Stok */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className={`flex items-center justify-between px-6 py-4 text-white ${
              adjustType === "masuk" ? "bg-green-600" : "bg-red-700"
            }`}>
              <h3 className="font-semibold text-lg">
                {adjustType === "masuk" ? "Tambah Stok Masuk" : "Catat Stok Keluar"}
              </h3>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-white/80 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleUpdateStok} className="p-6 space-y-4">
              <div>
                <p className="text-xs text-gray-500">Nama Barang</p>
                <p className="font-bold text-gray-900">{selectedProduct.nama_barang}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Stok Saat Ini:{" "}
                  <span className="font-semibold text-gray-900">
                    {selectedProduct.inventory?.jumlah_stok ?? 0}
                  </span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Jumlah {adjustType === "masuk" ? "Masuk" : "Keluar"}
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={jumlah}
                  onChange={(e) => setJumlah(e.target.value)}
                  placeholder="Masukkan jumlah..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 py-2 text-white rounded-lg text-sm font-semibold shadow-sm transition flex items-center ${
                    adjustType === "masuk"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-700 hover:bg-red-800"
                  } disabled:opacity-50`}
                >
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Konfirmasi Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
