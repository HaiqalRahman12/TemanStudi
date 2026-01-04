require('dotenv').config()
const express = require('express')
const multer = require('multer')
const axios = require('axios')
const FormData = require('form-data')
const upload = multer({ storage: multer.memoryStorage() })
const db = require('./connection')
const response = require('./response')
const app = express()
const port = process.env.PORT
const bcrypt = require('bcryptjs')

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
    const hashPassword = bcrypt.hashSync(password, 10)

    // 2. Masukkan ke Database
    // (Pastikan nama kolom sesuai dengan database Anda. Saya asumsikan ada kolom 'nama')
    const sql = "INSERT INTO user (email, password, nama, created) VALUES (?, ?, ?, NOW())"

    db.query(sql, [email, hashPassword, nama], (error, result) => {
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
    let passwordValid = false

    // CARA 1: Cek apakah password di DB terlihat seperti hash (diawali $2b$ atau $2a$)
    if (user.password.startsWith('$2b$') || user.password.startsWith('$2a$')) {
      // Jika formatnya hash, gunakan bcrypt
      passwordValid = require('bcryptjs').compareSync(password, user.password)
    } else {
      // Jika tidak (berarti user lama/plain text), bandingkan langsung
      passwordValid = (password === user.password)
    }

    // --- INI BAGIAN PEMBUATAN JWT (Mencetak Gelang) ---
    // Kita simpan data penting (payload) ke dalam token
    if (passwordValid) {
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
    } else {
      return response(401, null, "Password Salah", res)
    }
  })
})

app.post('/logout', (req, res) => {
  res.cookie('jwt', "", {
    httpOnly: true,
    expires: new Date(Date.now())
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
// Endpoint ini butuh: Token (untuk user_id), File, start_page, end_page
app.post('/generate-deck', upload.single('file'), cekToken, async (req, res) => {
    
    // 1. VALIDASI INPUT
    if (!req.file) {
        return response(400, null, "File PDF wajib diupload!", res)
    }
    const { start_page, end_page, nama_deck } = req.body
    const userId = req.user.user_id

    // Default nama deck jika user tidak mengisi
    const finalNamaDeck = nama_deck || `Deck AI - ${new Date().toISOString().split('T')[0]}`

    try {
        // 2. PERSIAPAN KIRIM KE API AI
        // Kita harus menyusun ulang data "Form Data" untuk dikirim ke Python
        const formData = new FormData()
        formData.append('file', req.file.buffer, req.file.originalname)
        formData.append('start_page', start_page || 1) // Default hal 1
        formData.append('end_page', end_page || 5)     // Default hal 5

        // 3. PANGGIL API EKSTERNAL (NGROK)
        // Ganti URL ini sesuai link ngrok Anda yang aktif
        const aiUrl = 'https://utterly-ethical-barnacle.ngrok-free.app/generate'
        
        console.log("Sedang meminta AI membuat soal...")
        const aiResponse = await axios.post(aiUrl, formData, {
            headers: {
                ...formData.getHeaders() // Header khusus agar dikenali sebagai file upload
            }
        })

        // Ambil data hasil generate dari respon AI
        // Struktur respon AI tadi: { data: [ {pertanyaan: "...", jawaban: "..."} ] }
        const listPertanyaan = aiResponse.data.data

        if (!listPertanyaan || listPertanyaan.length === 0) {
            return response(500, null, "AI tidak menghasilkan pertanyaan apa pun.", res)
        }

        console.log(`Berhasil dapat ${listPertanyaan.length} soal. Menyimpan ke database...`)

        // 4. SIMPAN KE DATABASE (TRANSAKSI)
        
        // A. Buat Deck-nya dulu (Induk)
        const sqlDeck = "INSERT INTO decks (user_id, nama_deck, created) VALUES (?, ?, NOW())"
        
        db.query(sqlDeck, [userId, finalNamaDeck], (err, resultDeck) => {
            if (err) {
                console.error(err)
                return response(500, null, "Gagal membuat Deck", res)
            }

            const newDeckId = resultDeck.insertId

            // B. Masukkan Flashcards hasil AI (Anak)
            // Kita pakai loop atau Bulk Insert. Ini cara simpel dengan Loop:
            
            // Siapkan query insert
            const sqlCard = "INSERT INTO flashcards (deck_id, pertanyaan, jawaban) VALUES ?"
            
            // Ubah format data JSON menjadi Array of Array agar bisa di-insert sekaligus
            // Format: [[deck_id, tanya1, jawab1], [deck_id, tanya2, jawab2], ...]
            const values = listPertanyaan.map(item => [
                newDeckId, 
                item.pertanyaan, 
                item.jawaban
            ])

            db.query(sqlCard, [values], (errCard, resultCard) => {
                if (errCard) {
                    console.error(errCard)
                    return response(500, null, "Deck dibuat tapi Gagal menyimpan kartu", res)
                }

                // SUKSES SEMUANYA!
                const output = {
                    deck_id: newDeckId,
                    jumlah_kartu: listPertanyaan.length,
                    preview: listPertanyaan[0] // Tampilkan 1 contoh
                }
                response(200, output, "Berhasil Generate & Simpan Deck!", res)
            })
        })

    } catch (error) {
        // Error handling jika API AI mati atau Error
        console.error("Error AI Service:", error.message)
        if (error.response) {
            console.error("Detail Error AI:", error.response.data)
        }
        return response(500, null, "Gagal menghubungi layanan AI Generator", res)
    }
})


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


app.get('/coba', (req, res) => {
  db.query("SELECT * FROM `user`", (error, result) => {
    console.log(result)
    res.send(result)
  })
})

// --- ENDPOINT: EDIT PROFIL (UBAH NAMA) ---
// app.put('/update-profile', cekToken, (req, res) => {
//   // 1. Ambil data baru dari Body (yang diketik user)
//   const { nama } = req.body
  
//   // 2. Ambil ID User dari Token (Supaya tidak salah edit orang lain)
//   const userId = req.user.user_id

//   // Validasi: Pastikan nama tidak kosong
//   if (!nama) {
//     return response(400, null, "Nama tidak boleh kosong", res)
//   }

//   // 3. Lakukan Update ke Database
//   // Pastikan nama tabel Anda 'user' atau 'users' (sesuaikan dengan database Anda)
//   const sql = "UPDATE user SET nama = ? WHERE user_id = ?"

//   db.query(sql, [nama, userId], (err, result) => {
//     if (err) {
//       return response(500, null, "Gagal mengupdate profil", res)
//     }

//     // Cek apakah ada data yang berubah
//     // (Kadang result.affectedRows tetap 1 meskipun nama yang dikirim sama persis)
    
//     // Kita berikan respon sukses beserta data barunya
//     const dataBaru = {
//       user_id: userId,
//       nama: nama
//     }
    
//     response(200, dataBaru, "Berhasil mengubah nama profil", res)
//   })
// })

// --- ENDPOINT: EDIT PROFIL (NAMA & PASSWORD) ---
app.put('/update-profile', cekToken, (req, res) => {
  const userId = req.user.user_id
  const { nama, password_lama, password_baru } = req.body

  // 1. Validasi Input Nama (Wajib ada)
  if (!nama) {
    return response(400, null, "Nama tidak boleh kosong", res)
  }

  // 2. Ambil data user dari Database dulu (untuk ambil password lama yang tersimpan)
  const sqlGet = "SELECT * FROM user WHERE user_id = ?"
  
  db.query(sqlGet, [userId], (err, result) => {
    if (err) return response(500, null, "Error mengambil data user", res)
    if (result.length === 0) return response(404, null, "User tidak ditemukan", res)

    const currentUser = result[0]
    let passwordFinal = currentUser.password // Defaultnya pakai password yang sekarang

    // 3. Cek apakah user ingin ganti password?
    if (password_baru) {
      // Jika mau ganti password, Password Lama WAJIB diisi
      if (!password_lama) {
        return response(400, null, "Harap masukkan password lama untuk keamanan.", res)
      }

      // Cek kecocokan password lama
      // Logika ini support password lama yang masih plain text ataupun sudah hash
      let isMatch = false
      if (currentUser.password.startsWith('$2b$') || currentUser.password.startsWith('$2a$')) {
        isMatch = bcrypt.compareSync(password_lama, currentUser.password)
      } else {
        isMatch = (password_lama === currentUser.password)
      }

      if (!isMatch) {
        return response(401, null, "Password lama salah!", res)
      }

      // Jika cocok, enkripsi password baru
      passwordFinal = bcrypt.hashSync(password_baru, 10)
    }

    // 4. Lakukan Update ke Database (Nama & Password)
    const sqlUpdate = "UPDATE user SET nama = ?, password = ? WHERE user_id = ?"

    db.query(sqlUpdate, [nama, passwordFinal, userId], (errUpdate, resultUpdate) => {
      if (errUpdate) return response(500, null, "Gagal update profil", res)

      const dataBaru = {
        user_id: userId,
        nama: nama,
        message: password_baru ? "Nama dan Password berhasil diubah" : "Nama berhasil diubah"
      }

      response(200, dataBaru, "Update Profil Berhasil", res)
    })
  })
})


app.get('/profile', (req, res) => {
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
