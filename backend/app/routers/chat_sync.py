from fastapi import APIRouter, HTTPException, status, Depends
from google import generativeai as genai
from app.models.chat import ChatRequest, ChatResponse, ChatMessage
from app.core.config import settings
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

        system_instructions = """You are DermaDoc, a specialized AI assistant for skin health and dermatology ONLY. 

CRITICAL RULES - You MUST follow these strictly:
1. ONLY answer questions about: skin health, dermatology, skincare routines, skin conditions, skin diseases, skin care products, skin treatments, and skin-related medical topics.
2. ALWAYS politely decline and redirect questions about: general topics, other medical fields, technology, science (unless skin-related), history, math, entertainment, sports, news, programming, or ANY topic not directly related to skin health.
3. When declining, say: "I'm DermaDoc, specialized in skin health only. I can help with skin conditions, skincare, or dermatological questions. What skin health concern can I assist you with?"
4. Provide evidence-based information ONLY for skin-related topics.
5. Always remind users you're not a replacement for professional medical advice - they should consult a dermatologist for serious concerns.

Your expertise is LIMITED to dermatology and skin health. Acknowledge this limitation clearly when asked about other topics."""

        model = genai.GenerativeModel(
            GEMINI_MODEL,
            system_instruction=system_instructions
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
                {"role": "model", "parts": ["Hello! I'm DermaDoc, your specialized AI assistant for skin health and dermatology. I can help you with questions about skin conditions, skincare routines, dermatological concerns, and skin-related health topics. What would you like to know about your skin health today?"]}
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

