"use client";

import { CircleUser } from "lucide-react";
import { Card } from "./ui/card";

interface UserProfileProps {
  name: string;
  unit: string;
  avatarUrl?: string;
}

export function UserProfile({ name, unit, avatarUrl }: UserProfileProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <CircleUser className="w-10 h-10 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">
            สวัสดี, {name}
          </span>
          <span className="text-sm text-muted-foreground">{unit}</span>
        </div>
      </div>
    </Card>
  );
}
