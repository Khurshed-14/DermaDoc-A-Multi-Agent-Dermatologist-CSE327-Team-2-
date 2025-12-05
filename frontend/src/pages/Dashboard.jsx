import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { 
  Activity, 
  Calendar, 
  ChevronRight, 
  Plus, 
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  User
} from "lucide-react"
import { useAuth } from "../contexts/AuthContext"
import { skinCheckApi } from "../lib/api"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card"
import { cn } from "../lib/utils"
import { ResultDetailsDialog, STATUS_CONFIG } from "../components/ResultDetailsDialog"

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [selectedResult, setSelectedResult] = useState(null)
  
  const { data: results, isLoading } = useQuery({
    queryKey: ["skinCheckResults"],
    queryFn: skinCheckApi.getResults,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  const recentResults = results?.slice(0, 3) || []
  const totalScans = results?.length || 0
  const processedScans = results?.filter(r => r.status === "processed").length || 0
  
  const formatDate = (dateString) => {
    if (!dateString) return ""
    const utcDateStr = dateString.endsWith('Z') || dateString.includes('+') || dateString.match(/-\d{2}:\d{2}$/)
      ? dateString
      : dateString + 'Z'
    
    return new Date(utcDateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="container mx-auto px-6 py-8 max-w-6xl">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Welcome back, {user?.name?.split(" ")[0] || "User"}
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's an overview of your skin health journey.
            </p>
          </div>
          <Button onClick={() => navigate("/skin-check")} className="w-full md:w-auto shadow-sm">
            <Plus className="w-4 h-4 mr-2" />
            New Skin Check
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white shadow-sm border-slate-200 hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Scans
              </CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "..." : totalScans}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Lifetime checks performed
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-sm border-slate-200 hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Processed Results
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "..." : processedScans}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Successfully analyzed images
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-slate-200 hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Latest Check
              </CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">
                {isLoading ? "..." : recentResults[0] ? formatDate(recentResults[0].created_at) : "No scans yet"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {recentResults[0] ? (recentResults[0].body_part || "Unknown area") : "Start your first check"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold tracking-tight">Recent Activity</h2>
              <Button variant="ghost" size="sm" className="text-primary" onClick={() => navigate("/results")}>
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            {isLoading ? (
               <div className="flex items-center justify-center py-12 bg-white rounded-xl border border-slate-200 shadow-sm">
                 <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
               </div>
            ) : recentResults.length > 0 ? (
              <div className="space-y-4">
                {recentResults.map((result) => {
                  const statusConfig = STATUS_CONFIG[result.status] || STATUS_CONFIG.pending
                  const StatusIcon = statusConfig.icon
                  
                  return (
                    <div 
                      key={result.id} 
                      className="group bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-pointer"
                      onClick={() => setSelectedResult(result)}
                    >
                      <div className="flex items-start gap-4">
                        {/* Thumbnail */}
                        <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-100">
                          <img 
                            src={`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/storage/${result.relative_path}`} 
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-medium text-gray-900 truncate capitalize">
                              {result.body_part?.replace(/_/g, " ") || "Unknown Body Part"}
                            </h3>
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {formatDate(result.created_at)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm mb-2">
                            <span className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                              statusConfig.badge
                            )}>
                              <StatusIcon className={cn("w-3 h-3", result.status === "processing" && "animate-spin")} />
                              {statusConfig.label}
                            </span>
                            {result.status === "processed" && result.disease_info && (
                              <span className="text-muted-foreground truncate">
                                • {result.disease_info.name}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary transition-colors self-center" />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-xl border border-slate-200 shadow-sm border-dashed">
                <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900">No activity yet</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  Get started with your first AI-powered skin analysis. It only takes a moment.
                </p>
                <Button onClick={() => navigate("/skin-check")}>
                  Start Skin Check
                </Button>
              </div>
            )}
          </div>

          {/* Quick Actions / Info Column */}
          <div className="space-y-6">
             <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-6 border border-primary/10">
                <h3 className="font-semibold text-primary mb-2">Did you know?</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Regular skin checks are the best way to detect potential issues early. We recommend scanning any concerning spots once a month.
                </p>
                <Button variant="outline" size="sm" className="w-full bg-white hover:bg-primary/5 border-primary/20 text-primary" onClick={() => navigate("/skin-check")}>
                  Check Now
                </Button>
             </div>

             <Card className="shadow-sm border-slate-200">
                <CardHeader>
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="ghost" className="w-full justify-start" onClick={() => navigate("/profile")}>
                    <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mr-3">
                      <User className="w-4 h-4 text-slate-600" />
                    </span>
                    Edit Profile
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" onClick={() => navigate("/results")}>
                    <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mr-3">
                      <Activity className="w-4 h-4 text-slate-600" />
                    </span>
                    View History
                  </Button>
                </CardContent>
             </Card>
          </div>
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

