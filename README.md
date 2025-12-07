# BackEnd TemanStudi

Repository ini berisi kode sumber backend untuk aplikasi **TemanStudi**. Aplikasi ini dirancang untuk membantu pengguna mengelola materi belajar menggunakan metode *Flashcard* (kartu kilat) dan melacak statistik belajar mereka.

Backend ini dibangun menggunakan **Node.js**, **Express**, dan database **MySQL**.

## 🌟 Fitur Utama

* **Autentikasi Pengguna**: Registrasi dan Login menggunakan JSON Web Token (JWT).
* **Manajemen Deck**: Pengguna dapat melihat daftar deck pribadi dan menghapus deck.
* **CRUD Flashcard**: Menambah, melihat, mengedit, dan menghapus flashcard dalam sebuah deck.
* **Pencatatan Sesi Belajar**: Menyimpan durasi sesi belajar (*study logs*).
* **Statistik**: Melihat total sesi dan total waktu belajar pengguna.
* **Keamanan**: Middleware autentikasi untuk melindungi endpoint sensitif (Private Routes).
* **Standardized Response**: Format respons API yang konsisten (JSON).

## 🛠️ Teknologi yang Digunakan

* [Node.js](https://nodejs.org/) - Runtime environment JavaScript.
* [Express.js](https://expressjs.com/) - Web framework untuk Node.js.
* [MySQL](https://www.mysql.com/) - Sistem manajemen database relasional.
* [JWT (JsonWebToken)](https://jwt.io/) - Untuk autentikasi aman.
* [Dotenv](https://www.npmjs.com/package/dotenv) - Manajemen variabel lingkungan.
* [Nodemon](https://nodemon.io/) - Utility untuk hot-reloading selama pengembangan.

## 📋 Prasyarat

Sebelum memulai, pastikan Anda telah menginstal:
1.  **Node.js** (v14 atau lebih baru)
2.  **MySQL Server**
3.  **Git** (opsional, untuk kloning repo)

## 🚀 Instalasi dan Konfigurasi

Ikuti langkah-langkah berikut untuk menjalankan proyek ini di mesin lokal Anda:
```bash
git clone [https://github.com/username-anda/backend-temanstudi.git](https://github.com/username-anda/backend-temanstudi.git)
cd backend-temanstudi
