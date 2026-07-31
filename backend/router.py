import os
import ollama
from anthropic import Anthropic, APIError
import chromadb
from sentence_transformers import SentenceTransformer

# Load Vector DB
chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection(name="lenny_transcripts")
embedder = SentenceTransformer('all-MiniLM-L6-v2')

SHIP30FOR30_PROMPT = """
You are an expert product growth writer following the Ship30for30 framework.
Synthesize the provided context into an atomic essay (~1250 words) with:
1. Strong, counter-intuitive opening hook line.
2. Formatted for high skimmability using bolded terms, short paragraphs, and bullet points.
3. Structured as: Problem -> Actionable Solution Framework -> Examples -> Key Takeaway.
"""

def query_rag_context(user_query: str) -> str:
    query_emb = embedder.encode([user_query]).tolist()
    results = collection.query(query_embeddings=query_emb, n_results=3)
    
    docs = results.get("documents", [[]])[0]
    return "\n---\n".join(docs) if docs else "No relevant transcripts found."

def generate_llm_response(prompt: str, provider: str = "ollama", skill: str = "qa") -> str:
    context = query_rag_context(prompt)
    
    if skill == "ship30for30":
        system_instruction = SHIP30FOR30_PROMPT
    else:
        system_instruction = "You are Lenny's Growth Assistant. Answer strictly and accurately using context from Lenny's Podcast transcripts provided."

    full_user_prompt = f"Context from Transcripts:\n{context}\n\nUser Question: {prompt}"

    if provider == "claude":
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key or api_key.strip() == "" or "your_api_key" in api_key.lower():
            return (
                "⚠️ **Claude API Key Missing:** No valid `ANTHROPIC_API_KEY` was found in your environment. "
                "Switch back to **Local Ollama** in the sidebar to generate responses locally without cloud credentials."
            )
        
        try:
            client = Anthropic(api_key=api_key)
            response = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=2500,
                system=system_instruction,
                messages=[{"role": "user", "content": full_user_prompt}]
            )
            return response.content[0].text
        except APIError as e:
            return f"⚠️ **Claude API Error ({e.status_code}):** {e.message}\n\n*Tip: Switch engine toggle to **Local Ollama** to continue.*"
        except Exception as e:
            return f"⚠️ **Claude Connection Error:** {str(e)}\n\n*Tip: Switch engine toggle to **Local Ollama** to continue.*"
            
    else:
        # Fallback to Local Ollama
        model_name = os.getenv("OLLAMA_MODEL", "llama3")
        try:
            response = ollama.chat(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": full_user_prompt}
                ]
            )
            return response['message']['content']
        except Exception as e:
            return f"❌ **Ollama Error:** Could not communicate with local Ollama service. Ensure `ollama serve` is running in your terminal. Details: {str(e)}"