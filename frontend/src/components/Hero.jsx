import { Button } from "./ui/button"
import { Smartphone } from "lucide-react"

export default function Hero() {
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
            <Button size="lg" className="text-base">
              Start Scan
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-base"
            >
              Chat with DermaBot
            </Button>
          </div>
          <p className="text-sm text-muted-foreground pt-2">
            DermaScan - Empowering early skin health awareness.
          </p>
        </div>

        {/* Right side - Illustration */}
        <div className="flex-1 flex justify-center lg:justify-end">
          <div className="relative w-full max-w-md">
            {/* Placeholder for illustration - can be replaced with SVG/image */}
            <div className="aspect-square bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 rounded-3xl flex items-center justify-center relative overflow-hidden shadow-2xl border border-primary/10">
              {/* Simple illustration representation */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-lg mb-4">
                  <Smartphone className="w-16 h-16 text-primary" />
                </div>
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary/30 animate-pulse"></div>
                  <div className="w-3 h-3 rounded-full bg-primary/40 animate-pulse delay-75"></div>
                  <div className="w-3 h-3 rounded-full bg-primary/50 animate-pulse delay-150"></div>
                </div>
              </div>
              {/* Curved lines representing scan signal */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 320 320">
                <path
                  d="M160,80 Q200,120 240,100 Q280,80 300,140"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-primary/30"
                />
                <path
                  d="M160,100 Q190,140 220,120 Q250,100 280,160"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-primary/40"
                />
                <path
                  d="M160,120 Q180,160 200,140 Q220,120 260,180"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-primary/50"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

