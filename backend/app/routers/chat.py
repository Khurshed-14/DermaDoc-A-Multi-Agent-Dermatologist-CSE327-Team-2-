from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import StreamingResponse
from google import generativeai as genai
from app.models.chat import ChatRequest, ChatResponse, ChatMessage
from app.core.config import settings
from app.core.prompts import DERMADOC_SYSTEM_INSTRUCTIONS, DERMADOC_INITIAL_GREETING
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
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Gemini API key not configured. Please set GEMINI_API_KEY in your .env file."
            )
        
        # Reconfigure with the stripped key
        genai.configure(api_key=api_key)

        # Initialize the model with system instructions
        model = genai.GenerativeModel(
            GEMINI_MODEL,
            system_instruction=DERMADOC_SYSTEM_INSTRUCTIONS
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
                {"role": "model", "parts": [DERMADOC_INITIAL_GREETING]}
            ])
        
        # Send message and get streaming response
        response = chat_session.send_message(
            chat_request.message,
            stream=True
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

