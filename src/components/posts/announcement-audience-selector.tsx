"use client"

import { Globe, User, Users, Users2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface AudienceOption {
  value: string
  label: string
  description: string
  icon: React.ElementType
}

const audienceOptions: AudienceOption[] = [
  {
    value: "class_only",
    label: "Everyone in this class",
    description: "Students and parents in the selected class",
    icon: Users,
  },
  {
    value: "students_only",
    label: "Students only",
    description: "Only students should see this announcement",
    icon: User,
  },
  {
    value: "parents_only",
    label: "Parents only",
    description: "Only parents should see this announcement",
    icon: Users2,
  },
  {
    value: "everyone",
    label: "Everyone",
    description: "Visible to the full intended audience",
    icon: Globe,
  },
]

interface AnnouncementAudienceSelectorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  showClassOnly?: boolean
}

export function AnnouncementAudienceSelector({
  value,
  onChange,
  disabled = false,
  showClassOnly = true,
}: AnnouncementAudienceSelectorProps) {
  const options = showClassOnly
    ? audienceOptions
    : audienceOptions.filter((option) => option.value !== "class_only")

  const selectedOption = options.find((option) => option.value === value)

  return (
    <div className="space-y-2">
      <Label>Audience</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Select audience" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => {
            const Icon = option.icon
            return (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span>{option.label}</span>
                </div>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
      {selectedOption && (
        <p className="text-xs text-muted-foreground">
          {selectedOption.description}
        </p>
      )}
    </div>
  )
}
