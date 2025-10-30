## User

Dokumentasi model `User` dan endpoint terkait (yang tersedia saat ini: register & login — lihat `auth.md`).

### Model User (fields)

- `name` (string) — nama lengkap. Required. Min length: 2.
- `username` (string) — unik, required. Min length: 3.
- `password` (string) — required, min length: 6. Disimpan sebagai hash (bcrypt). Default `select: false`.

### Behavior penting
- Sebelum disimpan, password di-hash melalui middleware `pre('save')`.
- Untuk membandingkan password, gunakan method instance `comparePassword(candidatePassword)` (mengembalikan boolean). Perlu mengambil password eksplisit dengan `.select('+password')` saat query.

### Terkait endpoint
- `POST /api/auth/register` — buat user baru dan dapatkan token JWT (lihat `auth.md`).
- `POST /api/auth/login` — login dan dapatkan token JWT (lihat `auth.md`).

### Rekomendasi endpoint tambahan (belum terimplementasi)
- GET /api/users/:id — dapatkan profil user (butuh autentikasi)
- PUT /api/users/:id — perbarui profil (butuh autentikasi)
- DELETE /api/users/:id — hapus akun (butuh autentikasi)

