"use client";

import { Zap, Plus } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { SectionLabel } from "../ui/section-label";
import { DynamicRow } from "../ui/dynamic-row";
import { Select } from "../ui/select";
import { Input } from "../ui/input";

interface PowerStation {
  id: string;
  station: string;
  detail: string;
}

interface PowerGridSectionProps {
  stations: PowerStation[];
  stationOptions: { value: string; label: string }[];
  onAddStation: () => void;
  onRemoveStation: (id: string) => void;
  onUpdateStation: (id: string, field: "station" | "detail", value: string) => void;
}

export function PowerGridSection({
  stations,
  stationOptions,
  onAddStation,
  onRemoveStation,
  onUpdateStation,
}: PowerGridSectionProps) {
  return (
    <Card>
      <SectionLabel icon={Zap} number={3}>
        สภาพการจ่ายไฟฟ้า
      </SectionLabel>

      <div className="mt-3 space-y-2">
        {stations.map((station, index) => (
          <DynamicRow
            key={station.id}
            index={index + 1}
            onRemove={() => onRemoveStation(station.id)}
          >
            <Select
              value={station.station}
              onChange={(e) => onUpdateStation(station.id, "station", e.target.value)}
              options={stationOptions}
              className="w-40 shrink-0"
            />
            <Input
              value={station.detail}
              onChange={(e) => onUpdateStation(station.id, "detail", e.target.value)}
              placeholder="ปกติ"
              className="flex-1"
            />
          </DynamicRow>
        ))}
      </div>

      <Button variant="add" className="w-full mt-3" onClick={onAddStation}>
        <Plus className="h-4 w-4 mr-1" />
        เพิ่มสถานี
      </Button>
    </Card>
  );
}
