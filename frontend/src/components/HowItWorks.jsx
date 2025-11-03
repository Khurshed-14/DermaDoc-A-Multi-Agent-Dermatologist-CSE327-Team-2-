import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card"
import { Camera, MapPin, Search } from "lucide-react"

export default function HowItWorks() {
  const steps = [
    {
      icon: Camera,
      title: "Upload the Photo",
      description: "Take or upload a clear image",
    },
    {
      icon: MapPin,
      title: "Mark the Area",
      description: "Tap on body diagram to show where it is",
    },
    {
      icon: Search,
      title: "View Results",
      description: "AI analysis and provide conditions + heatmap explainability",
    },
  ]

  return (
    <section id="how-it-works" className="container mx-auto px-6 py-16 scroll-mt-20">
      <h2 className="text-4xl font-bold text-gray-800 text-center mb-12">
        How It Works
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {steps.map((step, index) => {
          const Icon = step.icon
          return (
            <Card key={index} className="border-gray-200">
              <CardHeader>
                <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-xl text-gray-800">{step.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 text-base">
                  {step.description}
                </CardDescription>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}

