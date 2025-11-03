import { useState, useEffect, useRef } from "react"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { MessageCircle, Send, Bot, User, X, Minimize2, Maximize2, RotateCcw } from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { ScrollArea } from "./ui/scroll-area"
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
import { chatApi } from "../lib/api"
import { cn } from "../lib/utils"
import MarkdownMessage from "./MarkdownMessage"

// Helper function to get localStorage key for chat history
const getChatStorageKey = (email) => `dermadoc_chat_${email}`

const INITIAL_MESSAGE = {
  role: "assistant",
  content: "Hello! I'm DermaDoc, your specialized AI assistant for skin health and dermatology. I can help you with questions about skin conditions, skincare routines, dermatological concerns, and skin-related health topics. What would you like to know about your skin health today?",
}

export default function Chatbot() {
  const { isAuthenticated, user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState([INITIAL_MESSAGE])
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState(null)
  const [streamingContent, setStreamingContent] = useState("")
  const messagesEndRef = useRef(null)

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
  const conversationHistory = messages
    .filter((msg) => msg.id !== streamingMessageId)
    .map((msg) => ({
      role: msg.role,
      content: msg.content,
    }))

  const handleSend = async (e) => {
    e.preventDefault()
    const userMessage = message.trim()
    if (!userMessage) return

    // Add user message to UI immediately
    setMessages((prev) => [...prev, { role: "user", content: userMessage }])
    setMessage("")

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
      await chatApi.sendMessage(userMessage, conversationHistory, (chunk, done) => {
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

  const toggleChat = () => {
    setIsOpen(!isOpen)
    if (!isOpen) {
      setIsMinimized(false)
    }
  }

  const handleMinimize = () => {
    setIsMinimized(true)
  }

  const handleClose = () => {
    setIsOpen(false)
    setIsMinimized(false)
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
          onClick={toggleChat}
          size="lg"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all z-40"
          aria-label="Open chatbot"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* Floating Chat Window */}
      {isOpen && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-40 flex flex-col bg-background border rounded-lg shadow-2xl transition-all duration-300",
            isMinimized ? "w-80 h-16" : "w-96 h-[600px]"
          )}
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
                  onClick={() => setIsMinimized(false)}
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
              {/* Messages Area */}
              <ScrollArea className="flex-1 px-4 py-4 min-h-0">
                <div className="space-y-4">
                  {messages.map((msg, index) => {
                    const isStreaming = msg.id === streamingMessageId
                    const displayContent = isStreaming ? streamingContent : msg.content
                    
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
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
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
              </ScrollArea>

              {/* Input Area */}
              <form onSubmit={handleSend} className="px-4 py-4 border-t">
                <div className="flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message..."
                    disabled={!!streamingMessageId}
                    className="flex-1"
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
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
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

