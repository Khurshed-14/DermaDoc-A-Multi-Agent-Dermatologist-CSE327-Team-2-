from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import StreamingResponse
from google import generativeai as genai
from app.models.chat import ChatRequest, ChatResponse, ChatMessage
from app.core.config import settings
from app.routers.auth import get_current_user
from app.models.user import User
import json

router = APIRouter()

# Configure Gemini
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

# Model name for Gemini 2.5 Flash Lite
GEMINI_MODEL = "gemini-2.5-flash-lite"


@router.post("/chat", response_model=ChatResponse)
async def chat(
    chat_request: ChatRequest,
    current_user: User = Depends(get_current_user)
):
    """Chat with Gemini 2.5 Flash Lite chatbot"""
    try:
        # Check if API key is configured (strip whitespace to handle any accidental spaces)
        api_key = (settings.GEMINI_API_KEY or "").strip()
        if not api_key:
            print(f"DEBUG: GEMINI_API_KEY value: '{settings.GEMINI_API_KEY}' (type: {type(settings.GEMINI_API_KEY)}, length: {len(settings.GEMINI_API_KEY) if settings.GEMINI_API_KEY else 0})")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Gemini API key not configured. Please set GEMINI_API_KEY in your .env file."
            )
        
        # Reconfigure with the stripped key
        genai.configure(api_key=api_key)

        # System instructions to enforce skin-only restrictions
        system_instructions = """You are DermaDoc, a specialized AI assistant for skin health and dermatology ONLY. 

CRITICAL RULES - You MUST follow these strictly:
1. ONLY answer questions about: skin health, dermatology, skincare routines, skin conditions, skin diseases, skin care products, skin treatments, and skin-related medical topics.
2. ALWAYS politely decline and redirect questions about: general topics, other medical fields, technology, science (unless skin-related), history, math, entertainment, sports, news, programming, or ANY topic not directly related to skin health.
3. When declining, say: "I'm DermaDoc, specialized in skin health only. I can help with skin conditions, skincare, or dermatological questions. What skin health concern can I assist you with?"
4. Provide evidence-based information ONLY for skin-related topics.
5. Always remind users you're not a replacement for professional medical advice - they should consult a dermatologist for serious concerns.

Your expertise is LIMITED to dermatology and skin health. Acknowledge this limitation clearly when asked about other topics."""

        # Initialize the model with system instructions
        model = genai.GenerativeModel(
            GEMINI_MODEL,
            system_instruction=system_instructions
        )
        
        # Build conversation history if provided
        chat_history = chat_request.conversation_history or []
        
        # Note: For Gemini, we'll send the full conversation history each time
        # This is simpler than maintaining state across requests
        # Gemini uses "model" instead of "assistant" for the AI role
        
        if chat_history and len(chat_history) > 0:
            # Filter out the initial greeting if present
            filtered_history = [
                msg for msg in chat_history 
                if not (msg.role == "assistant" and "Hello! I'm DermaDoc" in msg.content)
            ]
            # Convert "assistant" to "model" for Gemini API
            gemini_history = [
                {
                    "role": "model" if msg.role == "assistant" else msg.role,
                    "parts": [msg.content]
                }
                for msg in filtered_history
            ]
            chat_session = model.start_chat(history=gemini_history)
        else:
            # Start chat with initial greeting (system instructions already set in model initialization)
            chat_session = model.start_chat(history=[
                {"role": "model", "parts": ["Hello! I'm DermaDoc, your specialized AI assistant for skin health and dermatology. I can help you with questions about skin conditions, skincare routines, dermatological concerns, and skin-related health topics. What would you like to know about your skin health today?"]}
            ])
        
        # Configure generation settings with token limits
        generation_config = {
            "max_output_tokens": settings.CHAT_MAX_OUTPUT_TOKENS,
        }
        
        # Truncate conversation history if it exceeds input token limit
        # Rough estimation: ~4 characters per token, but we'll be conservative
        # and limit by message count and content length
        if chat_history and len(chat_history) > 0:
            # Estimate tokens: roughly 1 token per 4 characters
            total_chars = sum(len(msg.content) for msg in chat_history) + len(chat_request.message)
            estimated_tokens = total_chars // 4
            
            if estimated_tokens > settings.CHAT_MAX_INPUT_TOKENS:
                # Truncate by removing oldest messages, keeping the most recent ones
                # Keep system message and last few exchanges
                max_chars = (settings.CHAT_MAX_INPUT_TOKENS * 4) - len(chat_request.message) - 500  # Reserve space
                truncated_history = []
                current_chars = 0
                
                # Keep messages from the end (most recent)
                for msg in reversed(chat_history):
                    msg_chars = len(msg.content)
                    if current_chars + msg_chars <= max_chars:
                        truncated_history.insert(0, msg)
                        current_chars += msg_chars
                    else:
                        break
                
                if truncated_history:
                    # Filter out the initial greeting if present (same logic as above)
                    filtered_truncated_history = [
                        msg for msg in truncated_history 
                        if not (msg.role == "assistant" and "Hello! I'm DermaDoc" in msg.content)
                    ]
                    # Convert "assistant" to "model" for Gemini API
                    gemini_history = [
                        {
                            "role": "model" if msg.role == "assistant" else msg.role,
                            "parts": [msg.content]
                        }
                        for msg in filtered_truncated_history
                    ]
                    chat_session = model.start_chat(history=gemini_history)
                else:
                    # If truncation removed everything, start fresh
                    chat_session = model.start_chat(history=[
                        {"role": "model", "parts": ["Hello! I'm DermaDoc, your specialized AI assistant for skin health and dermatology. I can help you with questions about skin conditions, skincare routines, dermatological concerns, and skin-related health topics. What would you like to know about your skin health today?"]}
                    ])
        
        # Send message and get streaming response
        response = chat_session.send_message(
            chat_request.message,
            stream=True,
            generation_config=generation_config
        )
        
        # Collect full response for history
        full_response = ""
        
        async def generate_stream():
            nonlocal full_response
            try:
                for chunk in response:
                    # Handle different chunk types
                    if hasattr(chunk, 'text') and chunk.text:
                        full_response += chunk.text
                        # Send chunk as JSON
                        yield f"data: {json.dumps({'chunk': chunk.text, 'done': False})}\n\n"
                    elif hasattr(chunk, 'parts') and chunk.parts:
                        # Handle parts array
                        for part in chunk.parts:
                            if hasattr(part, 'text') and part.text:
                                full_response += part.text
                                yield f"data: {json.dumps({'chunk': part.text, 'done': False})}\n\n"
                
                # Always send completion signal, even if stream ended
                yield f"data: {json.dumps({'chunk': '', 'done': True, 'full_response': full_response})}\n\n"
            except StopIteration:
                # Stream ended normally, send completion
                yield f"data: {json.dumps({'chunk': '', 'done': True, 'full_response': full_response})}\n\n"
            except Exception as e:
                error_msg = f"Error in streaming: {str(e)}"
                print(f"Streaming error: {error_msg}")
                # Send error and completion signal
                yield f"data: {json.dumps({'chunk': '', 'error': error_msg, 'done': True, 'full_response': full_response})}\n\n"
        
        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            }
        )
        
    except Exception as e:
        print(f"Chat error: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing chat message: {str(e)}"
        )

