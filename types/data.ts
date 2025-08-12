/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ClientData {
  Email: any
  Name: any
  ClientID: string
  ClientName: string
  PriorityLevel: number // 1-5
  RequestedTaskIDs: string[] // comma-separated TaskIDs converted to array
  GroupTag: string
  AttributesJSON: Record<string, any> // parsed JSON
}

export interface WorkerData {
  Name: string[]
  WorkerID: string
  WorkerName: string
  Skills: string[] // comma-separated tags converted to array
  AvailableSlots: number[] // array of phase numbers
  MaxLoadPerPhase: number
  WorkerGroup: string
  QualificationLevel: number
}

export interface TaskData {
  Phase: string
  Budget: any
  EstimatedDuration: number
  Priority: string
  TaskID: string
  TaskName: string
  Category: string
  Duration: number // number of phases (≥1)
  RequiredSkills: string[] // comma-separated tags converted to array
  PreferredPhases: number[] // list or range syntax converted to array
  MaxConcurrent: number // max parallel assignments
}

export interface ValidationError {
  id: string
  type: "error" | "warning"
  entity: "clients" | "workers" | "tasks"
  entityId: string
  field?: string
  message: string
  suggestion?: string
  severity?: "critical" | "high" | "medium" | "low"
  category?: "data-integrity" | "business-logic" | "performance" | "compatibility"
}

export interface BusinessRule {
  id: string
  type: "coRun" | "slotRestriction" | "loadLimit" | "phaseWindow" | "patternMatch" | "precedenceOverride"
  name: string
  description: string
  parameters: Record<string, any>
  active: boolean
}

export interface PrioritizationWeights {
  priorityLevel: number
  taskFulfillment: number
  fairness: number
  workloadBalance: number
  skillMatch: number
  phasePreference: number
}

export interface ExportConfig {
  includeValidationReport: boolean
  includeRulesFile: boolean
  format: "csv" | "xlsx"
  weights: PrioritizationWeights
  rules: BusinessRule[]
}
