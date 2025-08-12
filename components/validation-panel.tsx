"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { AlertCircle, CheckCircle, RefreshCw, AlertTriangle, XCircle } from "lucide-react"
import { runValidations } from "@/lib/validation-engine"
import type { ClientData, WorkerData, TaskData, ValidationError } from "@/types/data"

interface ValidationPanelProps {
  errors: ValidationError[]
  clientsData: ClientData[]
  workersData: WorkerData[]
  tasksData: TaskData[]
  onValidationComplete: (errors: ValidationError[]) => void
}

export function ValidationPanel({
  errors,
  clientsData,
  workersData,
  tasksData,
  onValidationComplete,
}: ValidationPanelProps) {
  const [isValidating, setIsValidating] = useState(false)
  const [lastValidation, setLastValidation] = useState<Date | null>(null)
  const [validationProgress, setValidationProgress] = useState(0)

  const handleValidation = async () => {
    setIsValidating(true)
    setValidationProgress(0)

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setValidationProgress((prev) => Math.min(prev + 10, 90))
      }, 100)

      const validationErrors = await runValidations(clientsData, workersData, tasksData)

      clearInterval(progressInterval)
      setValidationProgress(100)

      onValidationComplete(validationErrors)
      setLastValidation(new Date())
    } catch (error) {
      console.error("Validation failed:", error)
    } finally {
      setTimeout(() => {
        setIsValidating(false)
        setValidationProgress(0)
      }, 500)
    }
  }

  // Auto-validate when data changes
  useEffect(() => {
    if (clientsData.length > 0 || workersData.length > 0 || tasksData.length > 0) {
      handleValidation()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientsData, workersData, tasksData])

  const errorCount = errors.filter((e) => e.type === "error").length
  const warningCount = errors.filter((e) => e.type === "warning").length

  const criticalErrors = errors.filter((e) => e.type === "error")
  const warnings = errors.filter((e) => e.type === "warning")
  const clientErrors = errors.filter((e) => e.entity === "clients")
  const workerErrors = errors.filter((e) => e.entity === "workers")
  const taskErrors = errors.filter((e) => e.entity === "tasks")

  const getValidationScore = () => {
    const totalChecks = 12 // Number of validation categories
    const passedChecks = totalChecks - errorCount
    return Math.max(0, Math.round((passedChecks / totalChecks) * 100))
  }

  return (
    <Card className="h-fit">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {errorCount === 0 && warningCount === 0 ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : errorCount > 0 ? (
                <XCircle className="w-5 h-5 text-red-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              )}
              Validation Report
            </CardTitle>
            <CardDescription>
              {lastValidation ? `Last checked: ${lastValidation.toLocaleTimeString()}` : "Not validated yet"}
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleValidation}
            disabled={isValidating}
            className="flex items-center gap-2 bg-transparent"
          >
            <RefreshCw className={`w-4 h-4 ${isValidating ? "animate-spin" : ""}`} />
            Validate
          </Button>
        </div>

        {isValidating && (
          <div className="space-y-2">
            <Progress value={validationProgress} className="w-full" />
            <p className="text-xs text-muted-foreground">Running comprehensive validation checks...</p>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Validation Summary */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Data Quality Score</span>
            <Badge variant={errorCount === 0 ? "default" : "destructive"}>{getValidationScore()}%</Badge>
          </div>

          <div className="flex gap-2 flex-wrap">
            {errorCount > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <XCircle className="w-3 h-3" />
                {errorCount} Error{errorCount !== 1 ? "s" : ""}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {warningCount} Warning{warningCount !== 1 ? "s" : ""}
              </Badge>
            )}
            {errorCount === 0 && warningCount === 0 && (
              <Badge variant="outline" className="flex items-center gap-1 text-green-600 border-green-200">
                <CheckCircle className="w-3 h-3" />
                All Checks Passed
              </Badge>
            )}
          </div>
        </div>

        {errors.length > 0 ? (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All ({errors.length})</TabsTrigger>
              <TabsTrigger value="clients">Clients ({clientErrors.length})</TabsTrigger>
              <TabsTrigger value="workers">Workers ({workerErrors.length})</TabsTrigger>
              <TabsTrigger value="tasks">Tasks ({taskErrors.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-2 max-h-96 overflow-y-auto">
              {criticalErrors.map((error) => (
                <Alert key={error.id} variant="destructive">
                  <XCircle className="w-4 h-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <div className="font-medium">
                        {error.entity.toUpperCase()}: {error.entityId}
                        {error.field && ` (${error.field})`}
                      </div>
                      <div>{error.message}</div>
                      {error.suggestion && (
                        <div className="text-sm text-muted-foreground mt-1">💡 {error.suggestion}</div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              ))}

              {warnings.map((error) => (
                <Alert key={error.id} className="border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <div className="font-medium">
                        {error.entity.toUpperCase()}: {error.entityId}
                        {error.field && ` (${error.field})`}
                      </div>
                      <div>{error.message}</div>
                      {error.suggestion && (
                        <div className="text-sm text-muted-foreground mt-1">💡 {error.suggestion}</div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </TabsContent>

            <TabsContent value="clients" className="space-y-2 max-h-96 overflow-y-auto">
              {clientErrors.map((error) => (
                <Alert key={error.id} variant={error.type === "error" ? "destructive" : "default"}>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <div className="font-medium">
                        {error.entityId} {error.field && `(${error.field})`}
                      </div>
                      <div>{error.message}</div>
                      {error.suggestion && (
                        <div className="text-sm text-muted-foreground mt-1">💡 {error.suggestion}</div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </TabsContent>

            <TabsContent value="workers" className="space-y-2 max-h-96 overflow-y-auto">
              {workerErrors.map((error) => (
                <Alert key={error.id} variant={error.type === "error" ? "destructive" : "default"}>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <div className="font-medium">
                        {error.entityId} {error.field && `(${error.field})`}
                      </div>
                      <div>{error.message}</div>
                      {error.suggestion && (
                        <div className="text-sm text-muted-foreground mt-1">💡 {error.suggestion}</div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </TabsContent>

            <TabsContent value="tasks" className="space-y-2 max-h-96 overflow-y-auto">
              {taskErrors.map((error) => (
                <Alert key={error.id} variant={error.type === "error" ? "destructive" : "default"}>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <div className="font-medium">
                        {error.entityId} {error.field && `(${error.field})`}
                      </div>
                      <div>{error.message}</div>
                      {error.suggestion && (
                        <div className="text-sm text-muted-foreground mt-1">💡 {error.suggestion}</div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </TabsContent>
          </Tabs>
        ) : (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Excellent! All validation checks passed. Your data is ready for processing.
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Stats */}
        {(clientsData.length > 0 || workersData.length > 0 || tasksData.length > 0) && (
          <div className="pt-4 border-t space-y-2">
            <div className="text-sm font-medium">Data Summary</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="font-medium">{clientsData.length}</div>
                <div className="text-muted-foreground">Clients</div>
              </div>
              <div className="text-center">
                <div className="font-medium">{workersData.length}</div>
                <div className="text-muted-foreground">Workers</div>
              </div>
              <div className="text-center">
                <div className="font-medium">{tasksData.length}</div>
                <div className="text-muted-foreground">Tasks</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
