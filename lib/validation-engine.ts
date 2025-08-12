/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ClientData, WorkerData, TaskData, ValidationError, BusinessRule } from "@/types/data"

export async function runValidations(
  clientsData: ClientData[],
  workersData: WorkerData[],
  tasksData: TaskData[],
  businessRules: BusinessRule[] = [],
): Promise<ValidationError[]> {
  const errors: ValidationError[] = []

  // 1. Missing required columns validation
  await validateRequiredFields(clientsData, workersData, tasksData, errors)

  // 2. Duplicate IDs validation
  await validateDuplicateIds(clientsData, workersData, tasksData, errors)

  // 3. Malformed lists validation
  await validateMalformedLists(clientsData, workersData, tasksData, errors)

  // 4. Out-of-range values validation
  await validateRangeValues(clientsData, workersData, tasksData, errors)

  // 5. Broken JSON validation
  await validateJSONFields(clientsData, errors)

  // 6. Unknown references validation
  await validateReferences(clientsData, workersData, tasksData, errors)

  // 7. Circular co-run groups validation
  await validateCircularCoRuns(businessRules, errors)

  // 8. Conflicting rules vs phase-window constraints
  await validateRuleConflicts(businessRules, tasksData, errors)

  // 9. Overloaded workers validation
  await validateWorkerOverload(workersData, errors)

  // 10. Phase-slot saturation validation
  await validatePhaseSlotSaturation(workersData, tasksData, errors)

  // 11. Skill-coverage matrix validation
  await validateSkillCoverage(workersData, tasksData, errors)

  // 12. Max-concurrency feasibility validation
  await validateMaxConcurrencyFeasibility(workersData, tasksData, errors)

  return errors
}

// 1. Missing required fields validation
async function validateRequiredFields(
  clientsData: ClientData[],
  workersData: WorkerData[],
  tasksData: TaskData[],
  errors: ValidationError[],
) {
  // Required client fields
  const requiredClientFields = ["ClientID", "ClientName", "PriorityLevel"]
  for (const client of clientsData) {
    for (const field of requiredClientFields) {
      if (!client[field as keyof ClientData]) {
        errors.push({
          id: `client-${client.ClientID || "unknown"}-missing-${field}`,
          type: "error",
          entity: "clients",
          entityId: client.ClientID || "Unknown",
          field,
          message: `Required field "${field}" is missing`,
          suggestion: `Add a value for ${field}`,
        })
      }
    }
  }

  // Required worker fields
  const requiredWorkerFields = ["WorkerID", "WorkerName", "Skills", "AvailableSlots", "MaxLoadPerPhase"]
  for (const worker of workersData) {
    for (const field of requiredWorkerFields) {
      if (
        !worker[field as keyof WorkerData] ||
        (Array.isArray(worker[field as keyof WorkerData]) && (worker[field as keyof WorkerData] as any[]).length === 0)
      ) {
        errors.push({
          id: `worker-${worker.WorkerID || "unknown"}-missing-${field}`,
          type: "error",
          entity: "workers",
          entityId: worker.WorkerID || "Unknown",
          field,
          message: `Required field "${field}" is missing or empty`,
          suggestion: `Add a value for ${field}`,
        })
      }
    }
  }

  // Required task fields
  const requiredTaskFields = ["TaskID", "TaskName", "Duration", "RequiredSkills"]
  for (const task of tasksData) {
    for (const field of requiredTaskFields) {
      if (
        !task[field as keyof TaskData] ||
        (Array.isArray(task[field as keyof TaskData]) && (task[field as keyof TaskData] as any[]).length === 0)
      ) {
        errors.push({
          id: `task-${task.TaskID || "unknown"}-missing-${field}`,
          type: "error",
          entity: "tasks",
          entityId: task.TaskID || "Unknown",
          field,
          message: `Required field "${field}" is missing or empty`,
          suggestion: `Add a value for ${field}`,
        })
      }
    }
  }
}

// 2. Duplicate IDs validation
async function validateDuplicateIds(
  clientsData: ClientData[],
  workersData: WorkerData[],
  tasksData: TaskData[],
  errors: ValidationError[],
) {
  // Check duplicate client IDs
  const clientIds = clientsData.map((c) => c.ClientID).filter((id) => id)
  const duplicateClientIds = clientIds.filter((id, index) => clientIds.indexOf(id) !== index)
  for (const duplicateId of [...new Set(duplicateClientIds)]) {
    errors.push({
      id: `duplicate-client-${duplicateId}`,
      type: "error",
      entity: "clients",
      entityId: duplicateId,
      message: `Duplicate Client ID: ${duplicateId}`,
      suggestion: "Ensure all Client IDs are unique",
    })
  }

  // Check duplicate worker IDs
  const workerIds = workersData.map((w) => w.WorkerID).filter((id) => id)
  const duplicateWorkerIds = workerIds.filter((id, index) => workerIds.indexOf(id) !== index)
  for (const duplicateId of [...new Set(duplicateWorkerIds)]) {
    errors.push({
      id: `duplicate-worker-${duplicateId}`,
      type: "error",
      entity: "workers",
      entityId: duplicateId,
      message: `Duplicate Worker ID: ${duplicateId}`,
      suggestion: "Ensure all Worker IDs are unique",
    })
  }

  // Check duplicate task IDs
  const taskIds = tasksData.map((t) => t.TaskID).filter((id) => id)
  const duplicateTaskIds = taskIds.filter((id, index) => taskIds.indexOf(id) !== index)
  for (const duplicateId of [...new Set(duplicateTaskIds)]) {
    errors.push({
      id: `duplicate-task-${duplicateId}`,
      type: "error",
      entity: "tasks",
      entityId: duplicateId,
      message: `Duplicate Task ID: ${duplicateId}`,
      suggestion: "Ensure all Task IDs are unique",
    })
  }
}

// 3. Malformed lists validation
async function validateMalformedLists(
  clientsData: ClientData[],
  workersData: WorkerData[],
  tasksData: TaskData[],
  errors: ValidationError[],
) {
  // Validate worker available slots (should be numeric)
  for (const worker of workersData) {
    if (worker.AvailableSlots.some((slot) => typeof slot !== "number" || isNaN(slot))) {
      errors.push({
        id: `worker-${worker.WorkerID}-malformed-slots`,
        type: "error",
        entity: "workers",
        entityId: worker.WorkerID,
        field: "AvailableSlots",
        message: "Available slots must contain only numeric values",
        suggestion: "Ensure all slot values are valid numbers",
      })
    }
  }

  // Validate task preferred phases (should be numeric)
  for (const task of tasksData) {
    if (task.PreferredPhases.some((phase) => typeof phase !== "number" || isNaN(phase))) {
      errors.push({
        id: `task-${task.TaskID}-malformed-phases`,
        type: "error",
        entity: "tasks",
        entityId: task.TaskID,
        field: "PreferredPhases",
        message: "Preferred phases must contain only numeric values",
        suggestion: "Ensure all phase values are valid numbers",
      })
    }
  }
}

// 4. Out-of-range values validation
async function validateRangeValues(
  clientsData: ClientData[],
  workersData: WorkerData[],
  tasksData: TaskData[],
  errors: ValidationError[],
) {
  // Priority level validation (1-5)
  for (const client of clientsData) {
    if (client.PriorityLevel < 1 || client.PriorityLevel > 5) {
      errors.push({
        id: `client-${client.ClientID}-invalid-priority`,
        type: "error",
        entity: "clients",
        entityId: client.ClientID,
        field: "PriorityLevel",
        message: `Priority level must be between 1-5, got ${client.PriorityLevel}`,
        suggestion: "Set priority level to a value between 1 (lowest) and 5 (highest)",
      })
    }
  }

  // Duration validation (≥1)
  for (const task of tasksData) {
    if (task.Duration < 1) {
      errors.push({
        id: `task-${task.TaskID}-invalid-duration`,
        type: "error",
        entity: "tasks",
        entityId: task.TaskID,
        field: "Duration",
        message: `Duration must be at least 1, got ${task.Duration}`,
        suggestion: "Set duration to a positive number of phases",
      })
    }

    if (task.MaxConcurrent < 1) {
      errors.push({
        id: `task-${task.TaskID}-invalid-concurrent`,
        type: "error",
        entity: "tasks",
        entityId: task.TaskID,
        field: "MaxConcurrent",
        message: "Max concurrent must be at least 1",
        suggestion: "Set a positive number for maximum parallel assignments",
      })
    }
  }

  // Worker load validation
  for (const worker of workersData) {
    if (worker.MaxLoadPerPhase < 1) {
      errors.push({
        id: `worker-${worker.WorkerID}-invalid-load`,
        type: "error",
        entity: "workers",
        entityId: worker.WorkerID,
        field: "MaxLoadPerPhase",
        message: "Max load per phase must be at least 1",
        suggestion: "Set a positive number for maximum workload capacity",
      })
    }

    // Available slots should be positive
    if (worker.AvailableSlots.some((slot) => slot < 1)) {
      errors.push({
        id: `worker-${worker.WorkerID}-invalid-slots`,
        type: "error",
        entity: "workers",
        entityId: worker.WorkerID,
        field: "AvailableSlots",
        message: "Available slots must be positive numbers",
        suggestion: "Ensure all phase numbers are 1 or greater",
      })
    }
  }
}

// 5. Broken JSON validation
async function validateJSONFields(clientsData: ClientData[], errors: ValidationError[]) {
  for (const client of clientsData) {
    try {
      if (client.AttributesJSON && typeof client.AttributesJSON === "string") {
        JSON.parse(client.AttributesJSON as string)
      }
    } catch {
      errors.push({
        id: `client-${client.ClientID}-broken-json`,
        type: "error",
        entity: "clients",
        entityId: client.ClientID,
        field: "AttributesJSON",
        message: "Invalid JSON format in AttributesJSON field",
        suggestion: "Fix the JSON syntax or use the object format",
      })
    }
  }
}

// 6. Unknown references validation
async function validateReferences(
  clientsData: ClientData[],
  workersData: WorkerData[],
  tasksData: TaskData[],
  errors: ValidationError[],
) {
  const taskIds = new Set(tasksData.map((t) => t.TaskID))

  // Check if requested tasks exist
  for (const client of clientsData) {
    for (const taskId of client.RequestedTaskIDs) {
      if (!taskIds.has(taskId)) {
        errors.push({
          id: `client-${client.ClientID}-unknown-task-${taskId}`,
          type: "error",
          entity: "clients",
          entityId: client.ClientID,
          field: "RequestedTaskIDs",
          message: `Requested task "${taskId}" does not exist`,
          suggestion: "Remove this task ID or add the corresponding task to the tasks data",
        })
      }
    }
  }
}

// 7. Circular co-run groups validation
async function validateCircularCoRuns(businessRules: BusinessRule[], errors: ValidationError[]) {
  const coRunRules = businessRules.filter((rule) => rule.type === "coRun")

  for (const rule of coRunRules) {
    const tasks = rule.parameters.tasks || []

    // Check for circular dependencies in co-run groups
    const visited = new Set<string>()
    const recursionStack = new Set<string>()

    function hasCycle(taskId: string): boolean {
      if (recursionStack.has(taskId)) return true
      if (visited.has(taskId)) return false

      visited.add(taskId)
      recursionStack.add(taskId)

      // Find other co-run rules that include this task
      const relatedRules = coRunRules.filter((r) => r.id !== rule.id && r.parameters.tasks?.includes(taskId))

      for (const relatedRule of relatedRules) {
        for (const relatedTask of relatedRule.parameters.tasks || []) {
          if (relatedTask !== taskId && hasCycle(relatedTask)) {
            return true
          }
        }
      }

      recursionStack.delete(taskId)
      return false
    }

    for (const taskId of tasks) {
      if (hasCycle(taskId)) {
        errors.push({
          id: `circular-corun-${rule.id}`,
          type: "error",
          entity: "tasks",
          entityId: taskId,
          message: `Circular co-run dependency detected in rule "${rule.name}"`,
          suggestion: "Remove circular dependencies between co-run task groups",
        })
        break
      }
    }
  }
}

// 8. Conflicting rules vs phase-window constraints
async function validateRuleConflicts(businessRules: BusinessRule[], tasksData: TaskData[], errors: ValidationError[]) {
  const phaseWindowRules = businessRules.filter((rule) => rule.type === "phaseWindow")
  const coRunRules = businessRules.filter((rule) => rule.type === "coRun")

  for (const coRunRule of coRunRules) {
    const coRunTasks = coRunRule.parameters.tasks || []

    // Check if co-run tasks have conflicting phase windows
    const taskPhaseWindows = new Map<string, number[]>()

    for (const taskId of coRunTasks) {
      const task = tasksData.find((t) => t.TaskID === taskId)
      if (task) {
        taskPhaseWindows.set(taskId, task.PreferredPhases)
      }

      // Check for explicit phase window rules
      const phaseRule = phaseWindowRules.find((rule) => rule.parameters.taskId === taskId)
      if (phaseRule) {
        taskPhaseWindows.set(taskId, phaseRule.parameters.allowedPhases || [])
      }
    }

    // Find common phases among co-run tasks
    const phaseArrays = Array.from(taskPhaseWindows.values())
    if (phaseArrays.length > 1) {
      const commonPhases = phaseArrays.reduce((common, phases) => common.filter((phase) => phases.includes(phase)))

      if (commonPhases.length === 0) {
        errors.push({
          id: `conflicting-phases-${coRunRule.id}`,
          type: "error",
          entity: "tasks",
          entityId: coRunTasks.join(", "),
          message: `Co-run tasks have no overlapping phase windows: ${coRunTasks.join(", ")}`,
          suggestion: "Adjust phase windows to allow co-run tasks to execute in the same phases",
        })
      }
    }
  }
}

// 9. Overloaded workers validation
async function validateWorkerOverload(workersData: WorkerData[], errors: ValidationError[]) {
  for (const worker of workersData) {
    if (worker.AvailableSlots.length < worker.MaxLoadPerPhase) {
      errors.push({
        id: `worker-${worker.WorkerID}-overloaded`,
        type: "warning",
        entity: "workers",
        entityId: worker.WorkerID,
        message: `Worker has fewer available slots (${worker.AvailableSlots.length}) than max load capacity (${worker.MaxLoadPerPhase})`,
        suggestion: "Consider increasing available slots or reducing max load per phase",
      })
    }
  }
}

// 10. Phase-slot saturation validation
async function validatePhaseSlotSaturation(
  workersData: WorkerData[],
  tasksData: TaskData[],
  errors: ValidationError[],
) {
  // Calculate total worker slots per phase
  const phaseSlots = new Map<number, number>()

  for (const worker of workersData) {
    for (const phase of worker.AvailableSlots) {
      phaseSlots.set(phase, (phaseSlots.get(phase) || 0) + worker.MaxLoadPerPhase)
    }
  }

  // Calculate required slots per phase based on task durations and preferred phases
  const phaseRequirements = new Map<number, number>()

  for (const task of tasksData) {
    const phases = task.PreferredPhases.length > 0 ? task.PreferredPhases : [1] // Default to phase 1

    for (const phase of phases) {
      phaseRequirements.set(phase, (phaseRequirements.get(phase) || 0) + task.Duration)
    }
  }

  // Check for saturation
  for (const [phase, required] of phaseRequirements) {
    const available = phaseSlots.get(phase) || 0

    if (required > available) {
      errors.push({
        id: `phase-saturation-${phase}`,
        type: "warning",
        entity: "tasks",
        entityId: `Phase ${phase}`,
        message: `Phase ${phase} is oversaturated: requires ${required} slots but only ${available} available`,
        suggestion: "Add more workers to this phase or redistribute tasks to other phases",
      })
    }
  }
}

// 11. Skill-coverage matrix validation
async function validateSkillCoverage(workersData: WorkerData[], tasksData: TaskData[], errors: ValidationError[]) {
  const availableSkills = new Set<string>()

  for (const worker of workersData) {
    for (const skill of worker.Skills) {
      availableSkills.add(skill)
    }
  }

  for (const task of tasksData) {
    for (const skill of task.RequiredSkills) {
      if (!availableSkills.has(skill)) {
        errors.push({
          id: `task-${task.TaskID}-missing-skill-${skill}`,
          type: "warning",
          entity: "tasks",
          entityId: task.TaskID,
          field: "RequiredSkills",
          message: `No worker has the required skill "${skill}"`,
          suggestion: "Add a worker with this skill or remove it from task requirements",
        })
      }
    }
  }
}

// 12. Max-concurrency feasibility validation
async function validateMaxConcurrencyFeasibility(
  workersData: WorkerData[],
  tasksData: TaskData[],
  errors: ValidationError[],
) {
  for (const task of tasksData) {
    // Count qualified workers for this task
    const qualifiedWorkers = workersData.filter((worker) =>
      task.RequiredSkills.every((skill) => worker.Skills.includes(skill)),
    )

    if (task.MaxConcurrent > qualifiedWorkers.length) {
      errors.push({
        id: `task-${task.TaskID}-infeasible-concurrency`,
        type: "warning",
        entity: "tasks",
        entityId: task.TaskID,
        field: "MaxConcurrent",
        message: `Max concurrent (${task.MaxConcurrent}) exceeds qualified workers (${qualifiedWorkers.length})`,
        suggestion: "Reduce max concurrent value or add more qualified workers",
      })
    }

    // Check if qualified workers have availability in preferred phases
    if (task.PreferredPhases.length > 0) {
      const availableWorkers = qualifiedWorkers.filter((worker) =>
        worker.AvailableSlots.some((slot) => task.PreferredPhases.includes(slot)),
      )

      if (task.MaxConcurrent > availableWorkers.length) {
        errors.push({
          id: `task-${task.TaskID}-infeasible-phase-concurrency`,
          type: "warning",
          entity: "tasks",
          entityId: task.TaskID,
          message: `Max concurrent (${task.MaxConcurrent}) exceeds available qualified workers (${availableWorkers.length}) in preferred phases`,
          suggestion: "Adjust preferred phases, reduce max concurrent, or add more qualified workers",
        })
      }
    }
  }
}
