"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Customer } from "@/types/pos";
import { Users, Plus, Search, Edit2, Trash2, Loader2, X, Phone, MapPin } from "lucide-react";

export default function PelangganPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [nama, setNama] = useState("");
  const [telepon, setTelepon] = useState("");
  const [alamat, setAlamat] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const supabase = createClient();

  const fetchCustomers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("id", { ascending: false });

    if (!error && data) {
      setCustomers(data as Customer[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const openModal = (cust?: Customer) => {
    setErrorMsg("");
    if (cust) {
      setEditingCustomer(cust);
      setNama(cust.nama);
      setTelepon(cust.telepon || "");
      setAlamat(cust.alamat || "");
    } else {
      setEditingCustomer(null);
      setNama("");
      setTelepon("");
      setAlamat("");
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setErrorMsg("");

    const payload = {
      nama: nama.trim(),
      telepon: telepon.trim() || null,
      alamat: alamat.trim() || null,
    };

    if (editingCustomer) {
      const { error } = await supabase
        .from("customers")
        .update(payload)
        .eq("id", editingCustomer.id);

      if (error) {
        setErrorMsg(error.message);
        setFormLoading(false);
        return;
      }
    } else {
      const { error } = await supabase.from("customers").insert([payload]);
      if (error) {
        setErrorMsg(error.message);
        setFormLoading(false);
        return;
      }
    }

    setFormLoading(false);
    closeModal();
    fetchCustomers();
  };

  const handleDelete = async (id: number, nama: string) => {
    if (!confirm(`Hapus data pelanggan "${nama}"?`)) return;

    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) {
      alert("Gagal menghapus: " + error.message);
    } else {
      fetchCustomers();
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.telepon && c.telepon.includes(searchTerm)) ||
      (c.alamat && c.alamat.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Pelanggan</h1>
          <p className="text-sm text-gray-500">Kelola informasi pelanggan grosir dan warung mitra</p>
        </div>
        <button
          onClick={() => openModal()}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-red-700 hover:bg-red-800 text-white font-medium rounded-lg shadow-sm transition cursor-pointer"
        >
          <Plus className="w-5 h-5 mr-1.5" />
          Tambah Pelanggan
        </button>
      </div>

      {/* Pencarian */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center">
        <Search className="w-5 h-5 text-gray-400 mr-3" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cari pelanggan berdasarkan nama, nomor telepon, atau alamat..."
          className="w-full text-sm text-gray-800 focus:outline-none"
        />
      </div>

      {/* Tabel Pelanggan */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-700">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-600 uppercase border-b border-gray-200">
              <tr>
                <th className="px-6 py-3.5">Nama Pelanggan</th>
                <th className="px-6 py-3.5">No. Telepon / WA</th>
                <th className="px-6 py-3.5">Alamat</th>
                <th className="px-6 py-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-red-600 mb-2" />
                    <span className="text-gray-400">Memuat data pelanggan...</span>
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    Belum ada data pelanggan.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {c.nama}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {c.telepon ? (
                        <span className="inline-flex items-center">
                          <Phone className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                          {c.telepon}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate">
                      {c.alamat ? (
                        <span className="inline-flex items-center">
                          <MapPin className="w-3.5 h-3.5 mr-1.5 text-gray-400 shrink-0" />
                          {c.alamat}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center space-x-2">
                      <button
                        onClick={() => openModal(c)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                        title="Edit Data"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id, c.nama)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                        title="Hapus Data"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah / Edit Pelanggan */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 bg-red-700 text-white">
              <h3 className="font-semibold text-lg">
                {editingCustomer ? "Edit Pelanggan" : "Tambah Pelanggan Baru"}
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
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Nama Pelanggan / Warung
                </label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Toko Berkah / Bu Ani"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Nomor Telepon / WhatsApp
                </label>
                <input
                  type="text"
                  value={telepon}
                  onChange={(e) => setTelepon(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Alamat Lengkap
                </label>
                <textarea
                  rows={3}
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  placeholder="Contoh: Jl. Merdeka No. 12, RT 02/05"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-600 focus:outline-none"
                />
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
                  {editingCustomer ? "Simpan Perubahan" : "Tambah Pelanggan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
