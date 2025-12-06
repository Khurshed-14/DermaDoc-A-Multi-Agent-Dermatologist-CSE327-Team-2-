import { BarChart3, TrendingUp } from "lucide-react"
import { cn } from "../lib/utils"

export default function PredictionsCard({ predictions, disease_type, confidence, body_part, created_at }) {
  // Sort predictions by confidence (highest first)
  const sortedPredictions = Object.entries(predictions || {})
    .map(([label, prob]) => ({ label, probability: prob }))
    .sort((a, b) => b.probability - a.probability)

  // Disease label mapping
  const diseaseLabels = {
    "AKIEC": "Actinic Keratoses",
    "BCC": "Basal Cell Carcinoma",
    "BKL": "Benign Keratosis",
    "DF": "Dermatofibroma",
    "MEL": "Melanoma",
    "NV": "Melanocytic Nevi",
    "VASC": "Vascular Lesions",
  }

  const formatLabel = (label) => diseaseLabels[label] || label

  return (
    <div className="bg-muted/50 border border-border rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <BarChart3 className="w-3.5 h-3.5" />
        <span>Skin Analysis Predictions</span>
        {created_at && (
          <span className="ml-auto">
            {new Date(created_at).toLocaleDateString()}
          </span>
        )}
      </div>
      
      {body_part && (
        <div className="text-xs text-muted-foreground mb-2">
          Body Part: <span className="font-medium capitalize">{body_part.replace(/_/g, " ")}</span>
        </div>
      )}

      <div className="space-y-1.5">
        {sortedPredictions.map(({ label, probability }) => {
          const isTopPrediction = label === disease_type
          const percentage = (probability * 100).toFixed(1)
          
          return (
            <div key={label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    "font-medium",
                    isTopPrediction && "text-primary"
                  )}>
                    {formatLabel(label)}
                  </span>
                  {isTopPrediction && (
                    <TrendingUp className="w-3 h-3 text-primary" />
                  )}
                </div>
                <span className={cn(
                  "font-mono",
                  isTopPrediction && "text-primary font-semibold"
                )}>
                  {percentage}%
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    isTopPrediction
                      ? "bg-primary"
                      : "bg-muted-foreground/30"
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {disease_type && confidence && (
        <div className="pt-2 mt-2 border-t border-border text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Top Prediction:</span>
            <span className="font-semibold text-primary">
              {formatLabel(disease_type)} ({(confidence * 100).toFixed(1)}%)
            </span>
          </div>
        </div>
      )}
    </div>
  )
}


