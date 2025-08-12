"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Trash2, Edit3, Save, X, Lightbulb, Download, Wand2 } from "lucide-react"
import type {  WorkerData, TaskData, BusinessRule } from "@/types/data"

interface RuleBuilderProps {
  workersData: WorkerData[]
  tasksData: TaskData[]
}

export function RuleBuilder({ workersData, tasksData }: RuleBuilderProps) {
  const [rules, setRules] = useState<BusinessRule[]>([])
  const [activeTab, setActiveTab] = useState<"create" | "manage" | "natural">("create")
  const [editingRule, setEditingRule] = useState<BusinessRule | null>(null)
  const [newRule, setNewRule] = useState<Partial<BusinessRule>>({
    type: "coRun",
    name: "",
    description: "",
    parameters: {},
    active: true,
  })
  const [naturalLanguageInput, setNaturalLanguageInput] = useState("")
  const [isProcessingNL, setIsProcessingNL] = useState(false)

  const ruleTypes = [
    { value: "coRun", label: "Co-Run Tasks", description: "Tasks that must run together" },
    { value: "slotRestriction", label: "Slot Restriction", description: "Limit shared slots between groups" },
    { value: "loadLimit", label: "Load Limit", description: "Maximum workload per worker group" },
    { value: "phaseWindow", label: "Phase Window", description: "Restrict tasks to specific phases" },
    { value: "patternMatch", label: "Pattern Match", description: "Rules based on regex patterns" },
    { value: "precedenceOverride", label: "Precedence Override", description: "Priority-based rule ordering" },
  ]

  const handleCreateRule = () => {
    if (!newRule.name || !newRule.type) return

    const rule: BusinessRule = {
      id: `rule_${Date.now()}`,
      type: newRule.type as BusinessRule["type"],
      name: newRule.name,
      description: newRule.description || "",
      parameters: newRule.parameters || {},
      active: newRule.active ?? true,
    }

    setRules([...rules, rule])
    setNewRule({
      type: "coRun",
      name: "",
      description: "",
      parameters: {},
      active: true,
    })
  }

  const handleUpdateRule = (updatedRule: BusinessRule) => {
    setRules(rules.map((rule) => (rule.id === updatedRule.id ? updatedRule : rule)))
    setEditingRule(null)
  }

  const handleDeleteRule = (ruleId: string) => {
    setRules(rules.filter((rule) => rule.id !== ruleId))
  }

  const handleToggleRule = (ruleId: string) => {
    setRules(rules.map((rule) => (rule.id === ruleId ? { ...rule, active: !rule.active } : rule)))
  }

  const processNaturalLanguage = async () => {
    if (!naturalLanguageInput.trim()) return

    setIsProcessingNL(true)

    // Simulate AI processing - in real implementation, this would call an AI service
    setTimeout(() => {
      const suggestedRule = parseNaturalLanguageToRule(naturalLanguageInput)
      if (suggestedRule) {
        setNewRule(suggestedRule)
        setActiveTab("create")
      }
      setIsProcessingNL(false)
    }, 1500)
  }

  const parseNaturalLanguageToRule = (input: string): Partial<BusinessRule> | null => {
    const lowerInput = input.toLowerCase()

    // Co-run detection
    if (lowerInput.includes("together") || lowerInput.includes("same time") || lowerInput.includes("co-run")) {
      const taskMatches = input.match(/task[s]?\s+([A-Z0-9_,\s]+)/i)
      const tasks = taskMatches ? taskMatches[1].split(/[,\s]+/).filter((t) => t.trim()) : []

      return {
        type: "coRun",
        name: `Co-run: ${tasks.join(", ")}`,
        description: `Tasks ${tasks.join(", ")} must run together`,
        parameters: { tasks },
      }
    }

    // Load limit detection
    if (lowerInput.includes("load") || lowerInput.includes("capacity") || lowerInput.includes("maximum")) {
      const numberMatch = input.match(/(\d+)/)
      const groupMatch = input.match(/group\s+(\w+)/i)

      return {
        type: "loadLimit",
        name: `Load limit: ${groupMatch?.[1] || "workers"}`,
        description: `Maximum ${numberMatch?.[1] || "X"} tasks per phase for ${groupMatch?.[1] || "worker group"}`,
        parameters: {
          workerGroup: groupMatch?.[1] || "",
          maxSlotsPerPhase: Number.parseInt(numberMatch?.[1] || "1"),
        },
      }
    }

    // Phase window detection
    if (lowerInput.includes("phase") || lowerInput.includes("timing")) {
      const taskMatch = input.match(/task\s+(\w+)/i)
      const phaseMatches = input.match(/phase[s]?\s+([0-9,\s-]+)/i)

      return {
        type: "phaseWindow",
        name: `Phase restriction: ${taskMatch?.[1] || "task"}`,
        description: `Restrict ${taskMatch?.[1] || "task"} to specific phases`,
        parameters: {
          taskId: taskMatch?.[1] || "",
          allowedPhases:
            phaseMatches?.[1]
              ?.split(/[,\s-]+/)
              .map((p) => Number.parseInt(p.trim()))
              .filter((p) => !isNaN(p)) || [],
        },
      }
    }

    return null
  }

  const exportRulesConfig = () => {
    const config = {
      rules: rules.filter((rule) => rule.active),
      exportDate: new Date().toISOString(),
      totalRules: rules.length,
      activeRules: rules.filter((rule) => rule.active).length,
    }

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "rules-config.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  const RuleForm = ({
    rule,
    onSave,
    onCancel,
  }: {
    rule: Partial<BusinessRule>
    onSave: (rule: BusinessRule) => void
    onCancel: () => void
  }) => {
    const [formData, setFormData] = useState(rule)

    const handleSave = () => {
      if (!formData.name || !formData.type) return

      onSave({
        id: formData.id || `rule_${Date.now()}`,
        type: formData.type as BusinessRule["type"],
        name: formData.name,
        description: formData.description || "",
        parameters: formData.parameters || {},
        active: formData.active ?? true,
      })
    }

    return (
      <div className="space-y-4 p-4 border rounded-lg">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="rule-name">Rule Name</Label>
            <Input
              id="rule-name"
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter rule name"
            />
          </div>
          <div>
            <Label htmlFor="rule-type">Rule Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value as BusinessRule["type"] })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select rule type" />
              </SelectTrigger>
              <SelectContent>
                {ruleTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs text-muted-foreground">{type.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="rule-description">Description</Label>
          <Textarea
            id="rule-description"
            value={formData.description || ""}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe what this rule does"
            rows={2}
          />
        </div>

        {/* Rule-specific parameters */}
        {formData.type === "coRun" && (
          <div>
            <Label>Co-Run Tasks</Label>
            <Select
              onValueChange={(taskId) => {
                const currentTasks = formData.parameters?.tasks || []
                if (!currentTasks.includes(taskId)) {
                  setFormData({
                    ...formData,
                    parameters: { ...formData.parameters, tasks: [...currentTasks, taskId] },
                  })
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Add tasks to co-run group" />
              </SelectTrigger>
              <SelectContent>
                {tasksData.map((task) => (
                  <SelectItem key={task.TaskID} value={task.TaskID}>
                    {task.TaskName} ({task.TaskID})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-1 mt-2">
              {(formData.parameters?.tasks || []).map((taskId: string) => (
                <Badge key={taskId} variant="secondary" className="flex items-center gap-1">
                  {taskId}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => {
                      const newTasks = (formData.parameters?.tasks || []).filter((t: string) => t !== taskId)
                      setFormData({
                        ...formData,
                        parameters: { ...formData.parameters, tasks: newTasks },
                      })
                    }}
                  />
                </Badge>
              ))}
            </div>
          </div>
        )}

        {formData.type === "loadLimit" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Worker Group</Label>
              <Select
                value={formData.parameters?.workerGroup || ""}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    parameters: { ...formData.parameters, workerGroup: value },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select worker group" />
                </SelectTrigger>
                <SelectContent>
                  {[...new Set(workersData.map((w) => w.WorkerGroup))].map((group) => (
                    <SelectItem key={group} value={group}>
                      {group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Max Slots Per Phase</Label>
              <Input
                type="number"
                value={formData.parameters?.maxSlotsPerPhase || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    parameters: { ...formData.parameters, maxSlotsPerPhase: Number.parseInt(e.target.value) },
                  })
                }
                placeholder="Enter max slots"
              />
            </div>
          </div>
        )}

        {formData.type === "phaseWindow" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Task</Label>
              <Select
                value={formData.parameters?.taskId || ""}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    parameters: { ...formData.parameters, taskId: value },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select task" />
                </SelectTrigger>
                <SelectContent>
                  {tasksData.map((task) => (
                    <SelectItem key={task.TaskID} value={task.TaskID}>
                      {task.TaskName} ({task.TaskID})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Allowed Phases (comma-separated)</Label>
              <Input
                value={(formData.parameters?.allowedPhases || []).join(", ")}
                onChange={(e) => {
                  const phases = e.target.value
                    .split(",")
                    .map((p) => Number.parseInt(p.trim()))
                    .filter((p) => !isNaN(p))
                  setFormData({
                    ...formData,
                    parameters: { ...formData.parameters, allowedPhases: phases },
                  })
                }}
                placeholder="e.g., 1, 2, 3"
              />
            </div>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <Switch
            checked={formData.active ?? true}
            onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
          />
          <Label>Rule is active</Label>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            Save Rule
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Business Rules Builder</CardTitle>
              <CardDescription>
                Create and manage business rules for task allocation and resource management
              </CardDescription>
            </div>
            <Button onClick={exportRulesConfig} variant="outline" className="flex items-center gap-2 bg-transparent">
              <Download className="w-4 h-4" />
              Export Rules Config
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create">Create Rules</TabsTrigger>
          <TabsTrigger value="manage">Manage Rules ({rules.length})</TabsTrigger>
          <TabsTrigger value="natural">Natural Language</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Rule</CardTitle>
              <CardDescription>Build structured business rules using the form below</CardDescription>
            </CardHeader>
            <CardContent>
              <RuleForm
                rule={newRule}
                onSave={handleCreateRule}
                onCancel={() =>
                  setNewRule({
                    type: "coRun",
                    name: "",
                    description: "",
                    parameters: {},
                    active: true,
                  })
                }
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-4">
          {rules.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <Alert>
                  <Lightbulb className="w-4 h-4" />
                  <AlertDescription>
                    No rules created yet. Use the &quot;Create Rules&quot; tab to add your first business rule.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {rules.map((rule) => (
                <Card key={rule.id}>
                  <CardContent className="pt-6">
                    {editingRule?.id === rule.id ? (
                      <RuleForm rule={editingRule} onSave={handleUpdateRule} onCancel={() => setEditingRule(null)} />
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{rule.name}</h3>
                              <Badge variant={rule.active ? "default" : "secondary"}>
                                {rule.active ? "Active" : "Inactive"}
                              </Badge>
                              <Badge variant="outline">{ruleTypes.find((t) => t.value === rule.type)?.label}</Badge>
                            </div>
                            {rule.description && <p className="text-sm text-muted-foreground">{rule.description}</p>}
                            <div className="text-xs text-muted-foreground">
                              Parameters: {JSON.stringify(rule.parameters)}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => handleToggleRule(rule.id)}>
                              {rule.active ? "Deactivate" : "Activate"}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingRule(rule)}>
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteRule(rule.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="natural" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="w-5 h-5" />
                Natural Language Rule Creation
              </CardTitle>
              <CardDescription>
                Describe your business rule in plain English and let AI convert it to a structured rule
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="natural-input">Describe your rule</Label>
                <Textarea
                  id="natural-input"
                  value={naturalLanguageInput}
                  onChange={(e) => setNaturalLanguageInput(e.target.value)}
                  placeholder="e.g., 'Tasks T1 and T2 must run together' or 'Workers in sales group can only handle 3 tasks per phase' or 'Task T5 should only run in phases 2 and 3'"
                  rows={3}
                />
              </div>

              <Button
                onClick={processNaturalLanguage}
                disabled={!naturalLanguageInput.trim() || isProcessingNL}
                className="flex items-center gap-2"
              >
                <Wand2 className="w-4 h-4" />
                {isProcessingNL ? "Processing..." : "Convert to Rule"}
              </Button>

              <Alert>
                <Lightbulb className="w-4 h-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="font-medium">Example phrases:</div>
                    <ul className="text-sm space-y-1">
                      <li>• `Tasks A, B, and C must run together`</li>
                      <li>• `Sales group workers maximum 5 tasks per phase`</li>
                      <li>• `Task X should only run in phases 1, 2, and 4`</li>
                      <li>• `Workers in team Alpha can handle at most 3 concurrent tasks`</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
