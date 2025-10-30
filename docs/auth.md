## Authentication API

Dokumentasi endpoint untuk registrasi dan login user.

### POST /api/auth/register

- Deskripsi: Mendaftarkan user baru dan mengembalikan JWT token.
- Method: POST
- Headers: `Content-Type: application/json`

- Body (JSON):

```json
{
	"name": "Nama Lengkap",
	"username": "username123",
	"password": "rahasia123"
}
```

- Success Response (201):

```json
{
	"message": "Registrasi berhasil",
	"user": { "id": "<userId>", "name": "Nama Lengkap", "username": "username123" },
	"token": "<jwt_token>"
}
```

- Error responses:
	- 400: jika field tidak lengkap atau username sudah digunakan
		- { "message": "Semua field wajib diisi." }
		- { "message": "Username sudah digunakan." }
	- 405: method selain POST tidak diizinkan
	- 500: kesalahan server

Catatan:
- Token yang dikembalikan adalah JWT yang ditandatangani dengan `process.env.JWT_SECRET`.
- Password disimpan dalam bentuk hash (bcrypt) sesuai implementasi model `User`.

### POST /api/auth/login

- Deskripsi: Login user dengan username + password. Mengembalikan JWT token bila berhasil.
- Method: POST
- Headers: `Content-Type: application/json`

- Body (JSON):

```json
{
	"username": "username123",
	"password": "rahasia123"
}
```

- Success Response (200):

```json
{
	"message": "Login berhasil",
	"user": { "id": "<userId>", "name": "Nama Lengkap", "username": "username123" },
	"token": "<jwt_token>"
}
```

- Error responses:
	- 400: username atau password kosong
		- { "message": "Username dan password wajib diisi." }
	- 400: user tidak ditemukan atau password salah
		- { "message": "User tidak ditemukan." }
		- { "message": "Password salah." }
	- 405: method selain POST tidak diizinkan
	- 500: kesalahan server

Catatan:
- Endpoint mengambil password terenkripsi dari database dengan `.select('+password')` dan memverifikasi menggunakan `bcrypt`.
- JWT expiration dapat dikontrol via `process.env.JWT_EXPIRES_IN`.
