/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  parseCSVFile,
  parseXLSXFile,
  normalizeClientData,
  normalizeWorkerData,
  normalizeTaskData,
} from "@/lib/file-parser"

interface FileUploadProps {
  onDataUpload: (type: "clients" | "workers" | "tasks", data: unknown[]) => void
}

export function FileUpload({ onDataUpload }: FileUploadProps) {
  const [uploading, setUploading] = useState<Record<string, boolean>>({})
  const [uploadStatus, setUploadStatus] = useState<Record<string, "success" | "error" | null>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleFileUpload = useCallback(
    async (file: File, type: "clients" | "workers" | "tasks") => {
      setUploading((prev) => ({ ...prev, [type]: true }))
      setUploadStatus((prev) => ({ ...prev, [type]: null }))
      setErrors((prev) => ({ ...prev, [type]: "" }))

      try {
        let rawData: unknown[]

        if (file.name.endsWith(".csv")) {
          rawData = await parseCSVFile(file)
        } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
          rawData = await parseXLSXFile(file)
        } else {
          throw new Error("Unsupported file format. Please upload CSV or XLSX files.")
        }

        if (rawData.length === 0) {
          throw new Error("No data found in the file.")
        }

        let normalizedData: any[]
        switch (type) {
          case "clients":
            normalizedData = normalizeClientData(rawData)
            break
          case "workers":
            normalizedData = normalizeWorkerData(rawData)
            break
          case "tasks":
            normalizedData = normalizeTaskData(rawData)
            break
          default:
            normalizedData = rawData
        }

        onDataUpload(type, normalizedData)
        setUploadStatus((prev) => ({ ...prev, [type]: "success" }))
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to parse file"
        setErrors((prev) => ({ ...prev, [type]: errorMessage }))
        setUploadStatus((prev) => ({ ...prev, [type]: "error" }))
      } finally {
        setUploading((prev) => ({ ...prev, [type]: false }))
      }
    },
    [onDataUpload],
  )

  const FileUploadCard = ({
    type,
    title,
    description,
    icon: Icon,
  }: {
    type: "clients" | "workers" | "tasks"
    title: string
    description: string
    icon: any
  }) => (
    <Card className="relative">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="w-5 h-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor={`${type}-file`}>Upload {title} File</Label>
            <Input
              id={`${type}-file`}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  handleFileUpload(file, type)
                }
              }}
              disabled={uploading[type]}
              className="mt-1"
            />
          </div>

          {uploading[type] && (
            <Alert>
              <Upload className="w-4 h-4 animate-spin" />
              <AlertDescription>Processing file...</AlertDescription>
            </Alert>
          )}

          {uploadStatus[type] === "success" && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800">File uploaded and parsed successfully!</AlertDescription>
            </Alert>
          )}

          {uploadStatus[type] === "error" && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{errors[type]}</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Your Data Files</CardTitle>
          <CardDescription>
            Upload CSV or XLSX files for clients, workers, and tasks. The AI will automatically map columns even if
            headers are misnamed or rearranged.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FileUploadCard
          type="clients"
          title="Clients"
          description="Upload client data with priorities and requested tasks"
          icon={FileSpreadsheet}
        />
        <FileUploadCard
          type="workers"
          title="Workers"
          description="Upload worker data with skills and availability"
          icon={FileSpreadsheet}
        />
        <FileUploadCard
          type="tasks"
          title="Tasks"
          description="Upload task data with requirements and constraints"
          icon={FileSpreadsheet}
        />
      </div>
    </div>
  )
}
