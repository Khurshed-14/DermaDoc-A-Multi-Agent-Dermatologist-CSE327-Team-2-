import { createContext, useContext, useState } from "react"

const ChatbotContext = createContext(null)

export function ChatbotProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const openChatbot = () => {
    setIsOpen(true)
    setIsMinimized(false)
  }

  const closeChatbot = () => {
    setIsOpen(false)
    setIsMinimized(false)
    setIsFullscreen(false)
  }

  const toggleChatbot = () => {
    setIsOpen((prev) => !prev)
    if (!isOpen) {
      setIsMinimized(false)
    }
  }

  const minimizeChatbot = () => {
    setIsMinimized(true)
    setIsFullscreen(false)
  }

  const maximizeChatbot = () => {
    setIsMinimized(false)
  }

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev)
    if (!isFullscreen) {
      setIsMinimized(false)
    }
  }

  const value = {
    isOpen,
    isMinimized,
    isFullscreen,
    openChatbot,
    closeChatbot,
    toggleChatbot,
    minimizeChatbot,
    maximizeChatbot,
    toggleFullscreen,
    setIsOpen,
    setIsMinimized,
  }

  return <ChatbotContext.Provider value={value}>{children}</ChatbotContext.Provider>
}

export function useChatbot() {
  const context = useContext(ChatbotContext)
  if (!context) {
    throw new Error("useChatbot must be used within a ChatbotProvider")
  }
  return context
}

