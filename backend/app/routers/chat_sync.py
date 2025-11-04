from fastapi import APIRouter, HTTPException, status, Depends
from google import generativeai as genai
from app.models.chat import ChatRequest, ChatResponse, ChatMessage
from app.core.config import settings
from app.core.prompts import DERMADOC_SYSTEM_INSTRUCTIONS, DERMADOC_INITIAL_GREETING
from app.routers.auth import get_current_user
from app.models.user import User

router = APIRouter()

# Configure Gemini
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

# Model name for Gemini 2.5 Flash Lite
GEMINI_MODEL = "gemini-2.5-flash-lite"


@router.post("/chat/sync", response_model=ChatResponse)
async def chat_sync(
    chat_request: ChatRequest,
    current_user: User = Depends(get_current_user)
):
    """Non-streaming chat endpoint (for compatibility)"""
    try:
        api_key = (settings.GEMINI_API_KEY or "").strip()
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Gemini API key not configured. Please set GEMINI_API_KEY in your .env file."
            )
        
        genai.configure(api_key=api_key)

        model = genai.GenerativeModel(
            GEMINI_MODEL,
            system_instruction=DERMADOC_SYSTEM_INSTRUCTIONS
        )
        
        chat_history = chat_request.conversation_history or []
        
        if chat_history and len(chat_history) > 0:
            filtered_history = [
                msg for msg in chat_history 
                if not (msg.role == "assistant" and "Hello! I'm DermaDoc" in msg.content)
            ]
            gemini_history = [
                {
                    "role": "model" if msg.role == "assistant" else msg.role,
                    "parts": [msg.content]
                }
                for msg in filtered_history
            ]
            chat_session = model.start_chat(history=gemini_history)
        else:
            chat_session = model.start_chat(history=[
                {"role": "model", "parts": [DERMADOC_INITIAL_GREETING]}
            ])
        
        response = chat_session.send_message(chat_request.message)
        
        updated_history = chat_history + [
            ChatMessage(role="user", content=chat_request.message),
            ChatMessage(role="assistant", content=response.text)
        ]
        
        return ChatResponse(
            response=response.text,
            conversation_history=updated_history
        )
        
    except Exception as e:
        print(f"Chat error: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing chat message: {str(e)}"
        )

