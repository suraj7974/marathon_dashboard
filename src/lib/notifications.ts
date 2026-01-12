interface BibNotificationPayload {
  phoneNumber: string;
  bib: string;
  category: string;
}

export const sendBibAllocationNotification = async (
  phoneNumber: string,
  bibNumber: number | string,
  category: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const formattedPhone = formatPhoneNumber(phoneNumber);

    const formattedCategory = category;

    const payload: BibNotificationPayload = {
      phoneNumber: formattedPhone,
      bib: bibNumber.toString(),
      category: formattedCategory,
    };

    const response = await fetch("https://runabujhmaad.in/bib-allocated", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Notification error:", errorData);
      return { success: false, message: `Failed to send notification: ${response.status}` };
    }

    return { success: true, message: "Notification sent successfully" };
  } catch (error) {
    console.error("Error sending notification:", error);
    return { success: false, message: `Error sending notification: ${error}` };
  }
};

const formatPhoneNumber = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 10) {
    return `91${digits}`;
  } else if (digits.length === 12 && digits.startsWith("91")) {
    return digits;
  }

  return phone;
};

export const getCategoryText = (category: string, isFromNarayanpur: boolean): string => {
  if (category === "21KM") {
    return isFromNarayanpur ? "21KM Narayanpur" : "21KM Open";
  }
  if (category === "10KM") {
    return "10KM Open";
  }
  if (category === "5KM") {
    return "5KM Open";
  }
  return `${category} Open`;
};
