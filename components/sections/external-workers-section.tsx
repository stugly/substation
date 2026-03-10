"use client";

import { UserCog, Plus, Trash2 } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { SectionLabel } from "../ui/section-label";
import { Input } from "../ui/input";

interface ExternalWorker {
  id: string;
  company: string;
  workDate: string;
  workType: string;
  location: string;
  detail: string;
}

interface ExternalWorkersSectionProps {
  workers: ExternalWorker[];
  onAddWorker: () => void;
  onRemoveWorker: (id: string) => void;
  onUpdateWorker: (
    id: string,
    field: keyof ExternalWorker,
    value: string
  ) => void;
}

export function ExternalWorkersSection({
  workers,
  onAddWorker,
  onRemoveWorker,
  onUpdateWorker,
}: ExternalWorkersSectionProps) {
  return (
    <Card>
      <SectionLabel icon={UserCog} number={8}>
        การปฏิบัติงานของบุคคลภายนอก
      </SectionLabel>

      <div className="mt-3 space-y-3">
        {workers.map((worker, index) => (
          <div
            key={worker.id}
            className="p-3 bg-muted/50 rounded-xl border border-border"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-foreground">
                รายการที่ {index + 1}
              </span>
              <button
                type="button"
                onClick={() => onRemoveWorker(worker.id)}
                className="text-destructive hover:bg-destructive/10 p-1 rounded-lg transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={worker.company}
                onChange={(e) =>
                  onUpdateWorker(worker.id, "company", e.target.value)
                }
                placeholder="ชื่อบริษัท/ผู้รับเหมา"
              />
              <Input
                type="date"
                value={worker.workDate}
                onChange={(e) =>
                  onUpdateWorker(worker.id, "workDate", e.target.value)
                }
              />
              <Input
                value={worker.workType}
                onChange={(e) =>
                  onUpdateWorker(worker.id, "workType", e.target.value)
                }
                placeholder="ประเภทงาน"
              />
              <Input
                value={worker.location}
                onChange={(e) =>
                  onUpdateWorker(worker.id, "location", e.target.value)
                }
                placeholder="สถานที่"
              />
              <div className="col-span-2">
                <Input
                  value={worker.detail}
                  onChange={(e) =>
                    onUpdateWorker(worker.id, "detail", e.target.value)
                  }
                  placeholder="รายละเอียด"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button variant="add" className="w-full mt-3" onClick={onAddWorker}>
        <Plus className="h-4 w-4 mr-1" />
        เพิ่มรายการปฏิบัติงาน
      </Button>
    </Card>
  );
}
