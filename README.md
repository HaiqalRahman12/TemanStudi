<div align="center">
  <a href='https://postimg.cc/sB7wXnXy' target='_blank'><img src='https://i.postimg.cc/sB7wXnXy/logo.png' border='0' alt='logo' width=200></a>
  <h1>⚙️ TemanStudi Backend API</h1>
  <p><b>RESTful API untuk Manajemen Belajar & Orkestrasi AI</b></p>
  <p><i>Penghubung antara Frontend, Database, dan Layanan AI Generator</i></p>

  <p>
    <a href="https://nodejs.org/">
      <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
    </a>
    <a href="https://expressjs.com/">
      <img src="https://img.shields.io/badge/Express.js-4.x-000000?style=for-the-badge&logo=express&logoColor=white" />
    </a>
    <a href="https://www.mysql.com/">
      <img src="https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white" />
    </a>
    <a href="https://jwt.io/">
      <img src="https://img.shields.io/badge/JWT-Authentication-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white" />
    </a>
  </p>
</div>

---

## ✨ Kenapa Backend Ini?

🔐 **Keamanan Terjamin** — Autentikasi berbasis JWT & hashing password dengan Bcrypt.

📚 **Manajemen Belajar Terstruktur** — Mengelola user, deck, flashcard, dan histori belajar.

🤖 **AI Orchestration Ready** — Menjadi penghubung antara user dan AI Service (PDF → Flashcard).

⚡ **Ringan & Skalabel** — REST API sederhana, mudah dikembangkan ke microservice.

---

## 📖 Tentang API

**TemanStudi Backend API** adalah server utama yang menangani seluruh **logika bisnis** aplikasi TemanStudi. Backend ini dibangun menggunakan **Node.js + Express.js** dan berperan sebagai:

* Jembatan antara **Frontend (Vue.js)** dan **AI Service (FastAPI – Kaggle GPU)**
* Pengelola **database MySQL**
* Penyedia **RESTful API** yang aman dan terstruktur

### Tanggung Jawab Utama

* 🔐 Autentikasi user (Register & Login)
* 🗄️ CRUD Deck, Flashcard, dan Study Log
* 🤖 Orkestrasi request AI Generator

---

## 🛠️ Persiapan Database

Buat database MySQL dan jalankan query berikut:

```sql
CREATE DATABASE temanstudi;
USE temanstudi;

-- Tabel User
CREATE TABLE user (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    nama VARCHAR(255) NOT NULL,
    created DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Decks
CREATE TABLE decks (
    deck_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    nama_deck VARCHAR(255),
    description TEXT,
    created DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE CASCADE
);

-- Tabel Flashcards
CREATE TABLE flashcards (
    flashcard_id INT AUTO_INCREMENT PRIMARY KEY,
    deck_id INT,
    pertanyaan TEXT,
    jawaban TEXT,
    FOREIGN KEY (deck_id) REFERENCES decks(deck_id) ON DELETE CASCADE
);

-- Tabel Study Logs
CREATE TABLE studylogs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    deck_id INT,
    durasi_belajar INT,
    created DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🚀 Cara Menjalankan Backend

### 1️⃣ Masuk ke Folder Backend

```bash
cd TemanStudi-backend
```

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Konfigurasi Environment

Buat file `.env` di root folder backend:

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=temanstudi
JWT_SECRET=rahasia_dapur_budi_12345
```

> ⚠️ **Catatan:** Pastikan `JWT_SECRET` konsisten dengan yang digunakan di kode.

### 4️⃣ Jalankan Server

```bash
# Mode Development (nodemon)
npm run api-service

# Mode Normal
node index.js
```

Server akan berjalan di:

```
http://localhost:3000
```

---

## 🔌 Dokumentasi Endpoint API

### 🔐 Autentikasi

| Method | Endpoint    | Deskripsi               |
| ------ | ----------- | ----------------------- |
| POST   | `/register` | Registrasi user baru    |
| POST   | `/login`    | Login & mendapatkan JWT |

---

### 📚 Deck & Flashcard

> Header wajib: `Authorization: Bearer <TOKEN>`

| Method | Endpoint               | Deskripsi               |
| ------ | ---------------------- | ----------------------- |
| GET    | `/my_decks`            | Ambil semua deck user   |
| DELETE | `/deck/:id`            | Hapus deck & isinya     |
| POST   | `/flashcard`           | Tambah flashcard manual |
| GET    | `/deck/:id/flashcards` | Ambil kartu dalam deck  |
| PUT    | `/flashcard/:id`       | Edit flashcard          |
| DELETE | `/flashcard/:id`       | Hapus flashcard         |

---

### 🤖 AI Generator

> Header wajib: `Authorization: Bearer <TOKEN>`

| Method | Endpoint         | Deskripsi                      |
| ------ | ---------------- | ------------------------------ |
| POST   | `/generate-deck` | Upload PDF → AI → Simpan ke DB |

**Body (multipart/form-data):**

* `file` (PDF)
* `nama_deck`
* `start_page`
* `end_page`

> ⚠️ Endpoint ini terhubung ke **AI Service via Ngrok**. Pastikan URL Ngrok di `index.js` sudah sesuai.

---

### 📊 Statistik Belajar

> Header wajib: `Authorization: Bearer <TOKEN>`

| Method | Endpoint       | Deskripsi                    |
| ------ | -------------- | ---------------------------- |
| POST   | `/log_session` | Simpan durasi belajar        |
| GET    | `/statistics`  | Statistik total sesi & waktu |

---

<div align="center">
  <p>✨ Backend ini dirancang sebagai fondasi sistem belajar berbasis AI</p>
  <p><i>TemanStudi Backend — Secure. Scalable. AI-ready.</i></p>
</div>
