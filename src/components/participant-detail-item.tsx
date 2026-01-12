import { LucideIcon, AlertCircle } from "lucide-react";

interface ParticipantDetailItemProps {
  icon: LucideIcon;
  label: string;
  value: string | number | null | undefined;
  iconColor?: string;
  emptyMessage?: string;
}

export const ParticipantDetailItem = ({
  icon: Icon,
  label,
  value,
  iconColor = "text-blue-500",
  emptyMessage = "Not Available",
}: ParticipantDetailItemProps) => {
  const isEmpty = value === null || value === undefined || value === "";

  return (
    <div className="flex items-start gap-3">
      <Icon className={`w-6 h-6 ${iconColor} mt-1 shrink-0`} />
      <div>
        <div className="text-sm text-gray-500">{label}</div>
        <div className={`text-base sm:text-lg font-medium mt-1 break-words ${isEmpty ? "text-gray-400 italic flex items-center gap-2" : ""}`}>
          {isEmpty ? (
            <>
              <AlertCircle className="w-4 h-4" />
              {emptyMessage}
            </>
          ) : (
            value
          )}
        </div>
      </div>
    </div>
  );
};
