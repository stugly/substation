"use client";

import { useState, useCallback } from "react";
import {
  Pin,
  CalendarCheck,
  Lightbulb,
  Sparkles,
  MoreHorizontal,
  Check,
  Loader2,
} from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { BasicInfoSection } from "./sections/basic-info-section";
import { AttendanceSection } from "./sections/attendance-section";
import { DynamicTaskSection } from "./sections/dynamic-task-section";
import { PowerGridSection } from "./sections/power-grid-section";
import { RepairSection } from "./sections/repair-section";
import { ProcurementSection } from "./sections/procurement-section";
import { CleaningWeedSection } from "./sections/cleaning-weed-section";
import { ExternalWorkersSection } from "./sections/external-workers-section";
import { AssetsSection } from "./sections/assets-section";
import { LeaveSummarySection } from "./sections/leave-summary-section";
import { SecuritySection } from "./sections/security-section";
import { getCurrentDateTimeString } from "@/lib/utils";

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Demo data
const demoUnitStaff = [
  { uid: "1", name: "นายสมชาย ใจดี", unit: "สฟฟ.1" },
  { uid: "2", name: "นายสมศักดิ์ รักงาน", unit: "สฟฟ.1" },
  { uid: "3", name: "นางสาวสมหญิง มานะ", unit: "สฟฟ.1" },
  { uid: "4", name: "นายวิชัย สุขใจ", unit: "สฟฟ.1" },
];

const demoRegionalStaff = [
  { uid: "5", name: "นายประเสริฐ ผู้จัดการ", unit: "ผจฟ.1" },
  { uid: "6", name: "นางวันดี หัวหน้า", unit: "ผจฟ.1" },
];

const demoLocations = [
  { value: "", label: "-- เลือกสถานที่ --" },
  { value: "สฟฟ.บ้านนา", label: "สฟฟ.บ้านนา" },
  { value: "สฟฟ.ศรีราชา", label: "สฟฟ.ศรีราชา" },
  { value: "สฟฟ.แหลมฉบัง", label: "สฟฟ.แหลมฉบัง" },
  { value: "สำนักงาน", label: "สำนักงาน" },
];

const demoStations = [
  { value: "", label: "-- เลือกสถานี --" },
  { value: "สฟฟ.บ้านนา", label: "สฟฟ.บ้านนา" },
  { value: "สฟฟ.ศรีราชา", label: "สฟฟ.ศรีราชา" },
  { value: "สฟฟ.แหลมฉบัง", label: "สฟฟ.แหลมฉบัง" },
];

export function ReportForm() {
  const { date, time } = getCurrentDateTimeString();

  // Basic Info State
  const [meetingDate, setMeetingDate] = useState(date);
  const [startTime, setStartTime] = useState(time);
  const [location, setLocation] = useState("");
  const [method, setMethod] = useState("On-site");

  // Attendance State
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [images, setImages] = useState<File[]>([]);

  // Dynamic Sections State
  const [assignments, setAssignments] = useState<
    { id: string; detail: string }[]
  >([]);
  const [plans, setPlans] = useState<{ id: string; detail: string }[]>([]);
  const [powerStations, setPowerStations] = useState<
    { id: string; station: string; detail: string }[]
  >([]);
  const [repairs, setRepairs] = useState<
    {
      id: string;
      equipmentCode: string;
      failureDate: string;
      reportDate: string;
      status: string;
      detail: string;
    }[]
  >([]);
  const [procurements, setProcurements] = useState<
    {
      id: string;
      itemName: string;
      quantity: string;
      budget: string;
      status: string;
      detail: string;
    }[]
  >([]);
  const [externalWorkers, setExternalWorkers] = useState<
    {
      id: string;
      company: string;
      workDate: string;
      workType: string;
      location: string;
      detail: string;
    }[]
  >([]);
  const [assets, setAssets] = useState<
    {
      id: string;
      assetCode: string;
      assetName: string;
      status: string;
      detail: string;
    }[]
  >([]);
  const [kmItems, setKmItems] = useState<{ id: string; detail: string }[]>([]);
  const [ideas, setIdeas] = useState<{ id: string; detail: string }[]>([]);
  const [otherItems, setOtherItems] = useState<{ id: string; detail: string }[]>(
    []
  );

  // Fixed Tables State
  const [cleaningReports, setCleaningReports] = useState([
    { date: "", detail: "" },
    { date: "", detail: "" },
    { date: "", detail: "" },
    { date: "", detail: "" },
  ]);

  const [weedReports, setWeedReports] = useState([
    { date: "", detail: "" },
    { date: "", detail: "" },
    { date: "", detail: "" },
    { date: "", detail: "" },
    { date: "", detail: "" },
    { date: "", detail: "" },
  ]);

  const [leaveRecords] = useState(
    demoUnitStaff.map((s) => ({
      name: s.name,
      sick: 0,
      personal: 0,
      vacation: 0,
      substitute: 0,
      notes: "",
    }))
  );

  const [leaveData, setLeaveData] = useState(leaveRecords);

  const [securityChecks] = useState(
    demoStations.slice(1).map((s) => ({
      station: s.label,
      detail: "",
    }))
  );

  const [securityData, setSecurityData] = useState(securityChecks);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toggle attendee selection
  const toggleAttendee = useCallback((uid: string) => {
    setSelectedAttendees((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  }, []);

  // Submit handler
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));
      alert("บันทึกข้อมูลสำเร็จ!");
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className="space-y-4"
    >
      {/* Basic Info + Attendance */}
      <Card>
        <BasicInfoSection
          meetingDate={meetingDate}
          setMeetingDate={setMeetingDate}
          startTime={startTime}
          setStartTime={setStartTime}
          location={location}
          setLocation={setLocation}
          method={method}
          setMethod={setMethod}
          locations={demoLocations}
        />

        <AttendanceSection
          unitStaff={demoUnitStaff}
          regionalStaff={demoRegionalStaff}
          selectedAttendees={selectedAttendees}
          onToggleAttendee={toggleAttendee}
          images={images}
          onImagesChange={setImages}
        />
      </Card>

      {/* Section 1: Assignments */}
      <DynamicTaskSection
        icon={Pin}
        number={1}
        title="งานที่ได้รับมอบหมาย"
        tasks={assignments}
        onAddTask={() =>
          setAssignments([...assignments, { id: generateId(), detail: "" }])
        }
        onRemoveTask={(id) =>
          setAssignments(assignments.filter((t) => t.id !== id))
        }
        onUpdateTask={(id, detail) =>
          setAssignments(
            assignments.map((t) => (t.id === id ? { ...t, detail } : t))
          )
        }
        placeholder="รายละเอียดงาน..."
        addButtonText="เพิ่มงานมอบหมาย"
      />

      {/* Section 2: Monthly Plans */}
      <DynamicTaskSection
        icon={CalendarCheck}
        number={2}
        title="แผนงานประจำเดือน"
        tasks={plans}
        onAddTask={() =>
          setPlans([...plans, { id: generateId(), detail: "" }])
        }
        onRemoveTask={(id) => setPlans(plans.filter((t) => t.id !== id))}
        onUpdateTask={(id, detail) =>
          setPlans(plans.map((t) => (t.id === id ? { ...t, detail } : t)))
        }
        placeholder="รายละเอียดแผนงาน..."
        addButtonText="เพิ่มแผนงาน"
      />

      {/* Section 3: Power Grid Status */}
      <PowerGridSection
        stations={powerStations}
        stationOptions={demoStations}
        onAddStation={() =>
          setPowerStations([
            ...powerStations,
            { id: generateId(), station: "", detail: "" },
          ])
        }
        onRemoveStation={(id) =>
          setPowerStations(powerStations.filter((s) => s.id !== id))
        }
        onUpdateStation={(id, field, value) =>
          setPowerStations(
            powerStations.map((s) =>
              s.id === id ? { ...s, [field]: value } : s
            )
          )
        }
      />

      {/* Section 4: Repair Tasks */}
      <RepairSection
        repairs={repairs}
        onAddRepair={() =>
          setRepairs([
            ...repairs,
            {
              id: generateId(),
              equipmentCode: "",
              failureDate: "",
              reportDate: "",
              status: "",
              detail: "",
            },
          ])
        }
        onRemoveRepair={(id) => setRepairs(repairs.filter((r) => r.id !== id))}
        onUpdateRepair={(id, field, value) =>
          setRepairs(
            repairs.map((r) => (r.id === id ? { ...r, [field]: value } : r))
          )
        }
      />

      {/* Section 5: Procurement */}
      <ProcurementSection
        procurements={procurements}
        onAddProcurement={() =>
          setProcurements([
            ...procurements,
            {
              id: generateId(),
              itemName: "",
              quantity: "",
              budget: "",
              status: "",
              detail: "",
            },
          ])
        }
        onRemoveProcurement={(id) =>
          setProcurements(procurements.filter((p) => p.id !== id))
        }
        onUpdateProcurement={(id, field, value) =>
          setProcurements(
            procurements.map((p) =>
              p.id === id ? { ...p, [field]: value } : p
            )
          )
        }
      />

      {/* Section 6 & 7: Cleaning and Weed Control */}
      <CleaningWeedSection
        cleaningReports={cleaningReports}
        weedReports={weedReports}
        onUpdateCleaning={(index, field, value) => {
          const updated = [...cleaningReports];
          updated[index] = { ...updated[index], [field]: value };
          setCleaningReports(updated);
        }}
        onUpdateWeed={(index, field, value) => {
          const updated = [...weedReports];
          updated[index] = { ...updated[index], [field]: value };
          setWeedReports(updated);
        }}
      />

      {/* Section 8: External Workers */}
      <ExternalWorkersSection
        workers={externalWorkers}
        onAddWorker={() =>
          setExternalWorkers([
            ...externalWorkers,
            {
              id: generateId(),
              company: "",
              workDate: "",
              workType: "",
              location: "",
              detail: "",
            },
          ])
        }
        onRemoveWorker={(id) =>
          setExternalWorkers(externalWorkers.filter((w) => w.id !== id))
        }
        onUpdateWorker={(id, field, value) =>
          setExternalWorkers(
            externalWorkers.map((w) =>
              w.id === id ? { ...w, [field]: value } : w
            )
          )
        }
      />

      {/* Section 9: Assets */}
      <AssetsSection
        assets={assets}
        onAddAsset={() =>
          setAssets([
            ...assets,
            {
              id: generateId(),
              assetCode: "",
              assetName: "",
              status: "",
              detail: "",
            },
          ])
        }
        onRemoveAsset={(id) => setAssets(assets.filter((a) => a.id !== id))}
        onUpdateAsset={(id, field, value) =>
          setAssets(
            assets.map((a) => (a.id === id ? { ...a, [field]: value } : a))
          )
        }
      />

      {/* Section 10: KM */}
      <DynamicTaskSection
        icon={Lightbulb}
        number={10}
        title="การจัดการองค์ความรู้ (KM)"
        tasks={kmItems}
        onAddTask={() =>
          setKmItems([...kmItems, { id: generateId(), detail: "" }])
        }
        onRemoveTask={(id) => setKmItems(kmItems.filter((t) => t.id !== id))}
        onUpdateTask={(id, detail) =>
          setKmItems(kmItems.map((t) => (t.id === id ? { ...t, detail } : t)))
        }
        placeholder="รายละเอียด KM..."
        addButtonText="เพิ่มรายการ KM"
      />

      {/* Section 11: Ideas */}
      <DynamicTaskSection
        icon={Sparkles}
        number={11}
        title="ความคิดสร้างสรรค์"
        tasks={ideas}
        onAddTask={() =>
          setIdeas([...ideas, { id: generateId(), detail: "" }])
        }
        onRemoveTask={(id) => setIdeas(ideas.filter((t) => t.id !== id))}
        onUpdateTask={(id, detail) =>
          setIdeas(ideas.map((t) => (t.id === id ? { ...t, detail } : t)))
        }
        placeholder="รายละเอียดความคิดสร้างสรรค์..."
        addButtonText="เพิ่มรายการความคิดสร้างสรรค์"
      />

      {/* Section 12: Leave Summary */}
      <LeaveSummarySection
        leaveRecords={leaveData}
        onUpdateLeave={(index, field, value) => {
          const updated = [...leaveData];
          updated[index] = { ...updated[index], [field]: value };
          setLeaveData(updated);
        }}
      />

      {/* Section 13: Security Check */}
      <SecuritySection
        securityChecks={securityData}
        onUpdateSecurity={(index, detail) => {
          const updated = [...securityData];
          updated[index] = { ...updated[index], detail };
          setSecurityData(updated);
        }}
      />

      {/* Section 14: Others */}
      <DynamicTaskSection
        icon={MoreHorizontal}
        number={14}
        title="เรื่องอื่นๆ"
        tasks={otherItems}
        onAddTask={() =>
          setOtherItems([...otherItems, { id: generateId(), detail: "" }])
        }
        onRemoveTask={(id) =>
          setOtherItems(otherItems.filter((t) => t.id !== id))
        }
        onUpdateTask={(id, detail) =>
          setOtherItems(
            otherItems.map((t) => (t.id === id ? { ...t, detail } : t))
          )
        }
        placeholder="รายละเอียด..."
        addButtonText="เพิ่มเรื่องอื่นๆ"
      />

      {/* Submit Button */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full mb-12"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            กำลังบันทึก...
          </>
        ) : (
          <>
            <Check className="h-5 w-5 mr-2" />
            บันทึกรายงานทั้งหมด
          </>
        )}
      </Button>
    </form>
  );
}
