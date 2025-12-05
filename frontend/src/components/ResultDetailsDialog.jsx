import { useState } from "react"
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  RefreshCw,
  Activity,
  XCircle,
  X,
  Trash2
} from "lucide-react"
import { Button } from "./ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog"
import { cn } from "../lib/utils"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"

// Severity color mapping
export const SEVERITY_COLORS = {
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
export const STATUS_CONFIG = {
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

export function ResultDetailsDialog({ result, open, onOpenChange, onDelete, isDeleting }) {
  const [isImageFullscreen, setIsImageFullscreen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
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

          {/* Delete Button */}
          {onDelete && (
            <div className="mt-6 pt-6 border-t flex justify-end">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isDeleting ? "Deleting..." : "Delete Result"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      {onDelete && (
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this result?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the skin check 
                result and the associated image from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  onDelete(result.id)
                  setShowDeleteConfirm(false)
                }}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

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

