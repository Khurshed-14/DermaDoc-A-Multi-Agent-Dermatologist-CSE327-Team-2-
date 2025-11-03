import { Link, useLocation, useNavigate } from "react-router-dom"
import { User, LogOut } from "lucide-react"
import { Button } from "./ui/button"
import { useAuth } from "../contexts/AuthContext"
import { useLogout } from "../hooks/useAuthMutation"
import { cn } from "../lib/utils"

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const logoutMutation = useLogout()

  const isActive = (path) => {
    if (path === "/" && location.pathname === "/") return true
    if (path !== "/" && location.pathname.startsWith(path)) return true
    return false
  }

  const handleHowItWorksClick = (e) => {
    e.preventDefault()
    if (location.pathname !== "/") {
      navigate("/#how-it-works")
    } else {
      document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <nav className="container mx-auto px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-lg">D</span>
          </div>
          <span className="text-gray-900 text-xl font-semibold tracking-tight">DermaScan</span>
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-8">
          <Link
            to="/"
            className={cn(
              "text-sm font-medium transition-colors relative",
              isActive("/")
                ? "text-primary"
                : "text-gray-700 hover:text-primary"
            )}
          >
            Home
            {isActive("/") && (
              <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </Link>
          <a
            href="#how-it-works"
            onClick={handleHowItWorksClick}
            className="text-sm font-medium text-gray-700 hover:text-primary transition-colors"
          >
            How It Works
          </a>
        </div>

        {/* User Profile Section */}
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <Link
                to="/profile"
                className="hidden sm:flex items-center gap-2 text-sm text-gray-700 hover:text-primary transition-colors"
              >
                {user?.image_path ? (
                  <img
                    src={`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/storage/${user.image_path}`}
                    alt={user?.name || "User"}
                    className="w-8 h-8 rounded-full object-cover border border-muted"
                    onError={(e) => {
                      e.target.style.display = "none"
                      e.target.nextSibling.style.display = "block"
                    }}
                  />
                ) : null}
                <User
                  className="w-4 h-4"
                  style={{ display: user?.image_path ? "none" : "block" }}
                />
                <span>
                  Hi, {user?.name || user?.username || "User"}
                </span>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {logoutMutation.isPending ? "Logging out..." : "Logout"}
                </span>
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/signup">Sign Up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
