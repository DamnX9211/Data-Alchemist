"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Upload, FileSpreadsheet, Users, Briefcase } from "lucide-react"
import { FileUpload } from "@/components/file-upload"
import { DataGrid } from "@/components/data-grid"
import { ValidationPanel } from "@/components/validation-panel"
import { RuleBuilder } from "@/components/rule-builder"
import { ExportControls } from "@/components/export-controls"
import { AIInsightsPanel } from "@/components/ai-insights-panel"
import type { ClientData, WorkerData, TaskData, ValidationError } from "@/types/data"

export default function DataAlchemist() {
  const [clientsData, setClientsData] = useState<ClientData[]>([])
  const [workersData, setWorkersData] = useState<WorkerData[]>([])
  const [tasksData, setTasksData] = useState<TaskData[]>([])
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [activeTab, setActiveTab] = useState<"upload" | "clients" | "workers" | "tasks" | "rules" | "export">("upload")

  const handleDataUpload = (type: "clients" | "workers" | "tasks", data: unknown[]) => {
    switch (type) {
      case "clients":
        setClientsData(data as ClientData[])
        break
      case "workers":
        setWorkersData(data as WorkerData[])
        break
      case "tasks":
        setTasksData(data as TaskData[])
        break
    }
  }

  const hasData = clientsData.length > 0 || workersData.length > 0 || tasksData.length > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Data Alchemist</h1>
          <p className="text-lg text-gray-600">Transform your messy spreadsheets into clean, validated data with AI</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 justify-center">
          <Button
            variant={activeTab === "upload" ? "default" : "outline"}
            onClick={() => setActiveTab("upload")}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload Data
          </Button>
          <Button
            variant={activeTab === "clients" ? "default" : "outline"}
            onClick={() => setActiveTab("clients")}
            disabled={clientsData.length === 0}
            className="flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            Clients ({clientsData.length})
          </Button>
          <Button
            variant={activeTab === "workers" ? "default" : "outline"}
            onClick={() => setActiveTab("workers")}
            disabled={workersData.length === 0}
            className="flex items-center gap-2"
          >
            <Briefcase className="w-4 h-4" />
            Workers ({workersData.length})
          </Button>
          <Button
            variant={activeTab === "tasks" ? "default" : "outline"}
            onClick={() => setActiveTab("tasks")}
            disabled={tasksData.length === 0}
            className="flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Tasks ({tasksData.length})
          </Button>
          <Button
            variant={activeTab === "rules" ? "default" : "outline"}
            onClick={() => setActiveTab("rules")}
            disabled={!hasData}
          >
            Rules
          </Button>
          <Button
            variant={activeTab === "export" ? "default" : "outline"}
            onClick={() => setActiveTab("export")}
            disabled={!hasData}
          >
            Export
          </Button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1  gap-6">
          <div className="lg:col-span-3">
            {activeTab === "upload" && <FileUpload onDataUpload={handleDataUpload} />}
            {activeTab === "clients" && (
              <DataGrid
                data={clientsData}
                type="clients"
                onDataChange={(data) => setClientsData(data as ClientData[])}
              />
            )}
            {activeTab === "workers" && (
              <DataGrid
                data={workersData}
                type="workers"
                onDataChange={(data) => setWorkersData(data as WorkerData[])}
              />
            )}
            {activeTab === "tasks" && (
              <DataGrid data={tasksData} type="tasks" onDataChange={(data) => setTasksData(data as TaskData[])} />
            )}
            {activeTab === "rules" && (
              <RuleBuilder
                clientsData={clientsData}
                workersData={workersData}
                tasksData={tasksData}
              />
            )}
            {activeTab === "export" && (
              <ExportControls clientsData={clientsData} workersData={workersData} tasksData={tasksData} />
            )}
          </div>

          <div className="lg:col-span-1 space-y-4">
            <ValidationPanel
              errors={validationErrors}
              clientsData={clientsData}
              workersData={workersData}
              tasksData={tasksData}
              onValidationComplete={setValidationErrors}
            />

            {hasData && <AIInsightsPanel clientsData={clientsData} workersData={workersData} tasksData={tasksData} />}
          </div>
        </div>
      </div>
    </div>
  )
}
