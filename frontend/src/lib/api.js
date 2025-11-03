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
    // Handle 401 Unauthorized - token is invalid or expired
    if (response.status === 401) {
      // Clear invalid token
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      
      // Dispatch custom event to notify AuthContext
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:logout", { detail: { reason: "unauthorized" } }))
      }
    }
    
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

  updateProfile: async (profileData) => {
    return apiRequest("/api/auth/profile", {
      method: "PUT",
      body: JSON.stringify(profileData),
    })
  },

      changePassword: async (currentPassword, newPassword) => {
        return apiRequest("/api/auth/change-password", {
          method: "POST",
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
          }),
        })
      },

      uploadImage: async (file) => {
        const token = localStorage.getItem("token")
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
        
        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch(`${API_BASE_URL}/api/auth/upload-image`, {
          method: "POST",
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({ detail: response.statusText }))
          throw new Error(error.detail || error.message || `HTTP error! status: ${response.status}`)
        }

        return response.json()
      },

      deleteImage: async () => {
        return apiRequest("/api/auth/delete-image", {
          method: "DELETE",
        })
      },
    }

/**
 * Chatbot API functions
 */
export const chatApi = {
  sendMessage: async (message, conversationHistory = [], onChunk) => {
    const token = localStorage.getItem("token")
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
    
    // Use streaming if onChunk callback is provided
    if (onChunk) {
      return new Promise(async (resolve, reject) => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/chat/chat`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
            body: JSON.stringify({
              message,
              conversation_history: conversationHistory,
            }),
          })

          if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: response.statusText }))
            throw new Error(error.detail || error.message || `HTTP error! status: ${response.status}`)
          }

          const reader = response.body.getReader()
          const decoder = new TextDecoder()
          let buffer = ""
          let fullResponse = ""
          let streamComplete = false

          try {
            while (true) {
              const { done, value } = await reader.read()
              
              if (done) {
                // Stream ended - check if we got completion signal
                if (!streamComplete && buffer.trim()) {
                  // Try to parse any remaining data
                  const lines = buffer.split("\n\n").filter(line => line.trim())
                  for (const line of lines) {
                    if (line.startsWith("data: ")) {
                      try {
                        const data = JSON.parse(line.slice(6))
                        if (data.done) {
                          if (data.full_response) {
                            fullResponse = data.full_response
                          }
                          streamComplete = true
                          break
                        }
                      } catch (e) {
                        console.error("Error parsing final SSE data:", e)
                      }
                    }
                  }
                }
                // If stream ended without completion signal, use what we have
                if (!streamComplete) {
                  console.warn("Stream ended without completion signal, using accumulated response")
                  streamComplete = true
                }
                break
              }

              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split("\n\n")
              buffer = lines.pop() || ""

              for (const line of lines) {
                if (line.trim() && line.startsWith("data: ")) {
                  try {
                    const data = JSON.parse(line.slice(6))
                    if (data.chunk) {
                      fullResponse += data.chunk
                      onChunk(data.chunk, false)
                    }
                    if (data.done) {
                      if (data.full_response) {
                        fullResponse = data.full_response
                      }
                      streamComplete = true
                      onChunk("", true) // Signal completion
                      resolve({
                        response: fullResponse,
                        conversation_history: [
                          ...conversationHistory,
                          { role: "user", content: message },
                          { role: "assistant", content: fullResponse },
                        ],
                      })
                      return
                    }
                    if (data.error) {
                      streamComplete = true
                      onChunk("", true) // Signal completion even on error
                      throw new Error(data.error)
                    }
                  } catch (e) {
                    if (e instanceof Error && e.message.includes("error")) {
                      throw e
                    }
                    console.error("Error parsing SSE data:", e, "Line:", line)
                  }
                }
              }
            }

            // If we exited loop without resolving, resolve with what we have
            if (!streamComplete) {
              onChunk("", true)
              resolve({
                response: fullResponse,
                conversation_history: [
                  ...conversationHistory,
                  { role: "user", content: message },
                  { role: "assistant", content: fullResponse },
                ],
              })
            }
          } finally {
            try {
              reader.releaseLock()
            } catch (e) {
              // Ignore if already released
            }
          }
        } catch (error) {
          reject(error)
        }
      })
    } else {
      // Fallback to non-streaming endpoint
      return apiRequest("/api/chat/chat/sync", {
        method: "POST",
        body: JSON.stringify({
          message,
          conversation_history: conversationHistory,
        }),
      })
    }
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

