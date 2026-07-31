from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
import os
import ollama

from database import engine, Base, get_db
from models import SessionModel, MessageModel
from router import generate_llm_response

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Lenny Growth Assistant API")

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active config state
CURRENT_CONFIG = {
    "provider": os.getenv("LLM_PROVIDER", "ollama")
}

class ChatPayload(BaseModel):
    session_id: str
    message: str
    skill: str = "qa"  # "qa" or "ship30for30"

class ConfigPayload(BaseModel):
    provider: str  # "ollama" or "claude"

def generate_session_title(first_prompt: str) -> str:
    """Generates a concise 3-to-5 word title based on the user's initial prompt."""
    try:
        response = ollama.chat(
            model="llama3",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a concise title generator. Generate a 3 to 5 word title for a chat "
                        "session based on the user prompt. Do NOT use quotes, markdown formatting, "
                        "or ending punctuation. Return ONLY the title text."
                    )
                },
                {
                    "role": "user",
                    "content": first_prompt
                }
            ]
        )
        title = response['message']['content'].strip().strip('"').strip("'")
        return title[:45]  # Cap length at 45 characters
    except Exception:
        # Fallback if Ollama encounters an error
        words = first_prompt.split()
        return " ".join(words[:4]).capitalize() if words else "Growth Session"


@app.get("/api/sessions")
def get_sessions(db: Session = Depends(get_db)):
    return db.query(SessionModel).order_by(SessionModel.created_at.desc()).all()

@app.post("/api/sessions")
def create_session(db: Session = Depends(get_db)):
    new_session = SessionModel(title="New Growth Session")
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session

@app.post("/api/config")
def update_config(payload: ConfigPayload):
    if payload.provider not in ["ollama", "claude"]:
        raise HTTPException(status_code=400, detail="Invalid provider")
    CURRENT_CONFIG["provider"] = payload.provider
    return {"status": "success", "provider": CURRENT_CONFIG["provider"]}

@app.get("/api/config")
def get_config():
    return CURRENT_CONFIG

@app.post("/api/chat")
def chat(payload: ChatPayload, db: Session = Depends(get_db)):
    # 1. Fetch current session and check if it needs a new title
    session_obj = db.query(SessionModel).filter(SessionModel.id == payload.session_id).first()
    
    if session_obj and (session_obj.title == "New Growth Session" or session_obj.title == "New Session"):
        new_title = generate_session_title(payload.message)
        session_obj.title = new_title
        db.commit()

    # 2. Save User Message
    user_msg = MessageModel(
        session_id=payload.session_id,
        role="user",
        content=payload.message
    )
    db.add(user_msg)
    db.commit()

    # 3. Generate Assistant Response
    ai_response = generate_llm_response(
        prompt=payload.message,
        provider=CURRENT_CONFIG["provider"],
        skill=payload.skill
    )

    # 4. Save Assistant Message
    assistant_msg = MessageModel(
        session_id=payload.session_id,
        role="assistant",
        content=ai_response
    )
    db.add(assistant_msg)
    db.commit()

    return {"response": ai_response}

@app.get("/api/sessions/{session_id}/messages")
def get_session_messages(session_id: str, db: Session = Depends(get_db)):
    messages = (
        db.query(MessageModel)
        .filter(MessageModel.session_id == session_id)
        .order_by(MessageModel.created_at.asc())
        .all()
    )
    return [{"role": m.role, "content": m.content} for m in messages]