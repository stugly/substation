"use client";

import { Users, Camera } from "lucide-react";
import { SectionLabel } from "../ui/section-label";
import { cn } from "@/lib/utils";

interface Staff {
  uid: string;
  name: string;
  unit: string;
}

interface AttendanceSectionProps {
  unitStaff: Staff[];
  regionalStaff: Staff[];
  selectedAttendees: string[];
  onToggleAttendee: (uid: string) => void;
  images: File[];
  onImagesChange: (files: File[]) => void;
}

export function AttendanceSection({
  unitStaff,
  regionalStaff,
  selectedAttendees,
  onToggleAttendee,
  images,
  onImagesChange,
}: AttendanceSectionProps) {
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      onImagesChange([...images, ...newFiles]);
    }
  };

  const removeImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="border-t border-border pt-4">
        <SectionLabel icon={Users}>ผู้เข้าประชุม</SectionLabel>

        <div className="grid grid-cols-2 gap-4 mt-3">
          {/* Unit Staff Column */}
          <div className="bg-muted/50 p-3 rounded-lg border border-border">
            <div className="text-xs text-muted-foreground font-semibold pb-2 mb-2 border-b border-dashed border-border">
              เจ้าหน้าที่ในสังกัด
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {unitStaff.map((staff) => (
                <label
                  key={staff.uid}
                  className={cn(
                    "flex items-center gap-2 text-sm cursor-pointer transition-colors",
                    selectedAttendees.includes(staff.uid)
                      ? "text-primary font-semibold"
                      : "text-foreground"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedAttendees.includes(staff.uid)}
                    onChange={() => onToggleAttendee(staff.uid)}
                    className="rounded"
                  />
                  <span>{staff.name}</span>
                </label>
              ))}
              {unitStaff.length === 0 && (
                <span className="text-xs text-muted-foreground">
                  ไม่พบรายชื่อ
                </span>
              )}
            </div>
          </div>

          {/* Regional Staff Column */}
          <div className="bg-muted/50 p-3 rounded-lg border border-border">
            <div className="text-xs text-muted-foreground font-semibold pb-2 mb-2 border-b border-dashed border-border">
              เจ้าหน้าที่ ผจฟ.1
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {regionalStaff.map((staff) => (
                <label
                  key={staff.uid}
                  className={cn(
                    "flex items-center gap-2 text-sm cursor-pointer transition-colors",
                    selectedAttendees.includes(staff.uid)
                      ? "text-primary font-semibold"
                      : "text-foreground"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedAttendees.includes(staff.uid)}
                    onChange={() => onToggleAttendee(staff.uid)}
                    className="rounded"
                  />
                  <span>{staff.name}</span>
                </label>
              ))}
              {regionalStaff.length === 0 && (
                <span className="text-xs text-muted-foreground">
                  ไม่พบรายชื่อ
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Image Upload */}
      <div className="border-t border-border pt-4">
        <SectionLabel icon={Camera}>รูปภาพประกอบ</SectionLabel>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageSelect}
          className="mt-2 text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary-dark cursor-pointer"
        />
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {images.map((file, index) => (
              <div key={index} className="relative group">
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Preview ${index + 1}`}
                  className="w-16 h-16 object-cover rounded-lg border border-border"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
