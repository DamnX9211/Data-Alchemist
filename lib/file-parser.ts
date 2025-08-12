/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as XLSX from "xlsx"
import type { ClientData, WorkerData, TaskData } from "@/types/data"

// AI-enabled column mapping - maps various header names to standard fields
const COLUMN_MAPPINGS = {
  clients: {
    ClientID: ["clientid", "client_id", "id", "client id", "customer id", "customerid"],
    ClientName: ["clientname", "client_name", "name", "client name", "customer name", "customername"],
    PriorityLevel: ["prioritylevel", "priority_level", "priority", "level", "importance"],
    RequestedTaskIDs: ["requestedtaskids", "requested_task_ids", "tasks", "task ids", "taskids", "requested tasks"],
    GroupTag: ["grouptag", "group_tag", "group", "tag", "category"],
    AttributesJSON: ["attributesjson", "attributes_json", "attributes", "metadata", "extra"],
  },
  workers: {
    WorkerID: ["workerid", "worker_id", "id", "worker id", "employee id", "employeeid"],
    WorkerName: ["workername", "worker_name", "name", "worker name", "employee name", "employeename"],
    Skills: ["skills", "skill", "abilities", "capabilities", "expertise"],
    AvailableSlots: ["availableslots", "available_slots", "slots", "availability", "phases"],
    MaxLoadPerPhase: ["maxloadperphase", "max_load_per_phase", "max load", "capacity", "limit"],
    WorkerGroup: ["workergroup", "worker_group", "group", "team", "department"],
    QualificationLevel: ["qualificationlevel", "qualification_level", "level", "experience", "grade"],
  },
  tasks: {
    TaskID: ["taskid", "task_id", "id", "task id"],
    TaskName: ["taskname", "task_name", "name", "task name", "title"],
    Category: ["category", "type", "kind", "classification"],
    Duration: ["duration", "length", "time", "phases"],
    RequiredSkills: ["requiredskills", "required_skills", "skills", "requirements"],
    PreferredPhases: ["preferredphases", "preferred_phases", "phases", "timing"],
    MaxConcurrent: ["maxconcurrent", "max_concurrent", "concurrent", "parallel", "simultaneous"],
  },
}

function findColumnMapping(headers: string[], mappings: Record<string, string[]>): Record<string, number> {
  const result: Record<string, number> = {}

  for (const [standardField, variations] of Object.entries(mappings)) {
    const headerIndex = headers.findIndex((header) => {
      const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, "")
      return variations.some(
        (variation) =>
          normalizedHeader === variation.replace(/[^a-z0-9]/g, "") ||
          normalizedHeader.includes(variation.replace(/[^a-z0-9]/g, "")) ||
          variation.replace(/[^a-z0-9]/g, "").includes(normalizedHeader),
      )
    })

    if (headerIndex !== -1) {
      result[standardField] = headerIndex
    }
  }

  return result
}

function parseArrayField(value: any): string[] | number[] {
  if (!value) return []

  if (typeof value === "string") {
    // Handle comma-separated values
    if (value.includes(",")) {
      return value
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v)
    }

    // Handle JSON array format
    if (value.startsWith("[") && value.endsWith("]")) {
      try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        // If JSON parsing fails, treat as single value
        return [value.trim()]
      }
    }

    // Handle range format (e.g., "1-5")
    if (value.includes("-") && /^\d+-\d+$/.test(value.trim())) {
      const [start, end] = value.split("-").map(Number)
      return Array.from({ length: end - start + 1 }, (_, i) => start + i)
    }

    return [value.trim()]
  }

  if (Array.isArray(value)) {
    return value
  }

  return [String(value)]
}

function parseJSONField(value: any): Record<string, any> {
  if (!value) return {}

  if (typeof value === "object") {
    return value
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value)
    } catch {
      // If parsing fails, return as single key-value
      return { value }
    }
  }

  return { value }
}

export async function parseCSVFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const lines = text.split("\n").filter((line) => line.trim())

        if (lines.length < 2) {
          reject(new Error("File must contain at least a header row and one data row"))
          return
        }

        const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))
        const data = []

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""))
          const row: Record<string, any> = {}

          headers.forEach((header, index) => {
            row[header] = values[index] || ""
          })

          data.push(row)
        }

        resolve(data)
      } catch (error) {
        reject(new Error("Failed to parse CSV file"))
      }
    }

    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsText(file)
  })
}

export async function parseXLSXFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)

        if (jsonData.length === 0) {
          reject(new Error("No data found in the spreadsheet"))
          return
        }

        resolve(jsonData)
      } catch (error) {
        reject(new Error("Failed to parse XLSX file"))
      }
    }

    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsArrayBuffer(file)
  })
}

export function normalizeClientData(rawData: any[]): ClientData[] {
  if (rawData.length === 0) return []

  const headers = Object.keys(rawData[0])
  const columnMap = findColumnMapping(headers, COLUMN_MAPPINGS.clients)

  return rawData.map((row, index) => ({
    ClientID: row[headers[columnMap.ClientID]] || `CLIENT_${index + 1}`,
    ClientName: row[headers[columnMap.ClientName]] || `Client ${index + 1}`,
    PriorityLevel: Number.parseInt(row[headers[columnMap.PriorityLevel]]) || 1,
    RequestedTaskIDs: parseArrayField(row[headers[columnMap.RequestedTaskIDs]]) as string[],
    GroupTag: row[headers[columnMap.GroupTag]] || "default",
    AttributesJSON: parseJSONField(row[headers[columnMap.AttributesJSON]]),
    // Added missing properties with fallback/defaults
    Email: row["Email"] || "",
    Name: row["Name"] || row[headers[columnMap.ClientName]] || `Client ${index + 1}`,
  }))
}

export function normalizeWorkerData(rawData: any[]): WorkerData[] {
  if (rawData.length === 0) return []

  const headers = Object.keys(rawData[0])
  const columnMap = findColumnMapping(headers, COLUMN_MAPPINGS.workers)

  return rawData.map((row, index) => ({
    // Added missing properties with fallback/defaults
    Email: row["Email"] || "",
    Name: row["Name"] || row[headers[columnMap.WorkerName]] || `Worker ${index + 1}`,
    WorkerID: row[headers[columnMap.WorkerID]] || `WORKER_${index + 1}`,
    WorkerName: row[headers[columnMap.WorkerName]] || `Worker ${index + 1}`,
    Skills: parseArrayField(row[headers[columnMap.Skills]]) as string[],
    AvailableSlots: parseArrayField(row[headers[columnMap.AvailableSlots]]) as number[],
    MaxLoadPerPhase: Number.parseInt(row[headers[columnMap.MaxLoadPerPhase]]) || 1,
    WorkerGroup: row[headers[columnMap.WorkerGroup]] || "default",
    QualificationLevel: Number.parseInt(row[headers[columnMap.QualificationLevel]]) || 1,
  }))
}

export function normalizeTaskData(rawData: any[]): TaskData[] {
  if (rawData.length === 0) return []

  const headers = Object.keys(rawData[0])
  const columnMap = findColumnMapping(headers, COLUMN_MAPPINGS.tasks)

  return rawData.map((row, index) => ({
    TaskID: row[headers[columnMap.TaskID]] || `TASK_${index + 1}`,
    TaskName: row[headers[columnMap.TaskName]] || `Task ${index + 1}`,
    Category: row[headers[columnMap.Category]] || "general",
    Duration: Number.parseInt(row[headers[columnMap.Duration]]) || 1,
    RequiredSkills: parseArrayField(row[headers[columnMap.RequiredSkills]]) as string[],
    PreferredPhases: parseArrayField(row[headers[columnMap.PreferredPhases]]) as number[],
    MaxConcurrent: Number.parseInt(row[headers[columnMap.MaxConcurrent]]) || 1,
    Phase: row["Phase"] || "default",
    Budget: Number.parseFloat(row["Budget"]) || 0,
    EstimatedDuration: Number.parseInt(row["EstimatedDuration"]) || 1,
    Priority: (row["Priority"] !== undefined && row["Priority"] !== null) ? String(row["Priority"]) : "1",
    MaxLoadPerPhase: Number.parseInt(row["MaxLoadPerPhase"]) || 1,
  }))
}
