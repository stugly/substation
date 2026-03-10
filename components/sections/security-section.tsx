"use client";

import { Shield } from "lucide-react";
import { Card } from "../ui/card";
import { SectionLabel } from "../ui/section-label";
import { DynamicRow } from "../ui/dynamic-row";
import { Input } from "../ui/input";

interface SecurityCheck {
  station: string;
  detail: string;
}

interface SecuritySectionProps {
  securityChecks: SecurityCheck[];
  onUpdateSecurity: (index: number, detail: string) => void;
}

export function SecuritySection({
  securityChecks,
  onUpdateSecurity,
}: SecuritySectionProps) {
  return (
    <Card>
      <SectionLabel icon={Shield} number={13}>
        รายงานการตรวจสอบ รปภ.
      </SectionLabel>

      <div className="mt-3 space-y-2">
        {securityChecks.map((check, index) => (
          <DynamicRow key={index} index={index + 1} showRemove={false}>
            <div className="w-28 shrink-0 text-sm text-foreground">
              {check.station}
            </div>
            <Input
              value={check.detail}
              onChange={(e) => onUpdateSecurity(index, e.target.value)}
              placeholder="ปกติ"
              className="flex-1"
            />
          </DynamicRow>
        ))}
        {securityChecks.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            ไม่พบรายการสถานี
          </p>
        )}
      </div>
    </Card>
  );
}
