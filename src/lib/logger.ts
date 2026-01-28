import { supabase } from "./supabase";
import { getStoredUid } from "./uid";

export interface LogMetadata {
  [key: string]: unknown;
}

/**
 * Gets the current timestamp in IST (Asia/Kolkata) timezone
 * Format: YYYY-MM-DD HH:mm:ss.microseconds+05:30
 */
const getISTTimestamp = (): string => {
  const now = new Date();
  
  // Get IST time by adding 5 hours 30 minutes to UTC
  const istOffset = 5.5 * 60 * 60 * 1000; // 5:30 in milliseconds
  const istTime = new Date(now.getTime() + istOffset);
  
  const year = istTime.getUTCFullYear();
  const month = String(istTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(istTime.getUTCDate()).padStart(2, "0");
  const hours = String(istTime.getUTCHours()).padStart(2, "0");
  const minutes = String(istTime.getUTCMinutes()).padStart(2, "0");
  const seconds = String(istTime.getUTCSeconds()).padStart(2, "0");
  const microseconds = String(istTime.getUTCMilliseconds() * 1000).padStart(6, "0");
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${microseconds}+05:30`;
};

/**
 * Logs an event to the dashboard_log table
 * @param event - The name of the event (e.g., "ID_VERIFIED", "PAYMENT_PROCESSED")
 * @param metadata - Additional data about the event
 */
export const logEvent = async (
  event: string,
  metadata: LogMetadata
): Promise<void> => {
  const uid = getStoredUid();

  if (!uid) {
    console.error("Cannot log event: No UID found in localStorage");
    return;
  }

  try {
    const { error } = await supabase
      .schema("marathon")
      .from("dashboard_log")
      .insert({
        uid,
        time: getISTTimestamp(),
        Event: event,
        metadata,
      });

    if (error) {
      console.error("Error logging event:", error);
    }
  } catch (err) {
    console.error("Failed to log event:", err);
  }
};

// Pre-defined event types for type safety and consistency
export const LogEvents = {
  // Participant selection
  PARTICIPANT_SELECTED: "PARTICIPANT_SELECTED",

  // ID Verification
  ID_VERIFIED: "ID_VERIFIED",
  ID_VERIFICATION_FAILED: "ID_VERIFICATION_FAILED",

  // Payment
  PAYMENT_MARKED_ONLINE: "PAYMENT_MARKED_ONLINE",
  PAYMENT_MARKED_CASH: "PAYMENT_MARKED_CASH",

  // Item distribution
  TSHIRT_DISTRIBUTED: "TSHIRT_DISTRIBUTED",
  BIB_DISTRIBUTED: "BIB_DISTRIBUTED",

  // BIB assignment
  BIB_ASSIGNED: "BIB_ASSIGNED",

  // Bulk sales
  BULK_SALE_COMPLETED: "BULK_SALE_COMPLETED",
} as const;

export type LogEventType = (typeof LogEvents)[keyof typeof LogEvents];
