import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  RefreshCw,
  Activity,
  Calendar,
  MapPin,
  XCircle,
  X
} from "lucide-react"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Dialog, DialogContent } from "../components/ui/dialog"
import { useAuth } from "../contexts/AuthContext"
import { skinCheckApi } from "../lib/api"
import { cn } from "../lib/utils"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"

// Severity color mapping
const SEVERITY_COLORS = {
  "benign": {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    badge: "bg-emerald-100 text-emerald-800",
    icon: CheckCircle2,
  },
  "pre-cancerous": {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    badge: "bg-amber-100 text-amber-800",
    icon: AlertTriangle,
  },
  "cancer": {
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-700",
    badge: "bg-orange-100 text-orange-800",
    icon: AlertTriangle,
  },
  "serious-cancer": {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    badge: "bg-red-100 text-red-800",
    icon: AlertTriangle,
  },
}

// Status colors and icons
const STATUS_CONFIG = {
  "pending": {
    bg: "bg-slate-50",
    border: "border-slate-200",
    text: "text-slate-600",
    badge: "bg-slate-100 text-slate-700",
    icon: Clock,
    label: "Pending",
  },
  "processing": {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-600",
    badge: "bg-blue-100 text-blue-700",
    icon: RefreshCw,
    label: "Processing",
  },
  "processed": {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-600",
    badge: "bg-emerald-100 text-emerald-700",
    icon: CheckCircle2,
    label: "Complete",
  },
  "failed": {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-600",
    badge: "bg-red-100 text-red-700",
    icon: XCircle,
    label: "Failed",
  },
}

function ResultCard({ result }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isImageFullscreen, setIsImageFullscreen] = useState(false)
  
  const statusConfig = STATUS_CONFIG[result.status] || STATUS_CONFIG.pending
  const StatusIcon = statusConfig.icon
  
  const severityConfig = result.disease_info 
    ? SEVERITY_COLORS[result.disease_info.severity] || SEVERITY_COLORS.benign
    : null
  const SeverityIcon = severityConfig?.icon
  
  const isProcessing = result.status === "processing"
  const isProcessed = result.status === "processed"
  const isFailed = result.status === "failed"
  
  // Format date in local timezone (converting from UTC)
  // Backend sends UTC times, but may not include 'Z' suffix, so we ensure it's treated as UTC
  const dateStr = result.created_at
  // If date doesn't have timezone indicator, append 'Z' to indicate UTC
  const utcDateStr = dateStr.endsWith('Z') || dateStr.includes('+') || dateStr.match(/-\d{2}:\d{2}$/)
    ? dateStr
    : dateStr + 'Z'
  
  const dateObj = new Date(utcDateStr)
  
  const formattedDate = dateObj.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
  
  const bodyPartLabel = result.body_part 
    ? result.body_part.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
    : "Not specified"

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-md",
      isProcessed && severityConfig ? `${severityConfig.bg} ${severityConfig.border}` : `${statusConfig.bg} ${statusConfig.border}`
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {/* Status Badge */}
              <span className={cn(
                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium",
                statusConfig.badge
              )}>
                <StatusIcon className={cn("w-3 h-3", isProcessing && "animate-spin")} />
                {statusConfig.label}
              </span>
              
              {/* Severity Badge (only for processed) */}
              {isProcessed && result.disease_info && (
                <span className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
                  severityConfig.badge
                )}>
                  <SeverityIcon className="w-3 h-3" />
                  {result.disease_info.severity.replace("-", " ")}
                </span>
              )}
            </div>
            
            <CardTitle className="text-lg">
              {isProcessed && result.disease_info 
                ? result.disease_info.name 
                : isProcessing 
                  ? "Analysis in Progress..." 
                  : isFailed
                    ? "Analysis Failed"
                    : "Awaiting Analysis"}
            </CardTitle>
            
            <CardDescription className="flex items-center gap-4 mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formattedDate}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {bodyPartLabel}
              </span>
            </CardDescription>
          </div>
          
          {/* Confidence Score */}
          {isProcessed && result.confidence !== null && (
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {(result.confidence * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">confidence</div>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Image Preview */}
        <div className="mb-4">
          <img
            src={`${API_BASE_URL}/api/storage/${result.relative_path}`}
            alt="Skin check"
            className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setIsImageFullscreen(true)}
          />
        </div>
        
        {/* Fullscreen Image Dialog */}
        <Dialog open={isImageFullscreen} onOpenChange={setIsImageFullscreen}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
            <div className="relative w-full h-full flex items-center justify-center">
              <button
                onClick={() => setIsImageFullscreen(false)}
                className="absolute top-4 right-4 z-50 rounded-full bg-black/50 hover:bg-black/70 p-2 text-white transition-colors"
                aria-label="Close fullscreen"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={`${API_BASE_URL}/api/storage/${result.relative_path}`}
                alt="Skin check - Fullscreen"
                className="max-w-full max-h-[95vh] object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Recommendation (for processed results) */}
        {isProcessed && result.disease_info && (
          <div className={cn(
            "p-3 rounded-lg mb-3",
            severityConfig.bg
          )}>
            <p className={cn("text-sm font-medium", severityConfig.text)}>
              {result.disease_info.recommendation}
            </p>
          </div>
        )}
        
        {/* Processing message */}
        {isProcessing && (
          <div className="p-3 rounded-lg bg-blue-50 mb-3">
            <p className="text-sm text-blue-700 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Your image is being analyzed. This may take a few moments...
            </p>
          </div>
        )}
        
        {/* Failed message */}
        {isFailed && (
          <div className="p-3 rounded-lg bg-red-50 mb-3">
            <p className="text-sm text-red-700">
              There was an error processing your image. Please try uploading again.
            </p>
          </div>
        )}
        
        {/* Expandable Details */}
        {isProcessed && result.predictions && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <span className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                View All Predictions
              </span>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            
            {isExpanded && (
              <div className="mt-3 space-y-2">
                {Object.entries(result.predictions)
                  .sort(([, a], [, b]) => b - a)
                  .map(([label, probability]) => (
                    <div key={label} className="flex items-center gap-2">
                      <div className="w-16 text-xs font-medium text-muted-foreground">
                        {label}
                      </div>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            label === result.disease_type ? "bg-primary" : "bg-muted-foreground/30"
                          )}
                          style={{ width: `${probability * 100}%` }}
                        />
                      </div>
                      <div className="w-14 text-xs text-right text-muted-foreground">
                        {(probability * 100).toFixed(1)}%
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </>
        )}
        
        {/* Description (for processed results) */}
        {isProcessed && result.disease_info && isExpanded && (
          <div className="mt-4 p-3 rounded-lg bg-muted/50">
            <h4 className="text-sm font-medium mb-1">About this condition</h4>
            <p className="text-sm text-muted-foreground">
              {result.disease_info.description}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function Results() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  
  const { 
    data: results, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ["skinCheckResults"],
    queryFn: skinCheckApi.getResults,
    enabled: isAuthenticated,
    refetchInterval: (query) => {
      // Auto-refresh if any results are still processing
      const data = query.state.data
      if (!data || !Array.isArray(data)) return false
      const hasProcessing = data.some(r => r.status === "processing" || r.status === "pending")
      return hasProcessing ? 3000 : false
    },
  })
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to view your results.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your results...</p>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Results</CardTitle>
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Your Results</h1>
              <p className="text-muted-foreground mt-1">
                View your skin check analysis history
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button size="sm" onClick={() => navigate("/skin-check")}>
                New Check
              </Button>
            </div>
          </div>
        </div>
        
        {/* Results Grid */}
        {results && results.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {results.map((result) => (
              <ResultCard key={result.id} result={result} />
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <Activity className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-medium">No Results Yet</h3>
                  <p className="text-muted-foreground mt-1">
                    Start by uploading an image for analysis
                  </p>
                </div>
                <Button onClick={() => navigate("/skin-check")}>
                  Start Skin Check
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Disclaimer */}
        <div className="mt-8 p-4 rounded-lg bg-amber-50 border border-amber-200">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-amber-800">Important Disclaimer</h4>
              <p className="text-sm text-amber-700 mt-1">
                This AI-powered analysis is for informational purposes only and is not a substitute 
                for professional medical advice, diagnosis, or treatment. Always consult a qualified 
                healthcare provider for proper evaluation of any skin conditions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

