# Catatan Menjalankan Project MicroFun

## 1. Clone Repository

```bash
git clone <url-repository>
cd microfunding
```

## 2. Setup Backend

Masuk ke folder backend:

```bash
cd backend
npm install
```

Buat file `.env` di dalam folder `backend`:

```env
PORT=4000

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=microfunding

JWT_SECRET=microfun-secret-key

GEMINI_API_KEY=ISI_API_KEY_GEMINI_DI_SINI
GEMINI_MODEL=gemini-2.5-flash
```

Catatan:
- `GEMINI_API_KEY` wajib diisi agar fitur AI berjalan.
- Jangan push file `.env` ke GitHub.
- Kalau password MySQL di laptop teman berbeda, sesuaikan `DB_PASSWORD`.

## 3. Setup Database

Pastikan MySQL sudah berjalan, lalu dari folder `backend` jalankan:

```bash
npm run db:setup
```

Command ini akan membuat schema/tabel dan mengisi data awal.

Kalau hanya ingin membuat/migrate tabel tanpa seed data:

```bash
npm run db:migrate
```

## 4. Jalankan Backend

Dari folder `backend`:

```bash
npm run dev
```

Backend akan berjalan di:

```txt
http://localhost:4000
```

## 5. Setup Frontend

Buka terminal baru, lalu masuk ke folder frontend:

```bash
cd frontend
npm install
```

Buat file `.env` di dalam folder `frontend`:

```env
VITE_API_BASE_URL=http://localhost:4000
```

## 6. Jalankan Frontend

Dari folder `frontend`:

```bash
npm run dev
```

Frontend biasanya berjalan di:

```txt
http://localhost:5173
```

## 7. Fitur AI

Fitur AI yang menggunakan Gemini:
- AI Business Advisor di role UMKM
- AI Matching funder dan mentor di role UMKM
- AI Recommendation di role Funder

Agar fitur AI berjalan:
- Backend harus menyala.
- `backend/.env` harus memiliki `GEMINI_API_KEY`.
- Frontend harus mengarah ke backend lewat `VITE_API_BASE_URL`.
- API key Gemini harus aktif dan masih punya quota.

## 8. Troubleshooting

Jika muncul error:

```txt
GEMINI_API_KEY belum dikonfigurasi di backend
```

Solusi:
- Pastikan file `backend/.env` sudah dibuat.
- Pastikan nama variabelnya benar: `GEMINI_API_KEY`.
- Restart backend setelah mengubah `.env`.

```bash
npm run dev
```

Jika muncul error dari Gemini seperti quota atau API key:
- Cek API key di Google AI Studio.
- Pastikan API key masih aktif.
- Pastikan quota belum habis.
- Pastikan model `gemini-2.5-flash` tersedia untuk API key tersebut.

## 9. File Yang Jangan Dipush

Pastikan file berikut tidak ikut masuk GitHub:

```txt
backend/.env
frontend/.env
backend/uploads/
node_modules/
frontend/dist/
```

Pastikan `.gitignore` berisi minimal:

```gitignore
node_modules
.env
dist
backend/uploads
```

## 10. Cek Sebelum Push

Sebelum push ke GitHub, jalankan:

```bash
cd frontend
npm run lint
npm run build
```

Kalau dua command tersebut berhasil, frontend aman untuk dipush.

Untuk backend, pastikan server bisa jalan:

```bash
cd backend
npm run dev
```

