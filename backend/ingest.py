import os, glob
import chromadb
from sentence_transformers import SentenceTransformer

# Initialize ChromaDB persistent client inside backend/chroma_db
chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection(name="lenny_transcripts")

embedder = SentenceTransformer('all-MiniLM-L6-v2')

def run_ingestion():
    transcripts_dir = "../data/transcripts"
    # Find all .md or .txt files recursively
    files = glob.glob(f"{transcripts_dir}/**/*.md", recursive=True) + \
            glob.glob(f"{transcripts_dir}/**/*.txt", recursive=True)
    
    if not files:
        print(f"⚠️ No transcript files found in {transcripts_dir}")
        return

    print(f"Found {len(files)} files. Starting embedding...")

    for file_path in files[:20]:  # Limit to 20 files for quick local testing
        file_name = os.path.basename(file_path)
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()

        # Simple Chunking (1000 characters)
        chunks = [text[i:i+1000] for i in range(0, len(text), 800)]
        if not chunks:
            continue
            
        embeddings = embedder.encode(chunks).tolist()
        ids = [f"{file_name}_{idx}" for idx in range(len(chunks))]
        metadatas = [{"source": file_name} for _ in chunks]

        collection.add(
            documents=chunks,
            embeddings=embeddings,
            metadatas=metadatas,
            ids=ids
        )
        print(f"Indexed: {file_name}")

    print("Ingestion completed successfully!")

if __name__ == "__main__":
    run_ingestion()