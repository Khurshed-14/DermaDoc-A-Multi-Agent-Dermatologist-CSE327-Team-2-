// API configuration and helper functions for backend integration
// This will be used with TanStack Query when FastAPI backend is connected

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"

// Note: For development, ensure backend is running on http://localhost:8000

/**
 * Make an authenticated API request
 * @param {string} endpoint - API endpoint (e.g., "/api/auth/login")
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<Response>}
 */
export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("token")

  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }))
    // FastAPI uses "detail" for error messages
    throw new Error(error.detail || error.message || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

/**
 * Authentication API functions
 * TODO: Replace with actual FastAPI endpoints when backend is connected
 */
export const authApi = {
  login: async (email, password) => {
    return apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
  },

  signup: async (name, email, password, birthdate, gender) => {
    return apiRequest("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password, birthdate, gender }),
    })
  },

  logout: async () => {
    return apiRequest("/api/auth/logout", { method: "POST" })
  },

  getCurrentUser: async () => {
    return apiRequest("/api/auth/me")
  },
}

/**
 * Example: Skin scan API functions (when backend is ready)
 * Uncomment and implement when FastAPI endpoints are available
 */
// export const scanApi = {
//   uploadScan: async (imageFile, bodyLocation) => {
//     const formData = new FormData()
//     formData.append("image", imageFile)
//     formData.append("body_location", bodyLocation)
//
//     return apiRequest("/api/scans/upload", {
//       method: "POST",
//       body: formData,
//       headers: {
//         Authorization: `Bearer ${localStorage.getItem("token")}`,
//       },
//     })
//   },
//
//   getScanResults: async (scanId) => {
//     return apiRequest(`/api/scans/${scanId}`)
//   },
//
//   getScanHistory: async () => {
//     return apiRequest("/api/scans")
//   },
// }

