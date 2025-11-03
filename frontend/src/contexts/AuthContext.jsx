import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { authApi } from "../lib/api"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Check for existing auth on mount and validate token
  useEffect(() => {
    const validateAndRestoreAuth = async () => {
      const storedUser = localStorage.getItem("user")
      const token = localStorage.getItem("token")

      if (storedUser && token) {
        try {
          // Validate token by fetching current user
          const userData = await authApi.getCurrentUser()
          if (userData && userData.id) {
            // Token is valid, restore auth state
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
          } else {
            // Invalid response, clear auth
            localStorage.removeItem("user")
            localStorage.removeItem("token")
          }
        } catch (error) {
          // Token is invalid or expired, clear auth state
          console.error("Token validation failed:", error)
          localStorage.removeItem("user")
          localStorage.removeItem("token")
          setUser(null)
          setIsAuthenticated(false)
        }
      }
      setIsLoading(false)
    }

    validateAndRestoreAuth()
  }, [])

  // Listen for auth logout events (e.g., when token is cleared by apiRequest on 401)
  useEffect(() => {
    const handleAuthLogout = () => {
      // Clear auth state when logout event is fired (e.g., from 401 error)
      setUser(null)
      setIsAuthenticated(false)
    }

    window.addEventListener("auth:logout", handleAuthLogout)
    return () => window.removeEventListener("auth:logout", handleAuthLogout)
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

