import { useEffect } from "react"
import { useLocation } from "react-router-dom"
import Hero from "../components/Hero"
import HowItWorks from "../components/HowItWorks"
import KeyFeatures from "../components/KeyFeatures"

export default function Home() {
  const location = useLocation()

  useEffect(() => {
    // Handle hash navigation when component mounts or hash changes
    if (location.hash) {
      const element = document.querySelector(location.hash)
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth" })
        }, 100)
      }
    }
  }, [location.hash])

  return (
    <>
      <Hero />
      <HowItWorks />
      <KeyFeatures />
    </>
  )
}

