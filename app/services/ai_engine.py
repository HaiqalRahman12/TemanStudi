import json
import logging
import re
import os
from llama_cpp import Llama
from huggingface_hub import hf_hub_download

# Setup Logger
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("TemanStudi-Kaggle")

# Default Config jika path tidak ditemukan
DEFAULT_REPO_ID = "unsloth/Qwen3-4B-Instruct-2507-GGUF"
DEFAULT_FILENAME = "Qwen3-4B-Instruct-2507-Q5_K_M.gguf"

class AIBackendEngine:
    def __init__(self, model_path: str):
        # --- LOGIKA PENCARIAN & DOWNLOAD OTOMATIS (Robust) ---
        final_path = None
        
        # 1. Cek apakah path yang diberikan valid (Absolute/Relative)
        if os.path.exists(model_path):
            final_path = model_path
        else:
            # 2. Cek di folder models/ dalam project
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            filename = os.path.basename(model_path)
            potential_path = os.path.join(base_dir, "models", filename)
            
            if os.path.exists(potential_path):
                final_path = potential_path
            
            # 3. FALLBACK: Download Online jika tidak ditemukan dimanapun
            if not final_path:
                logger.warning(f"⚠️ Model tidak ditemukan di: {model_path} atau {potential_path}")
                logger.info(f"⏳ Mencoba download otomatis dari HuggingFace: {DEFAULT_REPO_ID} ...")
                
                try:
                    # Download ke folder ./models
                    download_dir = os.path.join(base_dir, "models")
                    os.makedirs(download_dir, exist_ok=True)
                    
                    final_path = hf_hub_download(
                        repo_id=DEFAULT_REPO_ID,
                        filename=DEFAULT_FILENAME,
                        local_dir=download_dir
                    )
                    logger.info(f"✅ Model berhasil didownload ke: {final_path}")
                except Exception as e:
                    logger.error(f"❌ Gagal download model: {str(e)}")
                    raise FileNotFoundError("Model file missing and download failed.")
        # -----------------------------------------------------

        logger.info(f"🚀 Memuat Qwen 4B ke Tesla T4 GPU: {final_path}...")
        
        # KONFIGURASI GPU KAGGLE (TESLA T4 - 16GB VRAM)
        self.llm = Llama(
            model_path=final_path,
            n_gpu_layers=-1,      # Load semua layer ke GPU
            n_ctx=8192,           # Context window besar
            n_batch=1024,         # Batch size besar
            verbose=False,
            chat_format="chatml"  # Format native Qwen
        )
        
        # Sliding Window lebih besar untuk T4
        self.chunk_size = 3500  
        self.overlap = 500

    def _create_grammar(self):
        """Pagar Listrik: Memaksa Output JSON Strict"""
        return {
            "type": "json_object",
            "schema": {
                "type": "object",
                "properties": {
                    "flashcards": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "question": {"type": "string"},
                                "answer": {"type": "string"}
                            },
                            "required": ["question", "answer"]
                        }
                    }
                },
                "required": ["flashcards"]
            }
        }

    def _split_text(self, text: str) -> list[str]:
        text = re.sub(r'\s+', ' ', text).strip()
        chunks = []
        start = 0
        text_len = len(text)
        while start < text_len:
            end = start + self.chunk_size
            chunk = text[start:end]
            chunks.append(chunk)
            start += self.chunk_size - self.overlap
        return chunks

    def generate_flashcards(self, full_text: str) -> list[dict]:
        # DEBUG: Cek Teks Masuk
        print(f"\n📄 Input Teks: {len(full_text)} karakter")
        
        chunks = self._split_text(full_text)
        logger.info(f"📚 Memproses {len(chunks)} chunks (High Performance Mode)...")
        all_cards = []

        system_msg = """
        Anda adalah dosen senior yang kritis. 
        Tugas: Ekstrak intisari materi menjadi Flashcard (Tanya-Jawab).
        Aturan:
        1. Buat pertanyaan yang menguji pemahaman konsep dan analisis.
        2. Gunakan Bahasa Indonesia Baku.
        3. Jawaban harus padat dan akurat.
        """

        # Few-shot example 1: Fisika/Umum
        example_user_1 = "Teks: Gravitasi adalah gaya tarik-menarik yang terjadi antara semua partikel yang memiliki massa di alam semesta."
        example_assistant_1 = json.dumps({
            "flashcards": [
                {"question": "Apa definisi dasar dari gaya gravitasi?", "answer": "Gaya tarik-menarik antar partikel bermassa di alam semesta."},
                {"question": "Faktor apa yang mempengaruhi besarnya gaya gravitasi antar dua benda?", "answer": "Massa kedua benda dan jarak di antara keduanya."}
            ]
        })

        # Few-shot example 2: Matematika
        example_user_2 = "Teks: Persamaan kuadrat adalah persamaan polinomial orde dua dengan bentuk umum ax^2 + bx + c = 0, di mana a ≠ 0. Akar-akar persamaan dapat dicari menggunakan rumus ABC yaitu x = (-b ± √(b^2 - 4ac)) / 2a."
        example_assistant_2 = json.dumps({
            "flashcards": [
                {"question": "Bagaimana bentuk umum dari persamaan kuadrat?", "answer": "ax^2 + bx + c = 0, dengan syarat a ≠ 0."},
                {"question": "Sebutkan rumus ABC untuk mencari akar persamaan kuadrat.", "answer": "x = (-b ± √(b^2 - 4ac)) / 2a"}
            ]
        })

        for i, chunk in enumerate(chunks):
            if len(chunk) < 150: continue

            try:
                print(f"⚡ Inference Chunk {i+1}...")
                
                response = self.llm.create_chat_completion(
                    messages=[
                        {"role": "system", "content": system_msg},
                        # MASUKKAN KEDUA CONTOH SECARA EKSPLISIT (FIXED HERE)
                        {"role": "user", "content": example_user_1},
                        {"role": "assistant", "content": example_assistant_1},
                        {"role": "user", "content": example_user_2},
                        {"role": "assistant", "content": example_assistant_2},
                        # INPUT USER
                        {"role": "user", "content": f"Analisis teks ini dan buat 3-5 flashcard:\n\n{chunk}"}
                    ],
                    temperature=0.4, 
                    max_tokens=2048, 
                    response_format=self._create_grammar() # Wajib JSON
                )
                
                content = response['choices'][0]['message']['content']
                data = json.loads(content)
                new_cards = data.get("flashcards", [])
                
                print(f"✅ Chunk {i+1}: Dapat {len(new_cards)} kartu.")
                for card in new_cards:
                    if len(card.get('question','')) > 5:
                        all_cards.append(card)
                        
            except Exception as e:
                logger.error(f"⚠️ Error chunk {i+1}: {e}")
                continue

        logger.info(f"✅ Selesai! Total {len(all_cards)} kartu.")
        return all_cards

# Helper Global untuk Singleton
_engine = None
def get_engine():
    global _engine
    return _engine

def init_engine(path: str):
    global _engine
    _engine = AIBackendEngine(path)