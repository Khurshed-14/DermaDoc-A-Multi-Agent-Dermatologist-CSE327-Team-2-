import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { 
  AlertTriangle, 
  RefreshCw,
  Activity,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
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
import { ResultDetailsDialog, SEVERITY_COLORS, STATUS_CONFIG } from "../components/ResultDetailsDialog"

export default function Results() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [selectedResult, setSelectedResult] = useState(null)
  const itemsPerPage = 10
  
  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (imageId) => skinCheckApi.deleteImage(imageId),
    onSuccess: () => {
      toast.success("Result deleted successfully")
      setSelectedResult(null)
      queryClient.invalidateQueries({ queryKey: ["skinCheckResults"] })
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete result")
    },
  })

  const handleDelete = (imageId) => {
    deleteMutation.mutate(imageId)
  }
  
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
                        <TableRow 
                          key={result.id} 
                          className="group cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => setSelectedResult(result)}
                        >
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
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedResult(result)
                              }}
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
        onDelete={handleDelete}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  )
}
