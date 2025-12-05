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
  X,
  ChevronLeft,
  ChevronRight,
  Eye
} from "lucide-react"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table"
import { useAuth } from "../contexts/AuthContext"
import { skinCheckApi } from "../lib/api"
import { cn } from "../lib/utils"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"

// Severity color mapping
const SEVERITY_COLORS = {
  "benign": {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    badge: "bg-emerald-100 text-emerald-800",
    icon: CheckCircle2,
  },
  "pre-cancerous": {
    bg: "bg-amber-50",
    text: "text-amber-700",
    badge: "bg-amber-100 text-amber-800",
    icon: AlertTriangle,
  },
  "cancer": {
    bg: "bg-orange-50",
    text: "text-orange-700",
    badge: "bg-orange-100 text-orange-800",
    icon: AlertTriangle,
  },
  "serious-cancer": {
    bg: "bg-red-50",
    text: "text-red-700",
    badge: "bg-red-100 text-red-800",
    icon: AlertTriangle,
  },
}

// Status colors and icons
const STATUS_CONFIG = {
  "pending": {
    badge: "bg-slate-100 text-slate-700",
    icon: Clock,
    label: "Pending",
  },
  "processing": {
    badge: "bg-blue-100 text-blue-700",
    icon: RefreshCw,
    label: "Processing",
  },
  "processed": {
    badge: "bg-emerald-100 text-emerald-700",
    icon: CheckCircle2,
    label: "Complete",
  },
  "failed": {
    badge: "bg-red-100 text-red-700",
    icon: XCircle,
    label: "Failed",
  },
}

function ResultDetailsDialog({ result, open, onOpenChange }) {
  const [isImageFullscreen, setIsImageFullscreen] = useState(false)
  
  if (!result) return null

  const statusConfig = STATUS_CONFIG[result.status] || STATUS_CONFIG.pending
  const StatusIcon = statusConfig.icon
  
  const severityConfig = result.disease_info 
    ? SEVERITY_COLORS[result.disease_info.severity] || SEVERITY_COLORS.benign
    : null
  const SeverityIcon = severityConfig?.icon
  
  const isProcessed = result.status === "processed"
  const isProcessing = result.status === "processing"
  const isFailed = result.status === "failed"

  // Date formatting helper
  const formatDate = (dateString) => {
    if (!dateString) return ""
    const utcDateStr = dateString.endsWith('Z') || dateString.includes('+') || dateString.match(/-\d{2}:\d{2}$/)
      ? dateString
      : dateString + 'Z'
    
    return new Date(utcDateStr).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <span className={cn(
                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium",
                statusConfig.badge
              )}>
                <StatusIcon className={cn("w-3 h-3", isProcessing && "animate-spin")} />
                {statusConfig.label}
              </span>
              
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
            <DialogTitle className="text-2xl">
              {isProcessed && result.disease_info 
                ? result.disease_info.name 
                : "Analysis Details"}
            </DialogTitle>
            <DialogDescription>
              Uploaded on {formatDate(result.created_at)} • {result.body_part ? result.body_part.replace(/_/g, " ") : "Unknown body part"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-6 mt-4">
            {/* Image Column */}
            <div>
              <div className="relative group">
                <img
                  src={`${API_BASE_URL}/api/storage/${result.relative_path}`}
                  alt="Skin check"
                  className="w-full h-64 object-cover rounded-lg shadow-sm cursor-pointer transition-opacity hover:opacity-95"
                  onClick={() => setIsImageFullscreen(true)}
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="bg-black/50 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    View Fullscreen
                  </div>
                </div>
              </div>
            </div>

            {/* Details Column */}
            <div className="space-y-6">
              {isProcessed && result.confidence !== null && (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-sm text-muted-foreground mb-1">Confidence Score</div>
                  <div className="text-3xl font-bold text-slate-900">
                    {(result.confidence * 100).toFixed(1)}%
                  </div>
                </div>
              )}

              {isProcessed && result.disease_info && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Recommendation
                  </h4>
                  <div className={cn(
                    "p-3 rounded-lg text-sm",
                    severityConfig.bg,
                    severityConfig.text
                  )}>
                    {result.disease_info.recommendation}
                  </div>
                </div>
              )}

              {isProcessed && result.disease_info && (
                <div>
                  <h4 className="font-semibold mb-2">About this condition</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {result.disease_info.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Predictions Breakdown */}
          {isProcessed && result.predictions && (
            <div className="mt-6 pt-6 border-t">
              <h4 className="font-semibold mb-4">Detailed Analysis Breakdown</h4>
              <div className="space-y-3">
                {Object.entries(result.predictions)
                  .sort(([, a], [, b]) => b - a)
                  .map(([label, probability]) => (
                    <div key={label} className="flex items-center gap-3">
                      <div className="w-24 text-sm font-medium text-muted-foreground">
                        {label}
                      </div>
                      <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            label === result.disease_type ? "bg-primary" : "bg-slate-300"
                          )}
                          style={{ width: `${probability * 100}%` }}
                        />
                      </div>
                      <div className="w-16 text-sm text-right font-medium text-slate-600">
                        {(probability * 100).toFixed(1)}%
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
          
          {isFailed && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg">
              <p className="font-medium">Analysis Failed</p>
              <p className="text-sm mt-1">There was an error processing your image. Please try uploading again.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
    </>
  )
}

export default function Results() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [selectedResult, setSelectedResult] = useState(null)
  const itemsPerPage = 10
  
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
      const data = query.state.data
      if (!data || !Array.isArray(data)) return false
      const hasProcessing = data.some(r => r.status === "processing" || r.status === "pending")
      return hasProcessing ? 3000 : false
    },
  })

  // Pagination logic
  const totalPages = results ? Math.ceil(results.length / itemsPerPage) : 0
  const paginatedResults = results 
    ? results.slice((page - 1) * itemsPerPage, page * itemsPerPage)
    : []

  const formatDate = (dateString) => {
    if (!dateString) return ""
    const utcDateStr = dateString.endsWith('Z') || dateString.includes('+') || dateString.match(/-\d{2}:\d{2}$/)
      ? dateString
      : dateString + 'Z'
    
    return new Date(utcDateStr).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }
  
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
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Your Results</h1>
            <p className="text-muted-foreground mt-1">
              Review your skin analysis history
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
        
        {/* Results Table */}
        <Card>
          <CardContent className="p-0">
            {results && results.length > 0 ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Body Part</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Finding</TableHead>
                      <TableHead className="text-right">Confidence</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedResults.map((result) => {
                      const statusConfig = STATUS_CONFIG[result.status] || STATUS_CONFIG.pending
                      const severityConfig = result.disease_info 
                        ? SEVERITY_COLORS[result.disease_info.severity]
                        : null
                        
                      return (
                        <TableRow key={result.id} className="group">
                          <TableCell className="font-medium whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              {formatDate(result.created_at)}
                            </div>
                          </TableCell>
                          <TableCell className="capitalize">
                            {result.body_part?.replace(/_/g, " ") || "—"}
                          </TableCell>
                          <TableCell>
                            <span className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium w-fit",
                              statusConfig.badge
                            )}>
                              <statusConfig.icon className={cn("w-3.5 h-3.5", result.status === "processing" && "animate-spin")} />
                              {statusConfig.label}
                            </span>
                          </TableCell>
                          <TableCell>
                            {result.status === "processed" && result.disease_info ? (
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{result.disease_info.name}</span>
                                {severityConfig && (
                                  <span className={cn(
                                    "hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide",
                                    severityConfig.badge
                                  )}>
                                    {result.disease_info.severity.replace("-", " ")}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic">
                                {result.status === "failed" ? "Analysis failed" : "Pending analysis..."}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {result.status === "processed" && result.confidence !== null ? (
                              <span className="font-mono font-medium">
                                {(result.confidence * 100).toFixed(1)}%
                              </span>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setSelectedResult(result)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">No Results Yet</h3>
                <p className="text-muted-foreground mt-1 mb-4">
                  Start by uploading an image for analysis
                </p>
                <Button onClick={() => navigate("/skin-check")}>
                  Start Skin Check
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Disclaimer */}
        <div className="mt-8 p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800 flex gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
          <p>
            <strong>Important Disclaimer:</strong> This AI-powered analysis is for informational purposes only and is not a substitute 
            for professional medical advice, diagnosis, or treatment. Always consult a qualified 
            healthcare provider for proper evaluation of any skin conditions.
          </p>
        </div>
      </div>

      <ResultDetailsDialog 
        result={selectedResult} 
        open={!!selectedResult} 
        onOpenChange={(open) => !open && setSelectedResult(null)} 
      />
    </div>
  )
}
