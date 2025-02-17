import React from "react";
import { LucideIcon } from "lucide-react";

interface ParticipantDetailItemProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  iconColor?: string;
}

export const ParticipantDetailItem = ({ icon: Icon, label, value, iconColor = "text-blue-500" }: ParticipantDetailItemProps) => {
  return (
    <div className="flex items-start gap-3">
      <Icon className={`w-6 h-6 ${iconColor} mt-1 shrink-0`} />
      <div>
        <div className="text-sm text-gray-500">{label}</div>
        <div className="text-base sm:text-lg font-medium mt-1 break-words">{value}</div>
      </div>
    </div>
  );
};
