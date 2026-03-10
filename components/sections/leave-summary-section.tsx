"use client";

import { UserX } from "lucide-react";
import { Card } from "../ui/card";
import { SectionLabel } from "../ui/section-label";
import { Input } from "../ui/input";

interface LeaveRecord {
  name: string;
  sick: number;
  personal: number;
  vacation: number;
  substitute: number;
  notes: string;
}

interface LeaveSummarySectionProps {
  leaveRecords: LeaveRecord[];
  onUpdateLeave: (
    index: number,
    field: keyof LeaveRecord,
    value: string | number
  ) => void;
}

export function LeaveSummarySection({
  leaveRecords,
  onUpdateLeave,
}: LeaveSummarySectionProps) {
  return (
    <Card>
      <SectionLabel icon={UserX} number={12} className="mb-3">
        สรุปการลาประจำเดือน
      </SectionLabel>

      <div className="overflow-x-auto -mx-2 px-2">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs text-primary font-semibold p-2 w-[25%]">
                ชื่อ-สกุล
              </th>
              <th className="text-center text-xs text-primary font-semibold p-2 w-[12%]">
                ลาป่วย
              </th>
              <th className="text-center text-xs text-primary font-semibold p-2 w-[12%]">
                ลากิจ
              </th>
              <th className="text-center text-xs text-primary font-semibold p-2 w-[12%]">
                ลาพักผ่อน
              </th>
              <th className="text-center text-xs text-primary font-semibold p-2 w-[12%]">
                ปฏิบัติงานแทน
              </th>
              <th className="text-left text-xs text-primary font-semibold p-2 w-[27%]">
                หมายเหตุ
              </th>
            </tr>
          </thead>
          <tbody>
            {leaveRecords.map((record, index) => (
              <tr key={index} className="border-b border-border/50">
                <td className="p-2 text-foreground">{record.name}</td>
                <td className="p-1">
                  <Input
                    type="number"
                    value={record.sick}
                    onChange={(e) =>
                      onUpdateLeave(index, "sick", parseInt(e.target.value) || 0)
                    }
                    min={0}
                    className="h-8 text-xs text-center"
                  />
                </td>
                <td className="p-1">
                  <Input
                    type="number"
                    value={record.personal}
                    onChange={(e) =>
                      onUpdateLeave(
                        index,
                        "personal",
                        parseInt(e.target.value) || 0
                      )
                    }
                    min={0}
                    className="h-8 text-xs text-center"
                  />
                </td>
                <td className="p-1">
                  <Input
                    type="number"
                    value={record.vacation}
                    onChange={(e) =>
                      onUpdateLeave(
                        index,
                        "vacation",
                        parseInt(e.target.value) || 0
                      )
                    }
                    min={0}
                    className="h-8 text-xs text-center"
                  />
                </td>
                <td className="p-1">
                  <Input
                    type="number"
                    value={record.substitute}
                    onChange={(e) =>
                      onUpdateLeave(
                        index,
                        "substitute",
                        parseInt(e.target.value) || 0
                      )
                    }
                    min={0}
                    className="h-8 text-xs text-center"
                  />
                </td>
                <td className="p-1">
                  <Input
                    value={record.notes}
                    onChange={(e) =>
                      onUpdateLeave(index, "notes", e.target.value)
                    }
                    placeholder="..."
                    className="h-8 text-xs"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
