import { useState, useEffect, useRef } from "react"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { MessageCircle, Send, Bot, User, X, Minimize2, Maximize2, RotateCcw, BarChart3, Maximize, Square } from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Textarea } from "./ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog"
import { useAuth } from "../contexts/AuthContext"
import { useChatbot } from "../contexts/ChatbotContext"
import { chatApi } from "../lib/api"
import { cn } from "../lib/utils"
import MarkdownMessage from "./MarkdownMessage"
import PredictionsCard from "./PredictionsCard"

// Helper function to get localStorage key for chat history
const getChatStorageKey = (email) => `dermadoc_chat_${email}`

const INITIAL_MESSAGE = {
  role: "assistant",
  content: "Hello! I'm DermaDoc, your specialized AI assistant for skin health and dermatology. I can help you with questions about skin conditions, skincare routines, dermatological concerns, and skin-related health topics. What would you like to know about your skin health today?",
}

export default function Chatbot() {
  const { isAuthenticated, user } = useAuth()
  const {
    isOpen,
    isMinimized,
    isFullscreen,
    toggleChatbot,
    closeChatbot,
    minimizeChatbot,
    maximizeChatbot,
    toggleFullscreen,
  } = useChatbot()
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState([INITIAL_MESSAGE])
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState(null)
  const [streamingContent, setStreamingContent] = useState("")
  const [pendingPredictions, setPendingPredictions] = useState(null) // Predictions waiting to be sent
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      const scrollHeight = textareaRef.current.scrollHeight
      const maxHeight = 200 // Max height before scrolling (about 8-9 lines)
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`
      textareaRef.current.style.overflowY = scrollHeight > maxHeight ? "auto" : "hidden"
    }
  }, [message])

  // Load chat history from localStorage on mount or when user changes
  useEffect(() => {
    if (isAuthenticated && user?.email) {
      const storageKey = getChatStorageKey(user.email)
      const savedChat = localStorage.getItem(storageKey)
      if (savedChat) {
        try {
          const parsedMessages = JSON.parse(savedChat)
          if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
            setMessages(parsedMessages)
          }
        } catch (error) {
          console.error("Error loading chat history:", error)
          localStorage.removeItem(storageKey)
        }
      }
    }
  }, [isAuthenticated, user?.email])

  // Function to load predictions from sessionStorage
  const loadPendingPredictions = () => {
    if (isOpen && isAuthenticated && !isMinimized) {
      const storedPredictions = sessionStorage.getItem("pendingChatPredictions")
      if (storedPredictions) {
        try {
          const predictionsData = JSON.parse(storedPredictions)
          sessionStorage.removeItem("pendingChatPredictions")
          
          // Store as pending predictions (shown as preview chip before sending)
          setPendingPredictions({
            predictions: predictionsData.predictions,
            disease_type: predictionsData.disease_type,
            confidence: predictionsData.confidence,
            body_part: predictionsData.body_part,
            created_at: predictionsData.created_at,
          })
        } catch (error) {
          console.error("Error parsing predictions:", error)
        }
      }
    }
  }

  // Check for pending predictions or message from sessionStorage when chatbot opens
  useEffect(() => {
    loadPendingPredictions()
    
    // Check for regular message
    if (isOpen && isAuthenticated && !isMinimized) {
      const pendingMessage = sessionStorage.getItem("pendingChatMessage")
      if (pendingMessage) {
        sessionStorage.removeItem("pendingChatMessage")
        // Small delay to ensure chatbot is fully rendered
        setTimeout(() => {
          setMessage(pendingMessage)
          // Trigger send after message is set
          setTimeout(() => {
            const form = document.querySelector('form[data-chatbot-form]')
            if (form && pendingMessage) {
              const submitEvent = new Event('submit', { bubbles: true, cancelable: true })
              form.dispatchEvent(submitEvent)
            }
          }, 100)
        }, 200)
      }
    }
  }, [isOpen, isAuthenticated, isMinimized])

  // Listen for custom event when predictions are added (even if chatbot is already open)
  useEffect(() => {
    const handleAddPredictions = (event) => {
      const predictionsData = event.detail
      if (predictionsData) {
        setPendingPredictions({
          predictions: predictionsData.predictions,
          disease_type: predictionsData.disease_type,
          confidence: predictionsData.confidence,
          body_part: predictionsData.body_part,
          created_at: predictionsData.created_at,
        })
      }
    }

    window.addEventListener("chatbot:addPredictions", handleAddPredictions)
    return () => window.removeEventListener("chatbot:addPredictions", handleAddPredictions)
  }, [])

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    if (isAuthenticated && user?.email && messages.length > 0) {
      const storageKey = getChatStorageKey(user.email)
      try {
        localStorage.setItem(storageKey, JSON.stringify(messages))
      } catch (error) {
        console.error("Error saving chat history:", error)
      }
    }
  }, [messages, isAuthenticated, user?.email])

  // Convert messages to conversation history format for API
  // Skip predictions-only messages (they're displayed but not sent as text)
  const conversationHistory = messages
    .filter((msg) => msg.id !== streamingMessageId && msg.type !== "predictions" && msg.content)
    .map((msg) => ({
      role: msg.role,
      content: msg.content,
    }))

  const handleSend = async (e) => {
    e.preventDefault()
    const userMessage = message.trim()
    if (!userMessage) return

    // Check if there are pending predictions to include
    let messageContent = userMessage
    
    if (pendingPredictions) {
      // Include predictions summary in the API message (hidden from user)
      const predictionsText = Object.entries(pendingPredictions.predictions || {})
        .map(([label, prob]) => `${label}: ${(prob * 100).toFixed(1)}%`)
        .join(", ")
      messageContent = `[Context: Skin analysis predictions - ${predictionsText}] ${userMessage}`
      
      // Add predictions card to messages first
      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          type: "predictions",
          predictions: pendingPredictions.predictions,
          disease_type: pendingPredictions.disease_type,
          confidence: pendingPredictions.confidence,
          body_part: pendingPredictions.body_part,
          created_at: pendingPredictions.created_at,
        },
      ])
      
      // Clear pending predictions
      setPendingPredictions(null)
    }

    // Add user message to UI immediately
    setMessages((prev) => [...prev, { role: "user", content: userMessage }])
    setMessage("")
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "60px"
    }

    // Create a unique ID for this streaming message
    const messageId = Date.now().toString()
    setStreamingMessageId(messageId)
    setStreamingContent("")

    // Add placeholder assistant message
    setMessages((prev) => [
      ...prev,
      { id: messageId, role: "assistant", content: "" },
    ])

    try {
      let accumulatedContent = ""
      await chatApi.sendMessage(messageContent, conversationHistory, (chunk, done) => {
        if (!done) {
          // Accumulate chunks
          accumulatedContent += chunk
          // Update both streaming state and message content
          setStreamingContent(accumulatedContent)
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId
                ? { ...msg, content: accumulatedContent }
                : msg
            )
          )
        } else {
          // Streaming complete - final update
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId
                ? { ...msg, content: accumulatedContent }
                : msg
            )
          )
          setStreamingMessageId(null)
          setStreamingContent("")
        }
      })
    } catch (error) {
      console.error("Chat error:", error)
      // Remove the failed message
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId))
      setStreamingMessageId(null)
      setStreamingContent("")
      toast.error("Failed to send message", {
        description: error.message || "Please try again.",
      })
    }
  }

  // Auto-scroll to bottom when new messages arrive or streaming content updates
  useEffect(() => {
    if (messagesEndRef.current && isOpen && !isMinimized) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      }, 100)
    }
  }, [messages, streamingContent, isOpen, isMinimized])

  const handleMinimize = () => {
    minimizeChatbot()
  }

  const handleClose = () => {
    closeChatbot()
  }

  const handleResetChat = () => {
    const initialMessages = [INITIAL_MESSAGE]
    setMessages(initialMessages)
    
    // Update localStorage
    if (user?.email) {
      const storageKey = getChatStorageKey(user.email)
      localStorage.setItem(storageKey, JSON.stringify(initialMessages))
    }
    
    setShowResetConfirm(false)
    toast.success("Chat reset", {
      description: "Your chat history has been cleared.",
    })
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null
  }

  return (
    <>
      {/* Floating Chat Button - Only show when chat is closed */}
      {!isOpen && (
        <Button
          onClick={toggleChatbot}
          size="lg"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all z-40"
          aria-label="Open chatbot"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* Background overlay when in fullscreen */}
      {isOpen && isFullscreen && (
        <div 
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm"
          onClick={toggleFullscreen}
        />
      )}

      {/* Floating Chat Window */}
      {isOpen && (
        <div
          className={cn(
            "fixed z-40 flex flex-col bg-background border rounded-lg shadow-2xl transition-all duration-300",
            isMinimized ? "bottom-6 right-6 w-80 h-16" : 
            isFullscreen ? "inset-0 m-auto" : 
            "bottom-6 right-6 w-96"
          )}
          style={!isMinimized ? {
            height: '80vh',
            maxHeight: '80vh',
            width: isFullscreen ? '65vw' : undefined,
            maxWidth: isFullscreen ? '65vw' : undefined
          } : {}}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50 rounded-t-lg">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-semibold text-sm">DermaDoc</h3>
                <p className="text-xs text-muted-foreground">AI skin health assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {!isMinimized && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowResetConfirm(true)}
                  className="h-8 w-8"
                  aria-label="Reset chat"
                  title="Reset chat"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
              {!isMinimized && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleFullscreen}
                  className="h-8 w-8"
                  aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                  title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                >
                  {isFullscreen ? (
                    <Square className="h-4 w-4" />
                  ) : (
                    <Maximize className="h-4 w-4" />
                  )}
                </Button>
              )}
              {!isMinimized ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleMinimize}
                  className="h-8 w-8"
                  aria-label="Minimize"
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={maximizeChatbot}
                  className="h-8 w-8"
                  aria-label="Maximize"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-8 w-8"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Chat Content - Only show when not minimized */}
          {!isMinimized && (
              <>
                {/* Messages Area - Fixed height, scrolls independently */}
                <div 
                  className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-4"
                >
                  <div className="space-y-4">
                  {messages.map((msg, index) => {
                    const isStreaming = msg.id === streamingMessageId
                    const displayContent = isStreaming ? streamingContent : msg.content
                    
                    // Handle predictions card
                    if (msg.type === "predictions") {
                      return (
                        <div
                          key={`predictions-${index}`}
                          className="flex gap-3 justify-end"
                        >
                          <div className="max-w-[85%]">
                            <PredictionsCard
                              predictions={msg.predictions}
                              disease_type={msg.disease_type}
                              confidence={msg.confidence}
                              body_part={msg.body_part}
                              created_at={msg.created_at}
                            />
                          </div>
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                        </div>
                      )
                    }
                    
                    return (
                      <div
                        key={msg.id || index}
                        className={cn(
                          "flex gap-3",
                          msg.role === "user" ? "justify-end" : "justify-start"
                        )}
                      >
                        {msg.role === "assistant" && (
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <div
                          className={cn(
                            "max-w-[80%] rounded-lg px-4 py-2",
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {msg.role === "assistant" ? (
                            <div className="text-sm">
                              <MarkdownMessage content={displayContent} />
                              {isStreaming && (
                                <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
                              )}
                            </div>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                          )}
                        </div>
                        {msg.role === "user" && (
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {!streamingMessageId && messages[messages.length - 1]?.role === "user" && (
                    <div className="flex gap-3 justify-start">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <div className="bg-muted rounded-lg px-4 py-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input Area - Grows independently */}
              <div className="flex-shrink-0">
                {/* Pending Predictions Preview */}
                {pendingPredictions && (
                  <div className="px-4 pt-3 pb-2 flex-shrink-0">
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border border-border rounded-lg text-xs">
                      <BarChart3 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <span className="text-muted-foreground truncate">
                        Skin Analysis: <span className="font-medium text-foreground">{pendingPredictions.disease_type}</span> ({(pendingPredictions.confidence * 100).toFixed(1)}%)
                      </span>
                      <button
                        type="button"
                        onClick={() => setPendingPredictions(null)}
                        className="ml-auto p-0.5 hover:bg-muted rounded"
                      >
                        <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                      </button>
                    </div>
                  </div>
                )}
                <form onSubmit={handleSend} data-chatbot-form className="px-4 py-3 flex-shrink-0 relative">
                  <div className="relative">
                    <Textarea
                      ref={textareaRef}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={pendingPredictions ? "Ask about your results..." : "Type your message..."}
                      disabled={!!streamingMessageId}
                      className="flex-1 resize-none min-h-[60px] max-h-[200px] overflow-y-auto pr-12"
                      rows={1}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          handleSend(e)
                        }
                      }}
                    />
                    <Button
                      type="submit"
                      disabled={!message.trim() || !!streamingMessageId}
                      size="icon"
                      className="absolute bottom-2 right-2 h-8 w-8 rounded-full flex-shrink-0 shadow-md"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      )}

      {/* Reset Chat Confirmation Modal */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Chat History</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear your chat history? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetChat}>
              Reset Chat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

