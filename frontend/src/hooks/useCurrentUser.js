import { useQuery } from "@tanstack/react-query"
import { authApi } from "../lib/api"
import { useEffect, useRef } from "react"
import { useAuth } from "../contexts/AuthContext"

/**
 * Custom hook to fetch current user using TanStack Query
 * This will be used when FastAPI backend is connected
 * The AuthContext will be updated via this hook when the backend is ready
 */
export function useCurrentUser() {
  const token = localStorage.getItem("token")
  const { login, user, isAuthenticated } = useAuth()
  const hasLoggedIn = useRef(false)

  const query = useQuery({
    queryKey: ["currentUser"],
    queryFn: authApi.getCurrentUser,
    enabled: !!token && !isAuthenticated && !user && !hasLoggedIn.current, // Only fetch if we have a token but no authenticated user
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Update auth context when user data is fetched (only once)
  useEffect(() => {
    if (query.data && !query.isLoading && !user && !isAuthenticated && !hasLoggedIn.current) {
      // Only login if we don't already have a user and we got fresh data
      const userData = query.data
      if (userData && userData.id) {
        hasLoggedIn.current = true
        login(userData, token)
      }
    }
  }, [query.data, query.isLoading, login, token, user, isAuthenticated])

  return query
}

