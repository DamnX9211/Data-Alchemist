"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Brain, TrendingUp, AlertTriangle, Lightbulb, Target, RefreshCw } from "lucide-react"
import { AIInsightsEngine, type AIInsight } from "@/lib/ai-engine"
import type { ClientData, WorkerData, TaskData } from "@/types/data"

interface AIInsightsPanelProps {
  clientsData: ClientData[]
  workersData: WorkerData[]
  tasksData: TaskData[]
}

export function AIInsightsPanel({ clientsData, workersData, tasksData }: AIInsightsPanelProps) {
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [lastAnalysis, setLastAnalysis] = useState<Date | null>(null)

  const generateInsights = async () => {
    setIsAnalyzing(true)

    // Simulate AI processing time
    setTimeout(() => {
      const newInsights = AIInsightsEngine.generateInsights(clientsData, workersData, tasksData)
      setInsights(newInsights)
      setLastAnalysis(new Date())
      setIsAnalyzing(false)
    }, 1500)
  }

  useEffect(() => {
    if (clientsData.length > 0 || workersData.length > 0 || tasksData.length > 0) {
      generateInsights()
    }
  }, [clientsData, workersData, tasksData])

  const getInsightIcon = (type: AIInsight["type"]) => {
    switch (type) {
      case "pattern":
        return <TrendingUp className="w-4 h-4" />
      case "anomaly":
        return <AlertTriangle className="w-4 h-4" />
      case "recommendation":
        return <Lightbulb className="w-4 h-4" />
      case "optimization":
        return <Target className="w-4 h-4" />
      default:
        return <Brain className="w-4 h-4" />
    }
  }

  const getImpactColor = (impact: AIInsight["impact"]) => {
    switch (impact) {
      case "high":
        return "destructive"
      case "medium":
        return "default"
      case "low":
        return "secondary"
      default:
        return "outline"
    }
  }

  const patternInsights = insights.filter((i) => i.type === "pattern")
  const anomalyInsights = insights.filter((i) => i.type === "anomaly")
  const recommendationInsights = insights.filter((i) => i.type === "recommendation")
  const optimizationInsights = insights.filter((i) => i.type === "optimization")

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              AI Insights
            </CardTitle>
            <CardDescription>
              {lastAnalysis ? `Last analysis: ${lastAnalysis.toLocaleTimeString()}` : "AI-powered data analysis"}
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={generateInsights}
            disabled={isAnalyzing}
            className="flex items-center gap-2 bg-transparent"
          >
            <RefreshCw className={`w-4 h-4 ${isAnalyzing ? "animate-spin" : ""}`} />
            Analyze
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isAnalyzing ? (
          <Alert>
            <Brain className="w-4 h-4 animate-pulse" />
            <AlertDescription>AI is analyzing your data patterns and generating insights...</AlertDescription>
          </Alert>
        ) : insights.length === 0 ? (
          <Alert>
            <Lightbulb className="w-4 h-4" />
            <AlertDescription>
              Upload data to get AI-powered insights about patterns, anomalies, and optimization opportunities.
            </AlertDescription>
          </Alert>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All ({insights.length})</TabsTrigger>
              <TabsTrigger value="patterns">Patterns ({patternInsights.length})</TabsTrigger>
              <TabsTrigger value="anomalies">Issues ({anomalyInsights.length})</TabsTrigger>
              <TabsTrigger value="recommendations">Tips ({recommendationInsights.length})</TabsTrigger>
              <TabsTrigger value="optimizations">Optimize ({optimizationInsights.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-3 max-h-96 overflow-y-auto">
              {insights.map((insight) => (
                <Alert key={insight.id} className="border-l-4 border-l-blue-500">
                  <div className="flex items-start gap-3">
                    {getInsightIcon(insight.type)}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{insight.title}</h4>
                        <Badge variant={getImpactColor(insight.impact)} className="text-xs">
                          {insight.impact} impact
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">
                          {insight.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{insight.description}</p>
                      {insight.actionable && insight.suggestedAction && (
                        <div className="text-xs bg-blue-50 p-2 rounded border-l-2 border-l-blue-200">
                          <strong>Suggested Action:</strong> {insight.suggestedAction}
                        </div>
                      )}
                    </div>
                  </div>
                </Alert>
              ))}
            </TabsContent>

            <TabsContent value="patterns" className="space-y-3 max-h-96 overflow-y-auto">
              {patternInsights.map((insight) => (
                <Alert key={insight.id} className="border-l-4 border-l-green-500">
                  <TrendingUp className="w-4 h-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="font-medium">{insight.title}</div>
                      <div className="text-sm">{insight.description}</div>
                      {insight.suggestedAction && (
                        <div className="text-xs bg-green-50 p-2 rounded">💡 {insight.suggestedAction}</div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </TabsContent>

            <TabsContent value="anomalies" className="space-y-3 max-h-96 overflow-y-auto">
              {anomalyInsights.map((insight) => (
                <Alert key={insight.id} variant="destructive" className="border-l-4 border-l-red-500">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="font-medium">{insight.title}</div>
                      <div className="text-sm">{insight.description}</div>
                      {insight.suggestedAction && (
                        <div className="text-xs bg-red-50 p-2 rounded">🔧 {insight.suggestedAction}</div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-3 max-h-96 overflow-y-auto">
              {recommendationInsights.map((insight) => (
                <Alert key={insight.id} className="border-l-4 border-l-yellow-500">
                  <Lightbulb className="w-4 h-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="font-medium">{insight.title}</div>
                      <div className="text-sm">{insight.description}</div>
                      {insight.suggestedAction && (
                        <div className="text-xs bg-yellow-50 p-2 rounded">💡 {insight.suggestedAction}</div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </TabsContent>

            <TabsContent value="optimizations" className="space-y-3 max-h-96 overflow-y-auto">
              {optimizationInsights.map((insight) => (
                <Alert key={insight.id} className="border-l-4 border-l-purple-500">
                  <Target className="w-4 h-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="font-medium">{insight.title}</div>
                      <div className="text-sm">{insight.description}</div>
                      {insight.suggestedAction && (
                        <div className="text-xs bg-purple-50 p-2 rounded">🎯 {insight.suggestedAction}</div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}
