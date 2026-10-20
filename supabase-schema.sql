-- ==============================================================
-- SKEMA DATABASE APLIKASI KASIR POS "ADI GROSIR"
-- Jalankan seluruh query ini di SQL Editor Supabase
-- ==============================================================

-- 1. Buat tipe ENUM untuk Role Pengguna (Admin dan Kasir)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'kasir');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Tabel Profiles (Menyimpan role dan nama, terhubung ke auth.users bawaan Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nama VARCHAR(150) NOT NULL,
  role user_role NOT NULL DEFAULT 'kasir',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger Otomatis: Saat ada user baru register/dibuat di Auth, otomatis masuk ke tabel profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nama, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nama', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'kasir'::user_role)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Tabel Products (Master Data Barang Grosir)
CREATE TABLE IF NOT EXISTS public.products (
  id BIGSERIAL PRIMARY KEY,
  sku VARCHAR(50) UNIQUE NOT NULL,
  nama_barang VARCHAR(255) NOT NULL,
  harga_beli NUMERIC(12, 2) NOT NULL DEFAULT 0,
  harga_jual NUMERIC(12, 2) NOT NULL DEFAULT 0,
  kategori VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabel Inventory (Manajemen Stok Barang)
CREATE TABLE IF NOT EXISTS public.inventory (
  product_id BIGINT PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  jumlah_stok INT NOT NULL DEFAULT 0 CHECK (jumlah_stok >= 0),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger Otomatis: Saat produk baru ditambahkan ke products, otomatis buat baris di inventory dengan stok 0
CREATE OR REPLACE FUNCTION public.handle_new_product_inventory()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.inventory (product_id, jumlah_stok)
  VALUES (NEW.id, 0)
  ON CONFLICT (product_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_product_created ON public.products;
CREATE TRIGGER on_product_created
  AFTER INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_product_inventory();

-- 5. Tabel Customers (Data Pelanggan Toko)
CREATE TABLE IF NOT EXISTS public.customers (
  id BIGSERIAL PRIMARY KEY,
  nama VARCHAR(150) NOT NULL,
  telepon VARCHAR(20),
  alamat TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabel Transactions (Data Transaksi Penjualan)
CREATE TABLE IF NOT EXISTS public.transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_id BIGINT REFERENCES public.customers(id) ON DELETE SET NULL,
  total_harga NUMERIC(14, 2) NOT NULL DEFAULT 0,
  metode_pembayaran VARCHAR(50) NOT NULL DEFAULT 'TUNAI',
  tanggal_transaksi TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Tabel Transaction Items (Detail Item Barang Tiap Transaksi)
CREATE TABLE IF NOT EXISTS public.transaction_items (
  id BIGSERIAL PRIMARY KEY,
  transaction_id BIGINT REFERENCES public.transactions(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES public.products(id) ON DELETE RESTRICT,
  jumlah INT NOT NULL CHECK (jumlah > 0),
  harga_satuan NUMERIC(12, 2) NOT NULL
);

-- 8. Aktifkan Keamanan Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;

-- 9. Kebijakan Akses (RLS Policies): User yang login di aplikasi memiliki akses baca & tulis
DO $$ BEGIN
  CREATE POLICY "Allow authenticated read/write profiles" ON public.profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Allow authenticated read/write products" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Allow authenticated read/write inventory" ON public.inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Allow authenticated read/write customers" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Allow authenticated read/write transactions" ON public.transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Allow authenticated read/write transaction_items" ON public.transaction_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;
