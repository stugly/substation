"use client";

import { Brush, Leaf } from "lucide-react";
import { Card } from "../ui/card";
import { SectionLabel } from "../ui/section-label";
import { Input } from "../ui/input";
import { getCurrentThaiYear } from "@/lib/utils";

interface CleaningReport {
  date: string;
  detail: string;
}

interface WeedReport {
  date: string;
  detail: string;
}

interface CleaningWeedSectionProps {
  cleaningReports: CleaningReport[];
  weedReports: WeedReport[];
  onUpdateCleaning: (
    index: number,
    field: "date" | "detail",
    value: string
  ) => void;
  onUpdateWeed: (index: number, field: "date" | "detail", value: string) => void;
}

export function CleaningWeedSection({
  cleaningReports,
  weedReports,
  onUpdateCleaning,
  onUpdateWeed,
}: CleaningWeedSectionProps) {
  const currentYear = getCurrentThaiYear();

  return (
    <Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cleaning Report */}
        <div>
          <SectionLabel icon={Brush} number={6} className="mb-3">
            รายงานทำความสะอาด
          </SectionLabel>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left text-xs text-primary font-semibold p-2 w-16">
                    ครั้งที่
                  </th>
                  <th className="text-left text-xs text-primary font-semibold p-2 w-28">
                    วันที่
                  </th>
                  <th className="text-left text-xs text-primary font-semibold p-2">
                    สรุปผล
                  </th>
                </tr>
              </thead>
              <tbody>
                {cleaningReports.map((report, index) => (
                  <tr key={index}>
                    <td className="p-1">
                      <span className="text-muted-foreground">
                        {index + 1}/{currentYear}
                      </span>
                    </td>
                    <td className="p-1">
                      <Input
                        type="date"
                        value={report.date}
                        onChange={(e) =>
                          onUpdateCleaning(index, "date", e.target.value)
                        }
                        className="h-8 text-xs"
                      />
                    </td>
                    <td className="p-1">
                      <Input
                        value={report.detail}
                        onChange={(e) =>
                          onUpdateCleaning(index, "detail", e.target.value)
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
        </div>

        {/* Weed Control Report */}
        <div>
          <SectionLabel icon={Leaf} number={7} className="mb-3">
            รายงานกำจัดวัชพืช
          </SectionLabel>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left text-xs text-primary font-semibold p-2 w-16">
                    ครั้งที่
                  </th>
                  <th className="text-left text-xs text-primary font-semibold p-2 w-28">
                    วันที่
                  </th>
                  <th className="text-left text-xs text-primary font-semibold p-2">
                    สรุปผล
                  </th>
                </tr>
              </thead>
              <tbody>
                {weedReports.map((report, index) => (
                  <tr key={index}>
                    <td className="p-1">
                      <span className="text-muted-foreground">
                        {index + 1}/{currentYear}
                      </span>
                    </td>
                    <td className="p-1">
                      <Input
                        type="date"
                        value={report.date}
                        onChange={(e) =>
                          onUpdateWeed(index, "date", e.target.value)
                        }
                        className="h-8 text-xs"
                      />
                    </td>
                    <td className="p-1">
                      <Input
                        value={report.detail}
                        onChange={(e) =>
                          onUpdateWeed(index, "detail", e.target.value)
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
        </div>
      </div>
    </Card>
  );
}
