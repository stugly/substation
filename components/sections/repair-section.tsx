"use client";

import { Wrench, Plus, Trash2 } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { SectionLabel } from "../ui/section-label";
import { Input } from "../ui/input";

interface RepairTask {
  id: string;
  equipmentCode: string;
  failureDate: string;
  reportDate: string;
  status: string;
  detail: string;
}

interface RepairSectionProps {
  repairs: RepairTask[];
  onAddRepair: () => void;
  onRemoveRepair: (id: string) => void;
  onUpdateRepair: (id: string, field: keyof RepairTask, value: string) => void;
}

export function RepairSection({
  repairs,
  onAddRepair,
  onRemoveRepair,
  onUpdateRepair,
}: RepairSectionProps) {
  return (
    <Card>
      <SectionLabel icon={Wrench} number={4}>
        รายงานอุปกรณ์ชำรุด
      </SectionLabel>

      <div className="mt-3 space-y-3">
        {repairs.map((repair, index) => (
          <div
            key={repair.id}
            className="p-3 bg-muted/50 rounded-xl border border-border"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-foreground">
                รายการที่ {index + 1}
              </span>
              <button
                type="button"
                onClick={() => onRemoveRepair(repair.id)}
                className="text-destructive hover:bg-destructive/10 p-1 rounded-lg transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={repair.equipmentCode}
                onChange={(e) =>
                  onUpdateRepair(repair.id, "equipmentCode", e.target.value)
                }
                placeholder="รหัส EQ"
                className="text-xs"
              />
              <Input
                type="date"
                value={repair.failureDate}
                onChange={(e) =>
                  onUpdateRepair(repair.id, "failureDate", e.target.value)
                }
                placeholder="วันที่ชำรุด"
                className="text-xs"
              />
              <Input
                type="date"
                value={repair.reportDate}
                onChange={(e) =>
                  onUpdateRepair(repair.id, "reportDate", e.target.value)
                }
                placeholder="วันที่รายงาน"
                className="text-xs"
              />
              <Input
                value={repair.status}
                onChange={(e) =>
                  onUpdateRepair(repair.id, "status", e.target.value)
                }
                placeholder="สถานะ"
                className="text-xs"
              />
              <div className="col-span-2">
                <Input
                  value={repair.detail}
                  onChange={(e) =>
                    onUpdateRepair(repair.id, "detail", e.target.value)
                  }
                  placeholder="รายละเอียด"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button variant="add" className="w-full mt-3" onClick={onAddRepair}>
        <Plus className="h-4 w-4 mr-1" />
        เพิ่มรายการชำรุด
      </Button>
    </Card>
  );
}
