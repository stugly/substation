"use client";

import { Input } from "../ui/input";
import { Select } from "../ui/select";

interface BasicInfoSectionProps {
  meetingDate: string;
  setMeetingDate: (value: string) => void;
  startTime: string;
  setStartTime: (value: string) => void;
  location: string;
  setLocation: (value: string) => void;
  method: string;
  setMethod: (value: string) => void;
  locations: { value: string; label: string }[];
}

export function BasicInfoSection({
  meetingDate,
  setMeetingDate,
  startTime,
  setStartTime,
  location,
  setLocation,
  method,
  setMethod,
  locations,
}: BasicInfoSectionProps) {
  return (
    <div>
      <div className="text-center pb-4 border-b-2 border-primary mb-4">
        <h3 className="text-base font-semibold text-foreground">
          รายงานการประชุมประจำเดือน
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          type="date"
          label="วันที่ประชุม"
          id="meeting_date"
          value={meetingDate}
          onChange={(e) => setMeetingDate(e.target.value)}
          required
        />
        <Input
          type="time"
          label="เวลา"
          id="start_time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          required
        />
        <Select
          label="สถานที่ประชุม"
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          options={locations}
          required
        />
        <Select
          label="วิธีการประชุม"
          id="method"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          options={[
            { value: "On-site", label: "On-site" },
            { value: "Online", label: "Online" },
          ]}
        />
      </div>
    </div>
  );
}
