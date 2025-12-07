require('dotenv').config()
const express = require('express')
const db = require('./connection')
const response = require('./response')
const app = express()
const port = process.env.PORT

app.use(express.json())
const jwt = require('jsonwebtoken')
const JWT_SECRET = "rahasia_dapur_budi_12345"


app.get('/', (req, res) => {
  const sql = "SELECT * FROM `user`"
  db.query(sql, (error, result) => {
    console.log(result)
    response(200, result, "mengambil data dari tabel user", res)
  })
})

app.get('/nama', (req, res) => {
  const sql = `SELECT nama FROM user WHERE user_id = ${req.query.user_id}`

  db.query(sql, (error, result) => {
    response(200, result, "mengambil data dari tabel user", res)
  })
})

app.post('/register', (req, res) => {
  // Ambil data yang dikirim oleh Frontend/Postman
  const { email, password, nama } = req.body

  // Validasi sederhana: Pastikan data tidak kosong
  if (!email || !password) {
    return response(400, null, "Email dan Password wajib diisi!", res)
  }

  // Cek dulu: Apakah email sudah pernah terdaftar?
  const sqlCheck = "SELECT * FROM user WHERE email = ?"
  db.query(sqlCheck, [email], (error, result) => {
    if (error) {
      return response(500, null, "Error cek database", res)
    }

    // Jika hasil pencarian > 0, berarti email sudah ada
    if (result.length > 0) {
      return response(400, null, "Email sudah terdaftar!", res)
    }

    // Jika email belum ada, lanjut proses registrasi

    // 1. Acak Password (Hashing)
    //const hashPassword = bcrypt.hashSync(password, 10)

    // 2. Masukkan ke Database
    // (Pastikan nama kolom sesuai dengan database Anda. Saya asumsikan ada kolom 'nama')
    const sql = "INSERT INTO user (email, password, nama, created) VALUES (?, ?, ?, NOW())"

    db.query(sql, [email, password, nama], (error, result) => {
      if (error) {
        console.log(error) // Cek di terminal kalau ada error
        return response(500, null, "Gagal mendaftarkan user", res)
      }

      // 3. Beri respon sukses
      const data = {
        insertId: result.insertId,
        email: email,
        nama: nama
      }
      response(201, data, "Register Berhasil", res)
    })
  })
})

app.post('/login', (req, res) => {
  const { email, password } = req.body
  const sql = "SELECT * FROM user WHERE email = ?"

  console.log("kai jagok raket")
  db.query(sql, [email], (error, result) => {
    if (error) return response(500, null, "Server Error", res)
    if (result.length === 0) return response(404, null, "Email tidak ada", res)

    const user = result[0]

    // Cek Password (disarankan pakai bcrypt.compareSync, tapi ini pakai contoh logika Anda)

    // --- INI BAGIAN PEMBUATAN JWT (Mencetak Gelang) ---
    // Kita simpan data penting (payload) ke dalam token
    const token = jwt.sign({
      user_id: user.user_id,
      email: user.email
    }, process.env.JWT_SECRET, { expiresIn: '1h' }) // Token kadaluwarsa dalam 1 jam
    // --------------------------------------------------

    const data = {
      token: token, // <-- Token ini yang dikirim ke Frontend/Postman
      user_id: user.user_id,
      nama: user.nama
    }
    return response(200, data, "Login Berhasil", res)

  })
})

app.post('/logout',(req,res) =>{
  res.cookie('jwt',"",{
    httpOnly : true,
    expires : new Date(Date.now())
  })

  return response(200, data, "logout Berhasil", res)
})


// --- ENDPOINT: LIHAT SEMUA DECK SAYA ---
app.get('/my_decks', cekToken, (req, res) => {
  // 1. Ambil ID user dari Token (hasil kerja Satpam cekToken)
  const userId = req.user.user_id

  // 2. Query ke database: "Cari deck yang user_id nya = userId ini"
  const sql = "SELECT * FROM decks WHERE user_id = ?"

  db.query(sql, [userId], (error, result) => {
    if (error) {
      return response(500, null, "Gagal mengambil data deck", res)
    }

    // Berikan datanya ke user
    response(200, result, "Berhasil mengambil daftar deck", res)
  })
})

// --- ENDPOINT: HAPUS DECK ---
app.delete('/deck/:id', cekToken, (req, res) => {
  // 1. Ambil ID deck dari URL (misal: /deck/5 -> maka id=5)
  const deckId = req.params.id

  // 2. Ambil ID user dari Token
  const userId = req.user.user_id

  // 3. Query Hapus dengan PENGAMAN GANDA
  // Logika: "Hapus deck JIKA deck_id nya sekian DAN pemiliknya adalah user ini"
  const sql = "DELETE FROM decks WHERE deck_id = ? AND user_id = ?"

  db.query(sql, [deckId, userId], (error, result) => {
    if (error) {
      return response(500, null, "Gagal menghapus deck", res)
    }

    // Cek apakah ada baris yang terhapus?
    if (result.affectedRows === 0) {
      // Jika 0, artinya: Deck tidak ditemukan ATAU Deck itu bukan milik user ini
      return response(404, null, "Deck tidak ditemukan atau bukan milik Anda", res)
    }

    response(200, null, "Deck berhasil dihapus", res)
  })
})


// Flashcard
// --- 1. TAMBAH FLASHCARD BARU ---
app.post('/flashcard', cekToken, (req, res) => {
  const { deck_id, pertanyaan, jawaban } = req.body
  const userId = req.user.user_id

  // Validasi input
  if (!deck_id || !pertanyaan || !jawaban) {
    return response(400, null, "Data tidak lengkap!", res)
  }

  // STEP 1: Cek dulu, apakah deck_id ini milik si User?
  const sqlCekDeck = "SELECT * FROM decks WHERE deck_id = ? AND user_id = ?"

  db.query(sqlCekDeck, [deck_id, userId], (err, result) => {
    if (err) return response(500, null, "Error Database", res)

    // Jika deck tidak ditemukan atau bukan milik user
    if (result.length === 0) {
      return response(404, null, "Deck tidak ditemukan atau bukan milik Anda", res)
    }

    // STEP 2: Kalau Deck aman, baru Insert Flashcard
    const sqlInsert = "INSERT INTO flashcards (deck_id, pertanyaan, jawaban) VALUES (?, ?, ?)"

    db.query(sqlInsert, [deck_id, pertanyaan, jawaban], (err, resInsert) => {
      if (err) return response(500, null, "Gagal tambah kartu", res)

      response(201, { insertId: resInsert.insertId }, "Berhasil menambahkan Flashcard", res)
    })
  })
})

// --- 2. LIHAT SEMUA KARTU DALAM SATU DECK ---
// URL contoh: /deck/5/flashcards (Mengambil kartu dari Deck ID 5)
app.get('/deck/:deck_id/flashcards', cekToken, (req, res) => {
  const deckId = req.params.deck_id
  const userId = req.user.user_id

  // Query Pintar (JOIN):
  // "Ambil kartu, TAPI pastikan deck-nya milik user ini"
  const sql = `
    SELECT f.* FROM flashcards f
    JOIN decks d ON f.deck_id = d.deck_id
    WHERE f.deck_id = ? AND d.user_id = ?
  `

  db.query(sql, [deckId, userId], (err, result) => {
    if (err) return response(500, null, "Error mengambil kartu", res)

    if (result.length === 0) {
      return response(404, null, "Kartu kosong atau Deck tidak ditemukan", res)
    }

    response(200, result, "Berhasil mengambil data flashcard", res)
  })
})

// --- 3. EDIT FLASHCARD ---
app.put('/flashcard/:id', cekToken, (req, res) => {
  const flashcardId = req.params.id
  const userId = req.user.user_id
  const { pertanyaan, jawaban } = req.body

  // SQL Update dengan JOIN (Keamanan Tingkat Tinggi)
  // "Update kartu HANYA JIKA kartu itu ada di deck milik user ini"
  const sql = `
    UPDATE flashcards f
    JOIN decks d ON f.deck_id = d.deck_id
    SET f.pertanyaan = ?, f.jawaban = ?
    WHERE f.flashcard_id = ? AND d.user_id = ?
  `

  db.query(sql, [pertanyaan, jawaban, flashcardId, userId], (err, result) => {
    if (err) return response(500, null, "Gagal update kartu", res)

    if (result.affectedRows === 0) {
      return response(404, null, "Kartu tidak ditemukan atau Anda tidak berhak mengeditnya", res)
    }

    response(200, null, "Berhasil update kartu", res)
  })
})

// --- 4. HAPUS FLASHCARD ---
app.delete('/flashcard/:id', cekToken, (req, res) => {
  const flashcardId = req.params.id
  const userId = req.user.user_id

  // Syntax Delete dengan JOIN di MySQL sedikit unik:
  // DELETE tabel_target FROM ...
  const sql = `
    DELETE f 
    FROM flashcards f
    JOIN decks d ON f.deck_id = d.deck_id
    WHERE f.flashcard_id = ? AND d.user_id = ?
  `

  db.query(sql, [flashcardId, userId], (err, result) => {
    if (err) return response(500, null, "Gagal hapus kartu", res)

    if (result.affectedRows === 0) {
      return response(404, null, "Gagal hapus (Kartu tidak ditemukan/Bukan milik Anda)", res)
    }

    response(200, null, "Berhasil hapus flashcard", res)
  })
})


//Studylogs
// --- ENDPOINT: CATAT SESI BELAJAR ---
app.post('/log_session', cekToken, (req, res) => {
  const { deck_id, durasi } = req.body // durasi dalam menit atau detik
  const userId = req.user.user_id

  if (!deck_id || !durasi) {
    return response(400, null, "Data deck_id dan durasi wajib diisi", res)
  }

  // Langsung masukkan ke 'Buku Harian' (studylogs)
  const sql = "INSERT INTO studylogs (user_id, deck_id, durasi_belajar, created) VALUES (?, ?, ?, NOW())"

  db.query(sql, [userId, deck_id, durasi], (err, result) => {
    if (err) {
      console.log(err)
      return response(500, null, "Gagal mencatat sesi belajar", res)
    }
    response(201, null, "Sesi belajar berhasil disimpan!", res)
  })
})

// --- ENDPOINT: STATISTIK BELAJAR SAYA ---
app.get('/statistics', cekToken, (req, res) => {
  const userId = req.user.user_id

  // Query Canggih: Menghitung total sekaligus
  const sql = `
    SELECT 
        COUNT(*) as total_sesi, 
        SUM(durasi_belajar) as total_waktu_belajar 
    FROM studylogs 
    WHERE user_id = ?
  `

  db.query(sql, [userId], (err, result) => {
    if (err) return response(500, null, "Gagal mengambil statistik", res)

    // Jika user belum pernah belajar, resultnya mungkin null/0
    const stats = result[0]

    // Kita rapikan datanya agar enak dibaca Frontend
    const dataRapi = {
      total_sesi: stats.total_sesi || 0, // Kalau null, jadikan 0
      total_waktu: stats.total_waktu_belajar || 0,
      pesan_semangat: "Terus tingkatkan belajarmu!"
    }

    response(200, dataRapi, "Statistik User", res)
  })
})


app.post('/coba', (req, res) => {
  res.send('POST request to the homepage')
  db.query("SELECT * FROM `user`", (error, result) => {
    console.log(result)
    res.send(result)
  })
})

//jangan dicoba bawa

// --- FUNGSI SATPAM (Middleware) ---
function cekToken(req, res, next) {
  // 1. Ambil token dari Header
  const authHeader = req.headers['authorization']
  // Format header biasanya: "Bearer <token_panjang_acak>"
  const token = authHeader && authHeader.split(' ')[1]

  if (token == null) {
    return response(401, null, "Dilarang masuk! Anda tidak punya token.", res)
  }

  // 2. Verifikasi Token
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return response(403, null, "Token tidak valid atau sudah kadaluwarsa.", res)
    }
    // Jika aman, data user dari token disimpan ke req.user
    req.user = user
    next() // Lanjut ke fungsi berikutnya (boleh masuk)
  })
}

// --- CONTOH ENDPOINT YANG DIJAGA SATPAM ---
// Perhatikan ada 'cekToken' di tengah-tengah
app.get('/dashboard', cekToken, (req, res) => {
  // Karena sudah lolos satpam, kita bisa tahu siapa yang masuk lewat req.user
  res.json({
    message: "Selamat datang di Dashboard rahasia!",
    data_user_yang_login: req.user
  })
})


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
