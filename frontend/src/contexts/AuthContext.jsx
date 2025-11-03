import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { authApi } from "../lib/api"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Check for existing auth on mount
  useEffect(() => {
    // When backend is connected with TanStack Query, this will be handled via hooks
    // For now, check localStorage
    const storedUser = localStorage.getItem("user")
    const token = localStorage.getItem("token")

    if (storedUser && token) {
      try {
        const userData = JSON.parse(storedUser)
        setUser(userData)
        setIsAuthenticated(true)
      } catch (error) {
        console.error("Error parsing stored user data:", error)
        localStorage.removeItem("user")
        localStorage.removeItem("token")
      }
    }
    setIsLoading(false)
  }, [])

  const login = useCallback((userData, token) => {
    // Store user data (without sensitive info)
    const safeUserData = {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      birthdate: userData.birthdate,
      gender: userData.gender,
    }
    setUser(safeUserData)
    setIsAuthenticated(true)
    localStorage.setItem("user", JSON.stringify(safeUserData))
    if (token) {
      localStorage.setItem("token", token)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      setUser(null)
      setIsAuthenticated(false)
      localStorage.removeItem("user")
      localStorage.removeItem("token")
    }
  }, [])

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

