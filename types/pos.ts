// Tipe Data Master & Relasi Database POS Adi Grosir

export interface Profile {
  id: string;
  nama: string;
  role: "admin" | "kasir";
  avatar_url?: string | null;
  created_at: string;
}

export interface Product {
  id: number;
  sku: string;
  nama_barang: string;
  harga_beli: number;
  harga_jual: number;
  kategori: string | null;
  created_at: string;
  inventory?: {
    jumlah_stok: number;
  } | null;
}

export interface Customer {
  id: number;
  nama: string;
  telepon: string | null;
  alamat: string | null;
  created_at: string;
}

export interface TransactionItem {
  id: number;
  transaction_id: number;
  product_id: number;
  jumlah: number;
  harga_satuan: number;
  product?: Product;
}

export interface Transaction {
  id: number;
  user_id: string | null;
  customer_id: number | null;
  total_harga: number;
  metode_pembayaran: string;
  tanggal_transaksi: string;
  profiles?: {
    nama: string;
  } | null;
  customers?: {
    nama: string;
  } | null;
  transaction_items?: TransactionItem[];
}
