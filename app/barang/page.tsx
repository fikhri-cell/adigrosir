"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Product } from "@/types/pos";
import { Plus, Search, Edit2, Trash2, Package, Loader2, X } from "lucide-react";

export default function BarangPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [sku, setSku] = useState("");
  const [namaBarang, setNamaBarang] = useState("");
  const [kategori, setKategori] = useState("Sembako");
  const [hargaBeli, setHargaBeli] = useState("");
  const [hargaJual, setHargaJual] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const supabase = createClient();

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*, inventory(jumlah_stok)")
      .order("id", { ascending: false });

    if (!error && data) {
      setProducts(data as Product[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openModal = (product?: Product) => {
    setErrorMsg("");
    if (product) {
      setEditingProduct(product);
      setSku(product.sku);
      setNamaBarang(product.nama_barang);
      setKategori(product.kategori || "Sembako");
      setHargaBeli(product.harga_beli.toString());
      setHargaJual(product.harga_jual.toString());
    } else {
      setEditingProduct(null);
      setSku(`BRG-${Date.now().toString().slice(-6)}`);
      setNamaBarang("");
      setKategori("Sembako");
      setHargaBeli("");
      setHargaJual("");
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setErrorMsg("");

    const payload = {
      sku: sku.trim(),
      nama_barang: namaBarang.trim(),
      kategori: kategori.trim(),
      harga_beli: parseFloat(hargaBeli) || 0,
      harga_jual: parseFloat(hargaJual) || 0,
    };

    if (editingProduct) {
      // Update
      const { error } = await supabase
        .from("products")
        .update(payload)
        .eq("id", editingProduct.id);

      if (error) {
        setErrorMsg(error.message);
        setFormLoading(false);
        return;
      }
    } else {
      // Create baru
      const { error } = await supabase.from("products").insert([payload]);
      if (error) {
        setErrorMsg(error.message);
        setFormLoading(false);
        return;
      }
    }

    setFormLoading(false);
    closeModal();
    fetchProducts();
  };

  const handleDelete = async (id: number, nama: string) => {
    if (!confirm(`Hapus barang "${nama}"?`)) return;

    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      alert("Gagal menghapus: " + error.message);
    } else {
      fetchProducts();
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.nama_barang.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.kategori && p.kategori.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Barang</h1>
          <p className="text-sm text-gray-500">Kelola katalog produk sembako dan harga grosir</p>
        </div>
        <button
          onClick={() => openModal()}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-red-700 hover:bg-red-800 text-white font-medium rounded-lg shadow-sm transition cursor-pointer"
        >
          <Plus className="w-5 h-5 mr-1.5" />
          Tambah Barang
        </button>
      </div>

      {/* Pencarian */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center">
        <Search className="w-5 h-5 text-gray-400 mr-3" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cari berdasarkan nama barang, SKU, atau kategori..."
          className="w-full text-sm text-gray-800 focus:outline-none"
        />
      </div>

      {/* Tabel Data Barang */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-700">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-600 uppercase border-b border-gray-200">
              <tr>
                <th className="px-6 py-3.5">SKU</th>
                <th className="px-6 py-3.5">Nama Barang</th>
                <th className="px-6 py-3.5">Kategori</th>
                <th className="px-6 py-3.5 text-right">Harga Beli</th>
                <th className="px-6 py-3.5 text-right">Harga Jual</th>
                <th className="px-6 py-3.5 text-center">Stok</th>
                <th className="px-6 py-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-red-600 mb-2" />
                    <span className="text-gray-400">Memuat data barang...</span>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    Belum ada data barang. Silakan klik Tambah Barang.
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
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                          {p.kategori || "Umum"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-600">
                        Rp {Number(p.harga_beli).toLocaleString("id-ID")}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">
                        Rp {Number(p.harga_jual).toLocaleString("id-ID")}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            stok > 10
                              ? "bg-green-100 text-green-700"
                              : stok > 0
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {stok}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center space-x-2">
                        <button
                          onClick={() => openModal(p)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                          title="Edit Barang"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.nama_barang)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                          title="Hapus Barang"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah / Edit Barang */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-red-700 text-white">
              <h3 className="font-semibold text-lg">
                {editingProduct ? "Edit Barang" : "Tambah Barang Baru"}
              </h3>
              <button
                onClick={closeModal}
                className="text-red-200 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Kode SKU
                  </label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Kategori
                  </label>
                  <input
                    type="text"
                    required
                    value={kategori}
                    onChange={(e) => setKategori(e.target.value)}
                    placeholder="Contoh: Beras, Minyak, Telur"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Nama Barang
                </label>
                <input
                  type="text"
                  required
                  value={namaBarang}
                  onChange={(e) => setNamaBarang(e.target.value)}
                  placeholder="Contoh: Beras Pandan Wangi 25kg"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Harga Beli (Modal) Rp
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={hargaBeli}
                    onChange={(e) => setHargaBeli(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Harga Jual Rp
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={hargaJual}
                    onChange={(e) => setHargaJual(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg text-sm font-semibold shadow-sm transition flex items-center disabled:opacity-50"
                >
                  {formLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingProduct ? "Simpan Perubahan" : "Tambah Barang"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
