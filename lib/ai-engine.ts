/* eslint-disable @typescript-eslint/no-explicit-any */
export interface AISearchQuery {
  query: string
  type: "clients" | "workers" | "tasks"
  filters?: Record<string, any>
}

export interface AICorrection {
  id: string
  field: string
  entityId: string
  currentValue: any
  suggestedValue: any
  confidence: number
  reason: string
  category: "data-quality" | "consistency" | "optimization"
}

export interface AIInsight {
  id: string
  type: "pattern" | "anomaly" | "recommendation" | "optimization"
  title: string
  description: string
  impact: "high" | "medium" | "low"
  actionable: boolean
  suggestedAction?: string
}

// Natural Language Search Engine
export class NaturalLanguageSearchEngine {
  private static parseSearchQuery(query: string): { conditions: any[]; sortBy?: string; limit?: number } {
    const lowerQuery = query.toLowerCase()
    const conditions: any[] = []
    let sortBy: string | undefined
    let limit: number | undefined

    // Parse comparison operators
    const comparisonPatterns = [
      { pattern: /(\w+)\s*(>=|<=|>|<|=|equals?|greater than|less than|at least|at most)\s*(\d+)/g, type: "comparison" },
      { pattern: /(\w+)\s*(contains?|includes?|has)\s*["']?([^"']+)["']?/g, type: "contains" },
      { pattern: /(\w+)\s*(is|are)\s*["']?([^"']+)["']?/g, type: "equals" },
    ]

    for (const { pattern, type } of comparisonPatterns) {
      let match
      while ((match = pattern.exec(lowerQuery)) !== null) {
        const [, field, operator, value] = match

        conditions.push({
          field: this.normalizeFieldName(field),
          operator: this.normalizeOperator(operator),
          value: type === "comparison" ? Number(value) : value,
          type,
        })
      }
    }

    // Parse sorting
    const sortPattern = /sort(?:ed)?\s+by\s+(\w+)(?:\s+(asc|desc|ascending|descending))?/i
    const sortMatch = sortPattern.exec(query)
    if (sortMatch) {
      sortBy = this.normalizeFieldName(sortMatch[1])
    }

    // Parse limits
    const limitPattern = /(?:first|top|limit)\s+(\d+)/i
    const limitMatch = limitPattern.exec(query)
    if (limitMatch) {
      limit = Number(limitMatch[1])
    }

    return { conditions, sortBy, limit }
  }

  private static normalizeFieldName(field: string): string {
    const fieldMappings: Record<string, string> = {
      priority: "PriorityLevel",
      level: "PriorityLevel",
      duration: "Duration",
      time: "Duration",
      phases: "Duration",
      skills: "Skills",
      skill: "Skills",
      abilities: "Skills",
      name: "Name",
      id: "ID",
      group: "Group",
      category: "Category",
      type: "Category",
      slots: "AvailableSlots",
      availability: "AvailableSlots",
      load: "MaxLoadPerPhase",
      capacity: "MaxLoadPerPhase",
      concurrent: "MaxConcurrent",
      parallel: "MaxConcurrent",
      qualification: "QualificationLevel",
      experience: "QualificationLevel",
    }

    return fieldMappings[field.toLowerCase()] || field
  }

  private static normalizeOperator(operator: string): string {
    const operatorMappings: Record<string, string> = {
      equals: "=",
      equal: "=",
      is: "=",
      are: "=",
      "greater than": ">",
      "less than": "<",
      "at least": ">=",
      "at most": "<=",
      contains: "includes",
      has: "includes",
      include: "includes",
    }

    return operatorMappings[operator.toLowerCase()] || operator
  }

  static searchData<T extends Record<string, any>>(data: T[], query: string, type: string): T[] {
    if (!query.trim()) return data

    const { conditions, sortBy, limit } = this.parseSearchQuery(query)

    let results = data.filter((item) => {
      return conditions.every((condition) => {
        const fieldValue = this.getFieldValue(item, condition.field, type)

        switch (condition.operator) {
          case "=":
            return this.compareValues(fieldValue, condition.value, "=")
          case ">":
            return this.compareValues(fieldValue, condition.value, ">")
          case "<":
            return this.compareValues(fieldValue, condition.value, "<")
          case ">=":
            return this.compareValues(fieldValue, condition.value, ">=")
          case "<=":
            return this.compareValues(fieldValue, condition.value, "<=")
          case "includes":
            return this.includesValue(fieldValue, condition.value)
          default:
            return this.includesValue(fieldValue, condition.value)
        }
      })
    })

    // Apply sorting
    if (sortBy) {
      results.sort((a, b) => {
        const aVal = this.getFieldValue(a, sortBy, type)
        const bVal = this.getFieldValue(b, sortBy, type)

        if (typeof aVal === "number" && typeof bVal === "number") {
          return aVal - bVal
        }
        return String(aVal).localeCompare(String(bVal))
      })
    }

    // Apply limit
    if (limit) {
      results = results.slice(0, limit)
    }

    return results
  }

  private static getFieldValue(item: any, field: string, type: string): any {
    // Map normalized field names to actual field names based on type
    const fieldMappings: Record<string, Record<string, string>> = {
      clients: {
        PriorityLevel: "PriorityLevel",
        Name: "ClientName",
        ID: "ClientID",
        Group: "GroupTag",
      },
      workers: {
        Skills: "Skills",
        Name: "WorkerName",
        ID: "WorkerID",
        Group: "WorkerGroup",
        AvailableSlots: "AvailableSlots",
        MaxLoadPerPhase: "MaxLoadPerPhase",
        QualificationLevel: "QualificationLevel",
      },
      tasks: {
        Duration: "Duration",
        Name: "TaskName",
        ID: "TaskID",
        Category: "Category",
        Skills: "RequiredSkills",
        MaxConcurrent: "MaxConcurrent",
      },
    }

    const actualField = fieldMappings[type]?.[field] || field
    return item[actualField]
  }

  private static compareValues(fieldValue: any, queryValue: any, operator: string): boolean {
    if (typeof fieldValue === "number" && typeof queryValue === "number") {
      switch (operator) {
        case "=":
          return fieldValue === queryValue
        case ">":
          return fieldValue > queryValue
        case "<":
          return fieldValue < queryValue
        case ">=":
          return fieldValue >= queryValue
        case "<=":
          return fieldValue <= queryValue
        default:
          return false
      }
    }

    const fieldStr = String(fieldValue).toLowerCase()
    const queryStr = String(queryValue).toLowerCase()

    return operator === "=" ? fieldStr === queryStr : fieldStr.includes(queryStr)
  }

  private static includesValue(fieldValue: any, queryValue: string): boolean {
    if (Array.isArray(fieldValue)) {
      return fieldValue.some((item) => String(item).toLowerCase().includes(queryValue.toLowerCase()))
    }

    if (typeof fieldValue === "object") {
      return JSON.stringify(fieldValue).toLowerCase().includes(queryValue.toLowerCase())
    }

    return String(fieldValue).toLowerCase().includes(queryValue.toLowerCase())
  }
}

// AI Data Correction Engine
export class AIDataCorrectionEngine {
  static analyzeData<T extends Record<string, any>>(data: T[], type: "clients" | "workers" | "tasks"): AICorrection[] {
    const corrections: AICorrection[] = []

    for (const item of data) {
      corrections.push(...this.analyzeItem(item, type))
    }

    return corrections.sort((a, b) => b.confidence - a.confidence)
  }

  private static analyzeItem(item: any, type: string): AICorrection[] {
    const corrections: AICorrection[] = []

    switch (type) {
      case "clients":
        corrections.push(...this.analyzeClient(item))
        break
      case "workers":
        corrections.push(...this.analyzeWorker(item))
        break
      case "tasks":
        corrections.push(...this.analyzeTask(item))
        break
    }

    return corrections
  }

  private static analyzeClient(client: any): AICorrection[] {
    const corrections: AICorrection[] = []

    // Standardize client names
    if (client.ClientName && typeof client.ClientName === "string") {
      const standardized = this.standardizeName(client.ClientName)
      if (standardized !== client.ClientName) {
        corrections.push({
          id: `client-${client.ClientID}-name-standardization`,
          field: "ClientName",
          entityId: client.ClientID,
          currentValue: client.ClientName,
          suggestedValue: standardized,
          confidence: 0.8,
          reason: "Standardize name formatting (proper case, remove extra spaces)",
          category: "data-quality",
        })
      }
    }

    // Optimize priority levels
    if (client.PriorityLevel === 3) {
      corrections.push({
        id: `client-${client.ClientID}-priority-optimization`,
        field: "PriorityLevel",
        entityId: client.ClientID,
        currentValue: client.PriorityLevel,
        suggestedValue: 4,
        confidence: 0.6,
        reason: "Consider increasing priority for better resource allocation",
        category: "optimization",
      })
    }

    return corrections
  }

  private static analyzeWorker(worker: any): AICorrection[] {
    const corrections: AICorrection[] = []

    // Standardize worker names
    if (worker.WorkerName && typeof worker.WorkerName === "string") {
      const standardized = this.standardizeName(worker.WorkerName)
      if (standardized !== worker.WorkerName) {
        corrections.push({
          id: `worker-${worker.WorkerID}-name-standardization`,
          field: "WorkerName",
          entityId: worker.WorkerID,
          currentValue: worker.WorkerName,
          suggestedValue: standardized,
          confidence: 0.8,
          reason: "Standardize name formatting (proper case, remove extra spaces)",
          category: "data-quality",
        })
      }
    }

    // Optimize skill tags
    if (Array.isArray(worker.Skills)) {
      const optimizedSkills = this.optimizeSkills(worker.Skills)
      if (JSON.stringify(optimizedSkills) !== JSON.stringify(worker.Skills)) {
        corrections.push({
          id: `worker-${worker.WorkerID}-skills-optimization`,
          field: "Skills",
          entityId: worker.WorkerID,
          currentValue: worker.Skills,
          suggestedValue: optimizedSkills,
          confidence: 0.7,
          reason: "Standardize skill names and remove duplicates",
          category: "consistency",
        })
      }
    }

    return corrections
  }

  private static analyzeTask(task: any): AICorrection[] {
    const corrections: AICorrection[] = []

    // Standardize task names
    if (task.TaskName && typeof task.TaskName === "string") {
      const standardized = this.standardizeName(task.TaskName)
      if (standardized !== task.TaskName) {
        corrections.push({
          id: `task-${task.TaskID}-name-standardization`,
          field: "TaskName",
          entityId: task.TaskID,
          currentValue: task.TaskName,
          suggestedValue: standardized,
          confidence: 0.8,
          reason: "Standardize name formatting (proper case, remove extra spaces)",
          category: "data-quality",
        })
      }
    }

    // Optimize duration
    if (task.Duration > 5) {
      corrections.push({
        id: `task-${task.TaskID}-duration-optimization`,
        field: "Duration",
        entityId: task.TaskID,
        currentValue: task.Duration,
        suggestedValue: Math.ceil(task.Duration * 0.8),
        confidence: 0.6,
        reason: "Consider breaking down long-duration tasks for better scheduling",
        category: "optimization",
      })
    }

    return corrections
  }

  private static standardizeName(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ")
  }

  private static optimizeSkills(skills: string[]): string[] {
    const skillMappings: Record<string, string> = {
      js: "JavaScript",
      javascript: "JavaScript",
      ts: "TypeScript",
      typescript: "TypeScript",
      py: "Python",
      python: "Python",
      react: "React",
      reactjs: "React",
      node: "Node.js",
      nodejs: "Node.js",
      sql: "SQL",
      database: "Database Management",
      db: "Database Management",
    }

    return [
      ...new Set(
        skills
          .map((skill) => skill.trim().toLowerCase())
          .map((skill) => skillMappings[skill] || skill.charAt(0).toUpperCase() + skill.slice(1)),
      ),
    ]
  }
}

// AI Insights Engine
export class AIInsightsEngine {
  static generateInsights(clientsData: any[], workersData: any[], tasksData: any[]): AIInsight[] {
    const insights: AIInsight[] = []

    // Analyze workload distribution
    insights.push(...this.analyzeWorkloadDistribution(workersData, tasksData))

    // Analyze skill gaps
    insights.push(...this.analyzeSkillGaps(workersData, tasksData))

    // Analyze priority patterns
    insights.push(...this.analyzePriorityPatterns(clientsData))

    // Analyze capacity utilization
    insights.push(...this.analyzeCapacityUtilization(workersData, tasksData))

    return insights.sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 }
      return impactOrder[b.impact] - impactOrder[a.impact]
    })
  }

  private static analyzeWorkloadDistribution(workersData: any[], tasksData: any[]): AIInsight[] {
    const insights: AIInsight[] = []

    const totalCapacity = workersData.reduce(
      (sum, worker) => sum + (worker.AvailableSlots?.length || 0) * (worker.MaxLoadPerPhase || 1),
      0,
    )

    const totalDemand = tasksData.reduce((sum, task) => sum + (task.Duration || 1), 0)

    if (totalDemand > totalCapacity * 0.9) {
      insights.push({
        id: "workload-high-utilization",
        type: "anomaly",
        title: "High Capacity Utilization Detected",
        description: `Current demand (${totalDemand}) is ${Math.round((totalDemand / totalCapacity) * 100)}% of total capacity (${totalCapacity}). This may lead to scheduling conflicts.`,
        impact: "high",
        actionable: true,
        suggestedAction: "Consider adding more workers or extending available time slots",
      })
    }

    return insights
  }

  private static analyzeSkillGaps(workersData: any[], tasksData: any[]): AIInsight[] {
    const insights: AIInsight[] = []

    const availableSkills = new Set<string>()
    workersData.forEach((worker) => {
      if (Array.isArray(worker.Skills)) {
        worker.Skills.forEach((skill: string) => availableSkills.add(skill))
      }
    })

    const requiredSkills = new Set<string>()
    tasksData.forEach((task) => {
      if (Array.isArray(task.RequiredSkills)) {
        task.RequiredSkills.forEach((skill: string) => requiredSkills.add(skill))
      }
    })

    const missingSkills = [...requiredSkills].filter((skill) => !availableSkills.has(skill))

    if (missingSkills.length > 0) {
      insights.push({
        id: "skill-gaps-detected",
        type: "recommendation",
        title: "Skill Gaps Identified",
        description: `${missingSkills.length} required skills are not available in the current workforce: ${missingSkills.join(", ")}`,
        impact: "high",
        actionable: true,
        suggestedAction: "Hire workers with missing skills or provide training to existing workers",
      })
    }

    return insights
  }

  private static analyzePriorityPatterns(clientsData: any[]): AIInsight[] {
    const insights: AIInsight[] = []

    const priorityDistribution = clientsData.reduce(
      (acc, client) => {
        const priority = client.PriorityLevel || 1
        acc[priority] = (acc[priority] || 0) + 1
        return acc
      },
      {} as Record<number, number>,
    )

    const highPriorityCount = (priorityDistribution[4] || 0) + (priorityDistribution[5] || 0)
    const totalClients = clientsData.length

    if (highPriorityCount > totalClients * 0.7) {
      insights.push({
        id: "priority-inflation",
        type: "pattern",
        title: "Priority Inflation Detected",
        description: `${Math.round((highPriorityCount / totalClients) * 100)}% of clients have high priority (4-5). This may reduce the effectiveness of priority-based scheduling.`,
        impact: "medium",
        actionable: true,
        suggestedAction: "Review and rebalance client priorities to ensure meaningful differentiation",
      })
    }

    return insights
  }

  private static analyzeCapacityUtilization(workersData: any[], tasksData: any[]): AIInsight[] {
    const insights: AIInsight[] = []

    const workerUtilization = workersData.map((worker) => {
      const capacity = (worker.AvailableSlots?.length || 0) * (worker.MaxLoadPerPhase || 1)
      const relevantTasks = tasksData.filter(
        (task) =>
          Array.isArray(task.RequiredSkills) &&
          Array.isArray(worker.Skills) &&
          task.RequiredSkills.some((skill: string) => worker.Skills.includes(skill)),
      )
      const demand = relevantTasks.reduce((sum, task) => sum + (task.Duration || 1), 0)

      return {
        workerId: worker.WorkerID,
        utilization: capacity > 0 ? demand / capacity : 0,
        capacity,
        demand,
      }
    })

    const underutilized = workerUtilization.filter((w) => w.utilization < 0.3 && w.capacity > 0)
    const overutilized = workerUtilization.filter((w) => w.utilization > 1.2)

    if (underutilized.length > 0) {
      insights.push({
        id: "underutilized-workers",
        type: "optimization",
        title: "Underutilized Workers Detected",
        description: `${underutilized.length} workers have low utilization rates. Consider reassigning tasks or adjusting schedules.`,
        impact: "medium",
        actionable: true,
        suggestedAction: "Review task assignments and worker skill matching",
      })
    }

    if (overutilized.length > 0) {
      insights.push({
        id: "overutilized-workers",
        type: "anomaly",
        title: "Overutilized Workers Detected",
        description: `${overutilized.length} workers are assigned more work than their capacity allows.`,
        impact: "high",
        actionable: true,
        suggestedAction: "Redistribute workload or increase worker capacity",
      })
    }

    return insights
  }
}
