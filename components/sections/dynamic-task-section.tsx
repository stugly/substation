"use client";

import { LucideIcon, Plus } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { SectionLabel } from "../ui/section-label";
import { DynamicRow } from "../ui/dynamic-row";
import { Input } from "../ui/input";

interface Task {
  id: string;
  detail: string;
}

interface DynamicTaskSectionProps {
  icon: LucideIcon;
  number: number;
  title: string;
  tasks: Task[];
  onAddTask: () => void;
  onRemoveTask: (id: string) => void;
  onUpdateTask: (id: string, detail: string) => void;
  placeholder?: string;
  addButtonText: string;
}

export function DynamicTaskSection({
  icon,
  number,
  title,
  tasks,
  onAddTask,
  onRemoveTask,
  onUpdateTask,
  placeholder = "...",
  addButtonText,
}: DynamicTaskSectionProps) {
  return (
    <Card>
      <SectionLabel icon={icon} number={number}>
        {title}
      </SectionLabel>

      <div className="mt-3 space-y-2">
        {tasks.map((task, index) => (
          <DynamicRow
            key={task.id}
            index={index + 1}
            onRemove={() => onRemoveTask(task.id)}
          >
            <Input
              value={task.detail}
              onChange={(e) => onUpdateTask(task.id, e.target.value)}
              placeholder={placeholder}
              className="flex-1"
            />
          </DynamicRow>
        ))}
      </div>

      <Button variant="add" className="w-full mt-3" onClick={onAddTask}>
        <Plus className="h-4 w-4 mr-1" />
        {addButtonText}
      </Button>
    </Card>
  );
}
