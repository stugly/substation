"use client";

import { ShoppingCart, Plus, Trash2 } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { SectionLabel } from "../ui/section-label";
import { Input } from "../ui/input";

interface ProcurementItem {
  id: string;
  itemName: string;
  quantity: string;
  budget: string;
  status: string;
  detail: string;
}

interface ProcurementSectionProps {
  procurements: ProcurementItem[];
  onAddProcurement: () => void;
  onRemoveProcurement: (id: string) => void;
  onUpdateProcurement: (
    id: string,
    field: keyof ProcurementItem,
    value: string
  ) => void;
}

export function ProcurementSection({
  procurements,
  onAddProcurement,
  onRemoveProcurement,
  onUpdateProcurement,
}: ProcurementSectionProps) {
  return (
    <Card>
      <SectionLabel icon={ShoppingCart} number={5}>
        งานจัดซื้อจัดจ้าง
      </SectionLabel>

      <div className="mt-3 space-y-3">
        {procurements.map((item, index) => (
          <div
            key={item.id}
            className="p-3 bg-muted/50 rounded-xl border border-border"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-foreground">
                รายการที่ {index + 1}
              </span>
              <button
                type="button"
                onClick={() => onRemoveProcurement(item.id)}
                className="text-destructive hover:bg-destructive/10 p-1 rounded-lg transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={item.itemName}
                onChange={(e) =>
                  onUpdateProcurement(item.id, "itemName", e.target.value)
                }
                placeholder="ชื่อรายการ"
              />
              <Input
                value={item.quantity}
                onChange={(e) =>
                  onUpdateProcurement(item.id, "quantity", e.target.value)
                }
                placeholder="จำนวน"
              />
              <Input
                value={item.budget}
                onChange={(e) =>
                  onUpdateProcurement(item.id, "budget", e.target.value)
                }
                placeholder="งบประมาณ"
              />
              <Input
                value={item.status}
                onChange={(e) =>
                  onUpdateProcurement(item.id, "status", e.target.value)
                }
                placeholder="สถานะ"
              />
              <div className="col-span-2">
                <Input
                  value={item.detail}
                  onChange={(e) =>
                    onUpdateProcurement(item.id, "detail", e.target.value)
                  }
                  placeholder="รายละเอียด"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button variant="add" className="w-full mt-3" onClick={onAddProcurement}>
        <Plus className="h-4 w-4 mr-1" />
        เพิ่มรายการจัดซื้อ
      </Button>
    </Card>
  );
}
