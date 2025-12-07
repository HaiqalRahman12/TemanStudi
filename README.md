# 🧠 TemanStudi - AI Microservice

Backend Service untuk Generasi Flashcard Cerdas menggunakan **Local LLM (Qwen 3 1.7B)**.

Repositori ini berisi kode sumber layanan AI berbasis **Python + FastAPI** yang bertugas memproses dokumen **PDF/PPTX** dan mengubahnya menjadi pasangan **Tanya–Jawab (Flashcard)** secara otomatis. Layanan ini didesain untuk berjalan **sepenuhnya lokal**, cocok untuk GPU konsumen seperti **RTX 3050**, dan sangat efisien dalam penggunaan memori.

---

## 🌟 Fitur Utama

- **Offline Intelligence** Menggunakan model **Qwen 3 1.7B (GGUF)** yang berjalan 100% lokal — gratis, privat, dan tanpa API key.

- **Dual Format Support** Mendukung ekstraksi teks dari file **PDF (.pdf)** dan **PowerPoint (.pptx)**.

- **Memory Safe Architecture** Menggunakan metode **Sliding Window Chunking** agar bisa memproses dokumen panjang tanpa Out of Memory (OOM) meski dengan VRAM kecil.

- **Strict Output Validation** Menggunakan **Grammar Constraint** untuk memastikan output AI *selalu* dalam format **JSON valid**, siap dipakai backend utama.

-----

## 📋 Prasyarat Sistem

Sebelum menjalankan aplikasi, pastikan perangkat Anda memenuhi syarat berikut:

  * **OS:** Windows 10/11 atau Linux
  * **Python:** Versi 3.10 atau lebih baru
  * **GPU (Wajib untuk performa optimal):**
      * NVIDIA GPU dengan minimal VRAM **4GB**
      * (Diuji pada RTX 3050 Mobile)
  * **CUDA Toolkit:** Versi 11.8 atau 12.1

-----

## 🚀 Panduan Instalasi

### 1\. Clone Repository

```bash
git clone [https://github.com/username-anda/TemanStudi.git](https://github.com/username-anda/TemanStudi.git)
cd teman-studi-ai
```

### 2\. Setup Virtual Environment (Opsional namun Disarankan)

```bash
python -m venv venv

# Windows:
venv\Scripts\activate

# Linux/Mac:
source venv/bin/activate
```

### 3\. Install Dependensi Dasar

```bash
pip install -r requirements.txt
```

### 4\. Install Library AI (Khusus GPU) ⚠️ PENTING

Jangan install `llama-cpp-python` sembarangan. Gunakan perintah berikut agar versi GPU terdeteksi:

**Untuk CUDA 12.1:**

```bash
pip install llama-cpp-python --upgrade --force-reinstall --no-cache-dir --extra-index-url [https://abetlen.github.io/llama-cpp-python/whl/cu121](https://abetlen.github.io/llama-cpp-python/whl/cu121)
```

*(Jika menggunakan CUDA 11.8, ganti `cu121` menjadi `cu118`)*.

### 5\. Download Model AI

1.  Kunjungi HuggingFace.
2.  Cari **Qwen3-1.7B-Instruct-GGUF**.
3.  Download file: **`Qwen3-1.7B-Instruct-Q5_K_M.gguf`**.
4.  Buat folder `models/` pada root proyek.
5.  Simpan file model di dalam folder tersebut.

**Struktur folder akhir:**

```text
TemanStudi/
├── models/
│   └── Qwen3-1.7B-Instruct-Q5_K_M.gguf
├── app/
|   |__ __init__.py
│   ├── services/
|   |   └── __init__.py
│   │   └── ai_engine.py
├── main.py
└── requirements.txt
```

-----

## 🏃‍♂️ Menjalankan Server

Jalankan server dengan perintah:

```bash
uvicorn main:app --reload --port 8000
```

Saat model berhasil dimuat, akan muncul log:
`INFO: 🚀 Memuat Model ke GPU: Qwen3-1.7B-Instruct-Q5_K_M.gguf...`

Cek kesehatan server melalui browser:  
👉 `http://localhost:8000/`

-----

## 🔌 Dokumentasi API

### Generate Flashcards

Endpoint utama untuk memproses dokumen.

  * **URL:** `/generate`
  * **Method:** `POST`
  * **Content-Type:** `multipart/form-data`

**Parameter Body:**

| Key | Type | Deskripsi |
| :--- | :--- | :--- |
| `file` | File | File dokumen (`.pdf` atau `.pptx`) |
| `start_page` | Integer | Halaman awal (mulai dari 1) |
| `end_page` | Integer | Halaman akhir |

**Contoh Response:**

```json
{
  "status": "success",
  "pesan": "OK",
  "data": [
    {
      "pertanyaan": "Apa fungsi utama mitokondria?",
      "jawaban": "Sebagai tempat respirasi sel untuk menghasilkan energi."
    },
    {
      "pertanyaan": "Siapa bapak sosiologi modern?",
      "jawaban": "Auguste Comte."
    }
  ]
}
```

-----

## ⚠️ Batasan & Troubleshooting

1.  **AI berjalan lambat**

      * Periksa apakah ada log `BLAS = 1` saat startup.
      * Jika tidak muncul → Model berjalan di CPU.
      * → Ulangi langkah install GPU (bagian 4).

2.  **Output kosong / parsing error**

      * Pastikan file PDF bukan hasil scan (harus memiliki teks yang bisa diseleksi).

3.  **Batas maksimal halaman**

      * Disarankan memproses **15–20 halaman** per request untuk mencegah timeout.

<!-- end list -->

```
