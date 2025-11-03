import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card"
import { Sparkles, Target, MessageCircle, Lock } from "lucide-react"

export default function KeyFeatures() {
  const features = [
    {
      icon: Sparkles,
      title: "AI-Powered Skin Detection",
      description: "Trained on dermatology datasets",
    },
    {
      icon: Target,
      title: "Explainable Heatmap",
      description: "See what areas the model focuses on",
    },
    {
      icon: MessageCircle,
      title: "AI Chatbot Assistance",
      description: "Get guidance on what your results mean",
    },
    {
      icon: Lock,
      title: "Data Privacy First",
      description: "Your images stay secure and private",
    },
  ]

  return (
    <section className="container mx-auto px-6 py-16 bg-gray-50">
      <h2 className="text-4xl font-bold text-gray-800 text-center mb-12">
        Key Features
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, index) => {
          const Icon = feature.icon
          return (
            <Card key={index} className="border-gray-200 bg-white">
              <CardHeader>
                <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-xl text-gray-800">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}

