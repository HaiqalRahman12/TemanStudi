import json
import logging
import re
import os
from llama_cpp import Llama

# Setup Logger
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("TemanStudi-Kaggle")

class AIBackendEngine:
    def __init__(self, model_path: str):
        # --- LOGIKA PENCARIAN PATH MODEL (Updated) ---
        # 1. Cek apakah path yang diberikan valid (Absolute atau Relative to CWD)
        if os.path.exists(model_path):
            final_path = model_path
        else:
            # 2. Fallback: Cek relatif terhadap struktur folder project
            # Struktur: TemanStudi/app/services/ai_engine.py -> Mundur 3 level ke root -> models/
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            # Ambil nama filenya saja jika input berupa path panjang yang salah
            filename = os.path.basename(model_path)
            potential_path = os.path.join(base_dir, "models", filename)
            
            if os.path.exists(potential_path):
                final_path = potential_path
            else:
                logger.error(f"❌ Model tidak ditemukan di: {model_path}")
                logger.error(f"❌ Juga tidak ditemukan di fallback: {potential_path}")
                raise FileNotFoundError("Model file missing.")
        # ---------------------------------------------

        logger.info(f"🚀 Memuat Qwen 4B ke Tesla T4 GPU: {final_path}...")
        
        # KONFIGURASI GPU KAGGLE (TESLA T4 - 16GB VRAM)
        self.llm = Llama(
            model_path=final_path,
            n_gpu_layers=-1,      # Load semua layer ke GPU
            n_ctx=8192,           # Context window besar (T4 kuat nampung ini)
            n_batch=1024,         # Batch size besar biar ngebut
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

        # Few-shot example untuk menuntun logika model
        example_user = "Teks: Gravitasi adalah gaya tarik-menarik yang terjadi antara semua partikel yang memiliki massa di alam semesta."
        example_assistant = json.dumps({
            "flashcards": [
                {"question": "Apa definisi dasar dari gaya gravitasi?", "answer": "Gaya tarik-menarik antar partikel bermassa di alam semesta."},
                {"question": "Faktor apa yang mempengaruhi besarnya gaya gravitasi antar dua benda?", "answer": "Massa kedua benda dan jarak di antara keduanya."}
            ]
        })

        for i, chunk in enumerate(chunks):
            if len(chunk) < 150: continue

            try:
                # Menggunakan Qwen 4B
                response = self.llm.create_chat_completion(
                    messages=[
                        {"role": "system", "content": system_msg},
                        {"role": "user", "content": example_user},
                        {"role": "assistant", "content": example_assistant},
                        {"role": "user", "content": f"Analisis teks ini dan buat 3-5 flashcard:\n\n{chunk}"}
                    ],
                    temperature=0.4, 
                    max_tokens=2048, # Output lebih panjang
                    response_format=self._create_grammar() # Wajib JSON
                )
                
                content = response['choices'][0]['message']['content']
                data = json.loads(content)
                new_cards = data.get("flashcards", [])
                
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