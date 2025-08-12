/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useCallback, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Search, Edit3, Save, X, Plus, Trash2, Wand2, Lightbulb, CheckCircle } from "lucide-react"
import { NaturalLanguageSearchEngine, AIDataCorrectionEngine, type AICorrection } from "@/lib/ai-engine"
import type { ClientData, WorkerData, TaskData } from "@/types/data"

interface DataGridProps {
  data: ClientData[] | WorkerData[] | TaskData[]
  type: "clients" | "workers" | "tasks"
  onDataChange: (data: ClientData[] | WorkerData[] | TaskData[]) => void
}

export function DataGrid({ data, type, onDataChange }: DataGridProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [isNaturalLanguageSearch, setIsNaturalLanguageSearch] = useState(false)
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; field: string } | null>(null)
  const [editValue, setEditValue] = useState("")
  const [aiCorrections, setAiCorrections] = useState<AICorrection[]>([])
  const [showCorrections, setShowCorrections] = useState(false)

  const filteredData = useMemo(() => {
    if (!searchTerm) return data

    if (isNaturalLanguageSearch) {
      if (type === "clients") {
        return NaturalLanguageSearchEngine.searchData<ClientData>(data as ClientData[], searchTerm, type)
      } else if (type === "workers") {
        return NaturalLanguageSearchEngine.searchData<WorkerData>(data as WorkerData[], searchTerm, type)
      } else if (type === "tasks") {
        return NaturalLanguageSearchEngine.searchData<TaskData>(data as TaskData[], searchTerm, type)
      }
    }

    return data.filter((item) => {
      const searchableText = Object.values(item)
        .map((value) => {
          if (Array.isArray(value)) return value.join(" ")
          if (typeof value === "object") return JSON.stringify(value)
          return String(value)
        })
        .join(" ")
        .toLowerCase()

      return searchableText.includes(searchTerm.toLowerCase())
    })
  }, [data, searchTerm, isNaturalLanguageSearch, type])

  const analyzeDataWithAI = useCallback(() => {
    let corrections: AICorrection[] = []
    if (type === "clients") {
      corrections = AIDataCorrectionEngine.analyzeData<ClientData>(data as ClientData[], type)
    } else if (type === "workers") {
      corrections = AIDataCorrectionEngine.analyzeData<WorkerData>(data as WorkerData[], type)
    } else if (type === "tasks") {
      corrections = AIDataCorrectionEngine.analyzeData<TaskData>(data as TaskData[], type)
    }
    setAiCorrections(corrections)
    setShowCorrections(true)
  }, [data, type])

  const applyCorrection = useCallback(
    (correction: AICorrection) => {
      const newData = [...data]
      const itemIndex = newData.findIndex((item: any) => {
        const idField = type === "clients" ? "ClientID" : type === "workers" ? "WorkerID" : "TaskID"
        return item[idField] === correction.entityId
      })

      if (itemIndex !== -1) {
        newData[itemIndex] = { ...newData[itemIndex], [correction.field]: correction.suggestedValue }
        if (type === "clients") {
          onDataChange(newData as ClientData[])
        } else if (type === "workers") {
          onDataChange(newData as WorkerData[])
        } else if (type === "tasks") {
          onDataChange(newData as TaskData[])
        }
        setAiCorrections((prev) => prev.filter((c) => c.id !== correction.id))
      }
    },
    [data, type, onDataChange],
  )

  const handleCellEdit = useCallback((rowIndex: number, field: string, currentValue: any) => {
    setEditingCell({ rowIndex, field })

    // Convert value to string for editing
    if (Array.isArray(currentValue)) {
      setEditValue(currentValue.join(", "))
    } else if (typeof currentValue === "object") {
      setEditValue(JSON.stringify(currentValue))
    } else {
      setEditValue(String(currentValue))
    }
  }, [])

  const handleSaveEdit = useCallback(() => {
    if (!editingCell) return

    const newData = [...data]
    const { rowIndex, field } = editingCell

    // Find the actual row index in the original data
    const actualRowIndex = data.findIndex((item, index) => filteredData[rowIndex] === item)

    if (actualRowIndex === -1) return

    let processedValue: any = editValue

    // Process the value based on field type
    if (field === "RequestedTaskIDs" || field === "Skills" || field === "RequiredSkills") {
      processedValue = editValue
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v)
    } else if (field === "AvailableSlots" || field === "PreferredPhases") {
      processedValue = editValue
        .split(",")
        .map((v) => Number.parseInt(v.trim()))
        .filter((v) => !isNaN(v))
    } else if (field === "AttributesJSON") {
      try {
        processedValue = JSON.parse(editValue)
      } catch {
        processedValue = { value: editValue }
      }
    } else if (
      field === "PriorityLevel" ||
      field === "MaxLoadPerPhase" ||
      field === "QualificationLevel" ||
      field === "Duration" ||
      field === "MaxConcurrent"
    ) {
      processedValue = Number.parseInt(editValue) || 0
    }

    newData[actualRowIndex] = { ...newData[actualRowIndex], [field]: processedValue }
    onDataChange(newData as ClientData[] | WorkerData[] | TaskData[])
    setEditingCell(null)
    setEditValue("")
  }, [editingCell, editValue, data, filteredData, onDataChange])

  const handleCancelEdit = useCallback(() => {
    setEditingCell(null)
    setEditValue("")
  }, [])

  const handleAddRow = useCallback(() => {
    const newData = [...data]
    let newRow: any

    switch (type) {
      case "clients":
        newRow = {
          ClientID: `CLIENT_${data.length + 1}`,
          ClientName: `New Client ${data.length + 1}`,
          PriorityLevel: 1,
          RequestedTaskIDs: [],
          GroupTag: "default",
          AttributesJSON: {},
        }
        break
      case "workers":
        newRow = {
          WorkerID: `WORKER_${data.length + 1}`,
          WorkerName: `New Worker ${data.length + 1}`,
          Skills: [],
          AvailableSlots: [],
          MaxLoadPerPhase: 1,
          WorkerGroup: "default",
          QualificationLevel: 1,
        }
        break
      case "tasks":
        newRow = {
          TaskID: `TASK_${data.length + 1}`,
          TaskName: `New Task ${data.length + 1}`,
          Category: "general",
          Duration: 1,
          RequiredSkills: [],
          PreferredPhases: [],
          MaxConcurrent: 1,
        }
        break
    }

    newData.push(newRow)
    onDataChange(newData  as ClientData[] | WorkerData[] | TaskData[])
  }, [data, type, onDataChange])

  const handleDeleteRow = useCallback(
    (rowIndex: number) => {
      const actualRowIndex = data.findIndex((item) => filteredData[rowIndex] === item)
      if (actualRowIndex === -1) return

      const newData = data.filter((_, index) => index !== actualRowIndex)
      onDataChange(newData  as ClientData[] | WorkerData[] | TaskData[])
    },
    [data, filteredData, onDataChange],
  )

  const renderCellValue = (value: any, rowIndex: number, field: string) => {
    const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.field === field

    if (isEditing) {
      return (
        <div className="flex items-center gap-2">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="min-w-32"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveEdit()
              if (e.key === "Escape") handleCancelEdit()
            }}
            autoFocus
          />
          <Button size="sm" variant="ghost" onClick={handleSaveEdit}>
            <Save className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      )
    }

    return (
      <div
        className="cursor-pointer hover:bg-gray-50 p-1 rounded min-h-8 flex items-center"
        onClick={() => handleCellEdit(rowIndex, field, value)}
      >
        {Array.isArray(value) ? (
          <div className="flex flex-wrap gap-1">
            {value.map((item, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {item}
              </Badge>
            ))}
          </div>
        ) : typeof value === "object" ? (
          <Badge variant="outline" className="text-xs">
            JSON: {Object.keys(value).length} keys
          </Badge>
        ) : (
          <span className="text-sm">{String(value)}</span>
        )}
        <Edit3 className="w-3 h-3 ml-2 opacity-0 group-hover:opacity-100" />
      </div>
    )
  }

  const getColumns = () => {
    switch (type) {
      case "clients":
        return [
          { key: "ClientID", label: "Client ID" },
          { key: "ClientName", label: "Client Name" },
          { key: "PriorityLevel", label: "Priority" },
          { key: "RequestedTaskIDs", label: "Requested Tasks" },
          { key: "GroupTag", label: "Group" },
          { key: "AttributesJSON", label: "Attributes" },
        ]
      case "workers":
        return [
          { key: "WorkerID", label: "Worker ID" },
          { key: "WorkerName", label: "Worker Name" },
          { key: "Skills", label: "Skills" },
          { key: "AvailableSlots", label: "Available Slots" },
          { key: "MaxLoadPerPhase", label: "Max Load" },
          { key: "WorkerGroup", label: "Group" },
          { key: "QualificationLevel", label: "Qualification" },
        ]
      case "tasks":
        return [
          { key: "TaskID", label: "Task ID" },
          { key: "TaskName", label: "Task Name" },
          { key: "Category", label: "Category" },
          { key: "Duration", label: "Duration" },
          { key: "RequiredSkills", label: "Required Skills" },
          { key: "PreferredPhases", label: "Preferred Phases" },
          { key: "MaxConcurrent", label: "Max Concurrent" },
        ]
      default:
        return []
    }
  }

  const columns = getColumns()

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="capitalize">{type} Data</CardTitle>
              <CardDescription>
                {filteredData.length} of {data.length} records
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={analyzeDataWithAI} variant="outline" className="flex items-center gap-2 bg-transparent">
                <Wand2 className="w-4 h-4" />
                AI Analysis
              </Button>
              <Button onClick={handleAddRow} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Row
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                placeholder={
                  isNaturalLanguageSearch
                    ? "Try: 'workers with JavaScript skills' or 'tasks with duration &gt; 3'"
                    : "Search data..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <Button
                variant={isNaturalLanguageSearch ? "default" : "outline"}
                size="sm"
                onClick={() => setIsNaturalLanguageSearch(!isNaturalLanguageSearch)}
                className="flex items-center gap-2"
              >
                <Wand2 className="w-4 h-4" />
                {isNaturalLanguageSearch ? "Natural" : "Basic"}
              </Button>
            </div>

            {isNaturalLanguageSearch && (
              <Alert>
                <Lightbulb className="w-4 h-4" />
                <AlertDescription>
                  <div className="text-sm">
                    <strong>Natural Language Search Examples:</strong>
                    <ul className="mt-1 space-y-1">
                      <li>• &quot;workers with JavaScript skills&ldquo;</li>
                      <li>• &quot;tasks with duration &gt; 3&ldquo;</li>
                      <li>• &quot;clients sorted by priority level&ldquo;</li>
                      <li>• &quot;first 5 workers with qualification level &gt;= 4&ldquo;</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {showCorrections && aiCorrections.length > 0 && (
            <div className="mb-4">
              <Tabs defaultValue="corrections">
                <TabsList>
                  <TabsTrigger value="corrections">AI Suggestions ({aiCorrections.length})</TabsTrigger>
                  <TabsTrigger value="data">Data View</TabsTrigger>
                </TabsList>

                <TabsContent value="corrections" className="space-y-2 max-h-64 overflow-y-auto">
                  {aiCorrections.map((correction) => (
                    <Alert key={correction.id} className="border-blue-200 bg-blue-50">
                      <Wand2 className="w-4 h-4 text-blue-600" />
                      <AlertDescription>
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="font-medium text-blue-800">
                              {correction.entityId} - {correction.field}
                            </div>
                            <div className="text-sm">{correction.reason}</div>
                            <div className="text-xs text-muted-foreground">
                              Current: <code>{JSON.stringify(correction.currentValue)}</code> → Suggested:{" "}
                              <code>{JSON.stringify(correction.suggestedValue)}</code>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {Math.round(correction.confidence * 100)}% confidence
                            </Badge>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              onClick={() => applyCorrection(correction)}
                              className="flex items-center gap-1"
                            >
                              <CheckCircle className="w-3 h-3" />
                              Apply
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setAiCorrections((prev) => prev.filter((c) => c.id !== correction.id))}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </TabsContent>

                <TabsContent value="data">
                  {/* Data table content moved here */}
                  {filteredData.length === 0 ? (
                    <Alert>
                      <AlertDescription>
                        {data.length === 0 ? "No data uploaded yet." : "No records match your search."}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b">
                            {columns.map((column) => (
                              <th key={column.key} className="text-left p-2 font-medium text-sm">
                                {column.label}
                              </th>
                            ))}
                            <th className="text-left p-2 font-medium text-sm w-16">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredData.map((row, rowIndex) => (
                            <tr key={rowIndex} className="border-b hover:bg-gray-50 group">
                              {columns.map((column) => (
                                <td key={column.key} className="p-2 max-w-48">
                                  {renderCellValue((row as any)[column.key], rowIndex, column.key)}
                                </td>
                              ))}
                              <td className="p-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteRow(rowIndex)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}

          {!showCorrections && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    {columns.map((column) => (
                      <th key={column.key} className="text-left p-2 font-medium text-sm">
                        {column.label}
                      </th>
                    ))}
                    <th className="text-left p-2 font-medium text-sm w-16">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b hover:bg-gray-50 group">
                      {columns.map((column) => (
                        <td key={column.key} className="p-2 max-w-48">
                          {renderCellValue((row as any)[column.key], rowIndex, column.key)}
                        </td>
                      ))}
                      <td className="p-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteRow(rowIndex)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
