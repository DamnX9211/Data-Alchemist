"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, Settings, Star, ArrowUp } from "lucide-react"
import type { ClientData, WorkerData, TaskData } from "@/types/data"

interface ExportControlsProps {
  clientsData: ClientData[]
  workersData: WorkerData[]
  tasksData: TaskData[]
}

interface PriorityWeights {
  urgency: number
  complexity: number
  revenue: number
  skills: number
  availability: number
}

interface ExportOptions {
  format: "csv" | "xlsx" | "json"
  includeValidation: boolean
  includeRules: boolean
  onlyValid: boolean
  customFields: string[]
}

export function ExportControls({ clientsData, workersData, tasksData }: ExportControlsProps) {
  const [priorityWeights, setPriorityWeights] = useState<PriorityWeights>({
    urgency: 30,
    complexity: 20,
    revenue: 25,
    skills: 15,
    availability: 10,
  })

  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: "xlsx",
    includeValidation: true,
    includeRules: true,
    onlyValid: false,
    customFields: [],
  })

  const [selectedPreset, setSelectedPreset] = useState<string>("balanced")

  const presets = {
    balanced: { urgency: 30, complexity: 20, revenue: 25, skills: 15, availability: 10 },
    revenue: { urgency: 15, complexity: 10, revenue: 50, skills: 15, availability: 10 },
    speed: { urgency: 50, complexity: 15, revenue: 10, skills: 15, availability: 10 },
    quality: { urgency: 10, complexity: 40, revenue: 15, skills: 25, availability: 10 },
  }

  const calculatePriorityScore = (task: TaskData): number => {
    const urgencyScore = task.Priority === "High" ? 100 : task.Priority === "Medium" ? 60 : 20
    const complexityScore = (task.EstimatedDuration || 0) * 10
    const revenueScore = Number.parseFloat(task.Budget?.replace(/[^0-9.-]+/g, "") || "0") / 100

    let skillsCount = 1
    if (task.RequiredSkills) {
      if (Array.isArray(task.RequiredSkills)) {
        skillsCount = task.RequiredSkills.length
      } else if (typeof task.RequiredSkills === "string" || typeof task.RequiredSkills === "number") {
        skillsCount = String(task.RequiredSkills).split(",").length
      }
    }
    const skillsScore = skillsCount * 20

    const availabilityScore = task.Phase === "Planning" ? 100 : task.Phase === "In Progress" ? 50 : 20

    return (
      (urgencyScore * priorityWeights.urgency) / 100 +
      (complexityScore * priorityWeights.complexity) / 100 +
      (revenueScore * priorityWeights.revenue) / 100 +
      (skillsScore * priorityWeights.skills) / 100 +
      (availabilityScore * priorityWeights.availability) / 100
    )
  }

  const prioritizedTasks = [...tasksData]
    .map((task) => ({ ...task, priorityScore: calculatePriorityScore(task) }))
    .sort((a, b) => b.priorityScore - a.priorityScore)

  const handleExport = async (dataType: "all" | "clients" | "workers" | "tasks") => {
    let exportData: unknown = []
    let filename = ""

    switch (dataType) {
      case "clients":
        exportData = exportOptions.onlyValid ? clientsData.filter((c) => c.Name && c.Email) : clientsData
        filename = "clients"
        break
      case "workers":
        exportData = exportOptions.onlyValid ? workersData.filter((w) => w.Name && w.Skills) : workersData
        filename = "workers"
        break
      case "tasks":
        exportData = exportOptions.onlyValid
          ? prioritizedTasks.filter((t) => t.TaskName && t.TaskID)
          : prioritizedTasks
        filename = "tasks_prioritized"
        break
      case "all":
        exportData = {
          clients: exportOptions.onlyValid ? clientsData.filter((c) => c.Name && c.Email) : clientsData,
          workers: exportOptions.onlyValid ? workersData.filter((w) => w.Name && w.Skills) : workersData,
          tasks: exportOptions.onlyValid
            ? prioritizedTasks.filter((t) => t.TaskName && t.TaskID)
            : prioritizedTasks,
          ...(exportOptions.includeRules && { rules: { priorityWeights, exportOptions } }),
        }
        filename = "data_alchemist_export"
        break
    }

    const dataStr = exportOptions.format === "json" ? JSON.stringify(exportData, null, 2) : convertToCSV(exportData as never[])

    const blob = new Blob([dataStr], {
      type: exportOptions.format === "json" ? "application/json" : "text/csv",
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${filename}.${exportOptions.format}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const convertToCSV = (data: never[]): string => {
    if (!data.length) return ""
    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(","),
      ...data.map((row) => headers.map((header) => `"${row[header] || ""}"`).join(",")),
    ].join("\n")
    return csvContent
  }

  const applyPreset = (presetName: string) => {
    setSelectedPreset(presetName)
    setPriorityWeights(presets[presetName as keyof typeof presets])
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Export & Prioritization
        </CardTitle>
        <CardDescription>Configure priority weights and export your cleaned data with business rules</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="prioritization" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="prioritization">Prioritization</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          <TabsContent value="prioritization" className="space-y-6">
            <div>
              <Label className="text-sm font-medium">Priority Presets</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {Object.entries(presets).map(([name]) => (
                  <Button
                    key={name}
                    variant={selectedPreset === name ? "default" : "outline"}
                    size="sm"
                    onClick={() => applyPreset(name)}
                    className="justify-start"
                  >
                    <Star className="w-3 h-3 mr-1" />
                    {name.charAt(0).toUpperCase() + name.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <Label className="text-sm font-medium">Custom Priority Weights</Label>

              {Object.entries(priorityWeights).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-sm capitalize">{key}</Label>
                    <Badge variant="secondary">{value}%</Badge>
                  </div>
                  <Slider
                    value={[value]}
                    onValueChange={(newValue) => setPriorityWeights((prev) => ({ ...prev, [key]: newValue[0] }))}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
              ))}

              <div className="text-xs text-muted-foreground">
                Total: {Object.values(priorityWeights).reduce((a, b) => a + b, 0)}%
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Top Priority Tasks</Label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {prioritizedTasks.slice(0, 10).map((task, index) => (
                  <div key={task.TaskID} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">#{index + 1}</Badge>
                      <span className="text-sm font-medium">{task.TaskName}</span>
                      <Badge
                        variant={
                          task.Priority === "High"
                            ? "destructive"
                            : task.Priority === "Medium"
                              ? "default"
                              : "secondary"
                        }
                      >
                        {task.Priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Score: {task.priorityScore.toFixed(1)}</span>
                      {index < 3 && <ArrowUp className="w-3 h-3 text-green-500" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="export" className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Export Format</Label>
                <Select
                  value={exportOptions.format}
                  onValueChange={(value: "csv" | "xlsx" | "json") =>
                    setExportOptions((prev) => ({ ...prev, format: value }))
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                    <SelectItem value="csv">CSV (.csv)</SelectItem>
                    <SelectItem value="json">JSON (.json)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Export Options</Label>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeValidation"
                  checked={exportOptions.includeValidation}
                  onCheckedChange={(checked) => setExportOptions((prev) => ({ ...prev, includeValidation: !!checked }))}
                />
                <Label htmlFor="includeValidation" className="text-sm">
                  Include validation results
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeRules"
                  checked={exportOptions.includeRules}
                  onCheckedChange={(checked) => setExportOptions((prev) => ({ ...prev, includeRules: !!checked }))}
                />
                <Label htmlFor="includeRules" className="text-sm">
                  Include business rules configuration
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="onlyValid"
                  checked={exportOptions.onlyValid}
                  onCheckedChange={(checked) => setExportOptions((prev) => ({ ...prev, onlyValid: !!checked }))}
                />
                <Label htmlFor="onlyValid" className="text-sm">
                  Export only validated records
                </Label>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <Button onClick={() => handleExport("clients")} variant="outline" className="justify-start">
                <Download className="w-4 h-4 mr-2" />
                Export Clients ({clientsData.length})
              </Button>

              <Button onClick={() => handleExport("workers")} variant="outline" className="justify-start">
                <Download className="w-4 h-4 mr-2" />
                Export Workers ({workersData.length})
              </Button>

              <Button onClick={() => handleExport("tasks")} variant="outline" className="justify-start">
                <Download className="w-4 h-4 mr-2" />
                Export Tasks ({tasksData.length})
              </Button>

              <Button onClick={() => handleExport("all")} className="justify-start">
                <Download className="w-4 h-4 mr-2" />
                Export All Data
              </Button>
            </div>

            <div className="text-xs text-muted-foreground p-3 bg-muted rounded">
              <div className="font-medium mb-1">Export Summary:</div>
              <div>• Format: {exportOptions.format.toUpperCase()}</div>
              <div>• Records: {exportOptions.onlyValid ? "Valid only" : "All records"}</div>
              <div>
                • Includes:{" "}
                {[
                  exportOptions.includeValidation && "Validation",
                  exportOptions.includeRules && "Rules",
                  "Priority scores",
                ]
                  .filter(Boolean)
                  .join(", ")}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
