import { useNavigate } from "react-router-dom"
import { Button } from "./ui/button"
import { Smartphone } from "lucide-react"
import { useChatbot } from "../contexts/ChatbotContext"
import { useAuth } from "../contexts/AuthContext"
import heroImage from "../assets/hero.png"

export default function Hero() {
  const navigate = useNavigate()
  const { openChatbot } = useChatbot()
  const { isAuthenticated } = useAuth()

  const handleStartScan = () => {
    if (isAuthenticated) {
      navigate("/skin-check")
    } else {
      navigate("/login")
    }
  }

  const handleChatWithDermaDoc = () => {
    if (isAuthenticated) {
      openChatbot()
    } else {
      navigate("/login")
    }
  }

  return (
    <section className="container mx-auto px-6 py-16 lg:py-24">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
        {/* Left side - Text content */}
        <div className="flex-1 max-w-2xl space-y-6">
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight tracking-tight">
              Your Personal AI Skin Health Assistant
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed max-w-xl">
              Upload a photo, locate the area, and let DermaScan help you understand possible skin conditions - safely and instantly.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button size="lg" className="text-base" onClick={handleStartScan}>
              Start Scan
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-base"
              onClick={handleChatWithDermaDoc}
            >
              Chat with DermaDoc
            </Button>
          </div>
          <p className="text-sm text-muted-foreground pt-2">
            DermaScan - Empowering early skin health awareness.
          </p>
        </div>

        {/* Right side - Illustration */}
        <div className="flex-1 flex justify-center lg:justify-end">
          {/* Illustration with pale abstract oval background */}
          <div className="relative w-72 sm:w-80 md:w-[22rem] lg:w-[30rem] aspect-square flex items-center justify-center">
            {/* Large soft oval (mimics reference style) */}
            <div className="absolute -inset-10 sm:-inset-12 rounded-[55%] bg-primary/10 shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.25)]" />
            {/* Subtle inner gradient tint */}
            <div className="absolute inset-0 rounded-[55%] bg-[linear-gradient(140deg,hsl(var(--primary)/0.18),hsl(var(--primary)/0.08)60%,transparent)] mix-blend-normal" />
            <img
              src={heroImage}
              alt="App hero mockup"
              loading="eager"
              className="relative w-56 sm:w-64 md:w-72 lg:w-[26rem] h-auto z-10 select-none pointer-events-none drop-shadow-xl"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

