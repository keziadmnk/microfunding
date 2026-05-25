# Database Setup: microfunding (Fresh Project)

File ini menyiapkan database baru `microfunding` untuk project Express yang bersih (fresh).

## 1) Konfigurasi koneksi

Atur `.env` di folder backend:

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME=microfunding`

## 2) Buat schema database baru

Jalankan:

```bash
npm run db:init
```

Script ini akan mengeksekusi file `db/microfunding_schema.sql`.

Alternatif command:

```bash
npm run db:migrate
```

## 3) Jalankan seed data default (opsional)

```bash
npm run db:seed
```

Untuk setup awal cepat (buat schema + isi sample data):

```bash
npm run db:setup
```

## 4) Jalankan backend Express

```bash
npm run dev
```

Health check:

- `GET /api/health`

Jika koneksi DB sukses, endpoint akan mengembalikan status `ok`.
