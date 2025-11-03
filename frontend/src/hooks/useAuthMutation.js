import { useMutation, useQueryClient } from "@tanstack/react-query"
import { authApi } from "../lib/api"
import { useAuth } from "../contexts/AuthContext"
import { useNavigate } from "react-router-dom"

/**
 * Custom hook for authentication mutations using TanStack Query
 * This will be used when the FastAPI backend is connected
 */
export function useLogin() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ email, password }) => authApi.login(email, password),
    onSuccess: (data) => {
      login(data.user, data.access_token)
      queryClient.setQueryData(["currentUser"], data.user)
      navigate("/")
    },
    onError: (error) => {
      console.error("Login error:", error)
      throw error
    },
  })
}

export function useSignup() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ name, email, password, birthdate, gender }) => 
      authApi.signup(name, email, password, birthdate, gender),
    onSuccess: (data) => {
      login(data.user, data.access_token)
      queryClient.setQueryData(["currentUser"], data.user)
      navigate("/")
    },
    onError: (error) => {
      console.error("Signup error:", error)
      throw error
    },
  })
}

export function useLogout() {
  const { logout } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      logout()
      queryClient.clear()
    },
    onError: (error) => {
      console.error("Logout error:", error)
      // Still logout even if API call fails
      logout()
      queryClient.clear()
    },
  })
}

