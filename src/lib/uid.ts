import { supabase } from "./supabase";

const UID_STORAGE_KEY = "user_uid";

/**
 * Get stored UID from localStorage (never expires)
 */
export const getStoredUid = (): string | null => {
  return localStorage.getItem(UID_STORAGE_KEY);
};

/**
 * Store UID in localStorage (persists indefinitely)
 */
export const setStoredUid = (uid: string): void => {
  localStorage.setItem(UID_STORAGE_KEY, uid);
};

/**
 * Generate a unique UID
 */
export const generateUid = (): string => {
  const randomPart = Math.random().toString(36).substring(2, 10);
  const timestamp = Date.now().toString(36);
  return `USR-${randomPart}${timestamp}`;
};

/**
 * Validate phone number is exactly 10 digits
 */
export const validatePhoneNumber = (phone: string): boolean => {
  const cleanPhone = phone.replace(/\D/g, "");
  return cleanPhone.length === 10;
};

/**
 * Create a new UID for a user
 * Throws error if name or phone already exists
 */
export const createUid = async (
  name: string,
  phone: string
): Promise<string> => {
  // Clean up phone number (remove spaces, dashes, etc.)
  const cleanPhone = phone.replace(/\D/g, "");
  const trimmedName = name.trim();

  // Validate phone is exactly 10 digits
  if (cleanPhone.length !== 10) {
    throw new Error("Phone number must be exactly 10 digits");
  }

  // Check if phone already exists
  const { data: existingPhone, error: phoneCheckError } = await supabase
    .schema("marathon")
    .from("uid_mapping")
    .select("uid")
    .eq("phone", cleanPhone)
    .maybeSingle();

  if (phoneCheckError) {
    console.error("Error checking phone:", phoneCheckError);
    throw new Error("Failed to verify phone number");
  }

  if (existingPhone) {
    throw new Error("This phone number is already registered. Please use a different phone number.");
  }

  // Check if name already exists
  const { data: existingName, error: nameCheckError } = await supabase
    .schema("marathon")
    .from("uid_mapping")
    .select("uid")
    .eq("Name", trimmedName)
    .maybeSingle();

  if (nameCheckError) {
    console.error("Error checking name:", nameCheckError);
    throw new Error("Failed to verify name");
  }

  if (existingName) {
    throw new Error("This name is already registered. Please use a different name.");
  }

  // Create new entry
  const newUid = generateUid();

  const { error: insertError } = await supabase
    .schema("marathon")
    .from("uid_mapping")
    .insert({
      uid: newUid,
      Name: trimmedName,
      phone: cleanPhone,
    });

  if (insertError) {
    console.error("Error creating user:", insertError);
    throw new Error("Failed to register. Please try again.");
  }

  // Store in localStorage (persists indefinitely)
  setStoredUid(newUid);
  return newUid;
};

/**
 * Clear stored UID (for logout scenarios)
 */
export const clearStoredUid = (): void => {
  localStorage.removeItem(UID_STORAGE_KEY);
};
