"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Product, Customer } from "@/types/pos";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  Receipt,
  UserCheck,
  CreditCard,
  Banknote,
  QrCode,
  Loader2,
  X
} from "lucide-react";

interface CartItem {
  product: Product;
  qty: number;
}

export default function KasirPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedKategori, setSelectedKategori] = useState<string>("Semua");

  // Cart & Checkout State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [metodePembayaran, setMetodePembayaran] = useState<string>("TUNAI");
  const [nominalBayar, setNominalBayar] = useState<string>("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState<any>(null);

  const supabase = createClient();

  const loadData = async () => {
    setLoading(true);
    const [pRes, cRes] = await Promise.all([
      supabase
        .from("products")
        .select("*, inventory(jumlah_stok)")
        .order("nama_barang", { ascending: true }),
      supabase.from("customers").select("*").order("nama", { ascending: true }),
    ]);

    if (pRes.data) setProducts(pRes.data as Product[]);
    if (cRes.data) setCustomers(cRes.data as Customer[]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter Kategori Unik
  const categories = [
    "Semua",
    ...Array.from(new Set(products.map((p) => p.kategori || "Umum"))),
  ];

  const addToCart = (product: Product) => {
    const stokTersedia = product.inventory?.jumlah_stok ?? 0;
    const existing = cart.find((item) => item.product.id === product.id);
    const currentCartQty = existing ? existing.qty : 0;

    if (currentCartQty + 1 > stokTersedia) {
      alert(`Stok tidak mencukupi! Tersedia hanya ${stokTersedia} unit.`);
      return;
    }

    if (existing) {
      setCart(
        cart.map((item) =>
          item.product.id === product.id
            ? { ...item, qty: item.qty + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { product, qty: 1 }]);
    }
  };

  const updateQty = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const stokTersedia = item.product.inventory?.jumlah_stok ?? 0;
            const newQty = item.qty + delta;
            if (newQty > stokTersedia) {
              alert(`Stok hanya tersisa ${stokTersedia}`);
              return item;
            }
            return { ...item, qty: newQty };
          }
          return item;
        })
        .filter((item) => item.qty > 0)
    );
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const totalHarga = cart.reduce(
    (acc, item) => acc + item.product.harga_jual * item.qty,
    0
  );

  const bayarValue = parseFloat(nominalBayar) || 0;
  const kembalian = bayarValue - totalHarga;

  // Eksekusi Transaksi POS & Potong Stok
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (metodePembayaran === "TUNAI" && bayarValue < totalHarga) {
      alert("Nominal pembayaran kurang dari total tagihan!");
      return;
    }

    setCheckoutLoading(true);

    try {
      // 1. Ambil User Login saat ini
      const { data: { user } } = await supabase.auth.getUser();

      // 2. Insert ke transactions
      const { data: trx, error: trxErr } = await supabase
        .from("transactions")
        .insert([
          {
            user_id: user?.id || null,
            customer_id: selectedCustomerId ? parseInt(selectedCustomerId) : null,
            total_harga: totalHarga,
            metode_pembayaran: metodePembayaran,
          },
        ])
        .select()
        .single();

      if (trxErr || !trx) throw new Error(trxErr?.message || "Gagal membuat transaksi");

      // 3. Insert Detail Transaction Items
      const itemsPayload = cart.map((item) => ({
        transaction_id: trx.id,
        product_id: item.product.id,
        jumlah: item.qty,
        harga_satuan: item.product.harga_jual,
      }));

      const { error: itemsErr } = await supabase
        .from("transaction_items")
        .insert(itemsPayload);

      if (itemsErr) throw new Error(itemsErr.message);

      // 4. Potong Stok di Tabel Inventory
      for (const item of cart) {
        const currentStok = item.product.inventory?.jumlah_stok ?? 0;
        const newStok = Math.max(0, currentStok - item.qty);

        await supabase
          .from("inventory")
          .update({ jumlah_stok: newStok, updated_at: new Date().toISOString() })
          .eq("product_id", item.product.id);
      }

      // Sukses
      setCheckoutSuccess({
        id: trx.id,
        total: totalHarga,
        bayar: metodePembayaran === "TUNAI" ? bayarValue : totalHarga,
        kembalian: metodePembayaran === "TUNAI" ? kembalian : 0,
        metode: metodePembayaran,
        items: [...cart],
      });

      // Reset Keranjang
      setCart([]);
      setNominalBayar("");
      setSelectedCustomerId("");
      loadData(); // refresh stok
    } catch (err: any) {
      alert("Error saat memproses transaksi: " + err.message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchSearch =
      p.nama_barang.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat =
      selectedKategori === "Semua" || (p.kategori || "Umum") === selectedKategori;
    return matchSearch && matchCat;
  });

  return (
    <div className="h-[calc(100vh-6.5rem)] flex flex-col lg:flex-row gap-6">
      {/* Kolom Kiri: Katalog Barang */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Search & Kategori Bar */}
        <div className="p-4 border-b border-gray-100 space-y-3">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari barang atau scan SKU/Barcode..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedKategori(cat)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedKategori === cat
                    ? "bg-red-700 text-white shadow-xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid Produk */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-red-600" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <Receipt className="w-12 h-12 mb-2 text-gray-300" />
              <p>Tidak ada produk ditemukan.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((p) => {
                const stok = p.inventory?.jumlah_stok ?? 0;
                const isOutOfStock = stok <= 0;

                return (
                  <button
                    key={p.id}
                    disabled={isOutOfStock}
                    onClick={() => addToCart(p)}
                    className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition relative cursor-pointer ${
                      isOutOfStock
                        ? "bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed"
                        : "bg-white border-gray-200 hover:border-red-600 hover:shadow-md"
                    }`}
                  >
                    <div>
                      <span className="text-[10px] font-mono font-medium text-gray-400 block mb-0.5">
                        {p.sku}
                      </span>
                      <h4 className="font-semibold text-gray-900 text-sm line-clamp-2 leading-snug">
                        {p.nama_barang}
                      </h4>
                    </div>

                    <div className="mt-3 flex items-end justify-between">
                      <div>
                        <span className="text-[11px] text-gray-400 block">Stok: {stok}</span>
                        <span className="text-sm font-bold text-red-700">
                          Rp {Number(p.harga_jual).toLocaleString("id-ID")}
                        </span>
                      </div>
                      <div className="w-7 h-7 rounded-lg bg-red-50 text-red-700 flex items-center justify-center">
                        <Plus className="w-4 h-4" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Kolom Kanan: Keranjang & Pembayaran (Billing Panel) */}
      <div className="w-full lg:w-96 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header Keranjang */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-red-700 text-white">
          <div className="flex items-center space-x-2">
            <ShoppingCart className="w-5 h-5" />
            <h3 className="font-bold">Keranjang Kasir</h3>
          </div>
          <span className="text-xs bg-red-800 px-2 py-1 rounded-md font-medium">
            {cart.reduce((a, b) => a + b.qty, 0)} Item
          </span>
        </div>

        {/* Pelanggan Selector */}
        <div className="p-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-gray-500 shrink-0" />
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full text-xs bg-transparent focus:outline-none text-gray-700 font-medium"
          >
            <option value="">Pelanggan Umum (Tanpa Member)</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nama} {c.telepon ? `(${c.telepon})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Daftar Barang di Keranjang */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-gray-100 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
              <ShoppingCart className="w-10 h-10 mb-2 text-gray-300" />
              <p className="text-xs">Keranjang masih kosong</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product.id} className="pt-3 first:pt-0 flex items-center justify-between">
                <div className="flex-1 pr-2">
                  <h5 className="font-semibold text-xs text-gray-900 line-clamp-1">
                    {item.product.nama_barang}
                  </h5>
                  <p className="text-xs text-gray-500">
                    Rp {Number(item.product.harga_jual).toLocaleString("id-ID")} x {item.qty}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateQty(item.product.id, -1)}
                    className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-bold text-gray-900 w-4 text-center">
                    {item.qty}
                  </span>
                  <button
                    onClick={() => updateQty(item.product.id, 1)}
                    className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded transition ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Pembayaran */}
        <div className="p-4 border-t border-gray-200 bg-gray-50/70 space-y-3">
          {/* Metode Pembayaran */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "TUNAI", label: "Tunai", icon: Banknote },
              { id: "TRANSFER", label: "Transfer", icon: CreditCard },
              { id: "QRIS", label: "QRIS", icon: QrCode },
            ].map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => setMetodePembayaran(m.id)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                    metodePembayaran === m.id
                      ? "bg-red-700 text-white border-red-700 shadow-xs"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Input Nominal Bayar Jika Tunai */}
          {metodePembayaran === "TUNAI" && (
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Bayar Tunai Rp:</span>
                {kembalian >= 0 && bayarValue > 0 && (
                  <span className="text-green-600 font-semibold">
                    Kembali: Rp {kembalian.toLocaleString("id-ID")}
                  </span>
                )}
              </div>
              <input
                type="number"
                value={nominalBayar}
                onChange={(e) => setNominalBayar(e.target.value)}
                placeholder="Jumlah uang diterima..."
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
          )}

          {/* Total Tagihan */}
          <div className="pt-2 flex justify-between items-baseline border-t border-gray-200">
            <span className="text-sm font-medium text-gray-600">Total Tagihan:</span>
            <span className="text-xl font-extrabold text-red-700">
              Rp {totalHarga.toLocaleString("id-ID")}
            </span>
          </div>

          {/* Tombol Checkout */}
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || checkoutLoading}
            className="w-full py-3 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl shadow transition duration-200 flex items-center justify-center disabled:opacity-50 cursor-pointer"
          >
            {checkoutLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses...
              </>
            ) : (
              "Selesaikan Pembayaran"
            )}
          </button>
        </div>
      </div>

      {/* Modal Struk / Sukses Checkout */}
      {checkoutSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6 text-center">
            <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-lg text-gray-900">Transaksi Berhasil!</h3>
            <p className="text-xs text-gray-500 mb-4">
              Nomor Struk: #TRX-{checkoutSuccess.id}
            </p>

            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-left text-xs space-y-1.5 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Metode:</span>
                <span className="font-semibold text-gray-900">{checkoutSuccess.metode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total:</span>
                <span className="font-bold text-gray-900">
                  Rp {checkoutSuccess.total.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Diterima:</span>
                <span className="text-gray-900">
                  Rp {checkoutSuccess.bayar.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between font-bold text-green-700 pt-1 border-t border-gray-200">
                <span>Kembalian:</span>
                <span>Rp {checkoutSuccess.kembalian.toLocaleString("id-ID")}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Cetak Struk
              </button>
              <button
                onClick={() => setCheckoutSuccess(null)}
                className="flex-1 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-semibold transition"
              >
                Transaksi Baru
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
