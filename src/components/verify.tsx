import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import {
  Search,
  User,
  FileCheck,
  Shield,
  AlertTriangle,
  MapPin,
  Trophy,
  CreditCard,
  QrCode,
  Coins,
  Check,
  XCircle,
  Tag,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import type { Participant } from "../types/participant";
import { ParticipantDetailItem } from "./participant-detail-item";

// Bastar region cities (eligible for verification at this counter)
const BASTAR_REGION_CITIES = [
  "narayanpur",
  "bastar",
  "jagdalpur",
  "kanker",
  "dantewada",
  "rajnandgaon",
  "bijapur",
  "sukma",
];

const getIdType = (id: string): string => {
  if (!id) return "";

  const cleanId = id.replace(/\s/g, "");

  if (/^\d{12}$/.test(cleanId)) {
    return "Aadhar Card";
  } else if (/^\d{9}[A-Z]$/.test(cleanId)) {
    return "PAN Card";
  } else if (/^\d{10}$/.test(cleanId)) {
    return "Voter ID";
  } else if (/^\d{15}$/.test(cleanId)) {
    return "Driving License";
  }
  return "Unknown ID Type";
};

const isFromBastar = (city: string): boolean => {
  if (!city) return false;
  return BASTAR_REGION_CITIES.includes(city.toLowerCase().trim());
};

const PaymentAndVerification = () => {
  const [bibNumber, setBibNumber] = useState("");
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [verifyingId, setVerifyingId] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);

  const fetchParticipantDetails = async (bib: string) => {
    setLoading(true);
    setError("");
    setSuccessMessage("");
    setShowPaymentMethods(false);

    try {
      // Search by BIB number (primary)
      const bibNum = parseInt(bib, 10);

      if (isNaN(bibNum)) {
        setError("Please enter a valid BIB number");
        setParticipant(null);
        return;
      }

      const { data, error: searchError } = await supabase
        .schema("marathon")
        .from("registrations_2026")
        .select("*")
        .eq("bib_num", bibNum)
        .maybeSingle();

      if (searchError) {
        throw searchError;
      }

      if (data) {
        setParticipant(data);
      } else {
        setError(`No participant found with BIB: ${bib}`);
        setParticipant(null);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Error fetching participant details");
      setParticipant(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!bibNumber.trim()) {
      setError("Please enter a BIB number");
      return;
    }
    fetchParticipantDetails(bibNumber.trim());
  };

  const handleVerifyGovtId = async () => {
    if (!participant) return;

    setVerifyingId(true);
    setSuccessMessage("");
    setError("");

    try {
      const { error } = await supabase
        .schema("marathon")
        .from("registrations_2026")
        .update({ govt_id_verified: true })
        .eq("bib_num", participant.bib_num);

      if (error) throw error;

      setParticipant((prev) =>
        prev
          ? {
              ...prev,
              govt_id_verified: true,
            }
          : null,
      );

      setSuccessMessage("Government ID successfully verified");
    } catch (err) {
      setError("Failed to verify government ID");
    } finally {
      setVerifyingId(false);
    }
  };

  const handlePaymentAction = async (method: "ONLINE" | "CASH") => {
    if (!participant) return;

    setProcessingPayment(true);
    setSuccessMessage("");
    setError("");

    try {
      const { error } = await supabase
        .schema("marathon")
        .from("registrations_2026")
        .update({
          payment_status: method,
        })
        .eq("bib_num", participant.bib_num);

      if (error) throw error;

      setParticipant((prev) =>
        prev
          ? {
              ...prev,
              payment_status: method,
            }
          : null,
      );

      setSuccessMessage(`Payment marked as ${method}`);
      setShowPaymentMethods(false);
    } catch (err) {
      setError("Failed to update payment status");
    } finally {
      setProcessingPayment(false);
    }
  };

  const getPaymentAmount = () => {
    if (!participant) return 0;
    if (
      participant.city.toLowerCase() === "narayanpur" &&
      needsPayment() &&
      participant.wants_tshirt
    ) {
      return 200;
    }
    return participant.wants_tshirt ? 499 : 299;
  };

  const isEligibleForThisCounter = () => {
    if (!participant) return false;
    return isFromBastar(participant.city);
  };

  const isPaymentComplete = () => {
    if (!participant) return false;
    return (
      participant.payment_status === "DONE" ||
      participant.payment_status === "ONLINE" ||
      participant.payment_status === "CASH"
    );
  };

  const needsPayment = () => {
    if (!participant) return false;
    return participant.payment_status === "OFFLINE";
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <Card className="w-full mx-auto shadow-md">
          <CardHeader className="border-b">
            <CardTitle className="text-xl font-semibold text-center">
              Payment and Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Search Section */}
            <div className="flex flex-col sm:flex-row gap-3 px-4 sm:px-8 md:px-16 lg:px-32">
              <Input
                id="bib-search"
                type="text"
                placeholder="Enter BIB Number"
                value={bibNumber}
                onChange={(e) => setBibNumber(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch();
                  }
                }}
                disabled={loading}
                className="flex-1 h-12"
              />
              <Button
                onClick={handleSearch}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 px-4 sm:px-8 h-12"
              >
                {loading ? (
                  "Searching..."
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert
                variant="destructive"
                className="mx-4 sm:mx-8 md:mx-16 lg:mx-32"
              >
                <AlertDescription className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Success Alert */}
            {successMessage && (
              <Alert className="mx-4 sm:mx-8 md:mx-16 lg:mx-32 bg-green-50 border-green-200">
                <AlertDescription className="text-green-800 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  {successMessage}
                </AlertDescription>
              </Alert>
            )}

            {/* Participant Details */}
            {participant && (
              <div className="space-y-6">
                {/* Check if participant is eligible for this counter */}
                {!isEligibleForThisCounter() ? (
                  // Not from Bastar region - show redirect message
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mx-4 sm:mx-8 md:mx-16 lg:mx-32">
                    <div className="flex items-center gap-3 mb-4">
                      <XCircle className="w-8 h-8 text-amber-600" />
                      <h3 className="text-lg font-semibold text-amber-800">
                        Please Go to Other Counter
                      </h3>
                    </div>
                    <p className="text-amber-700 mb-4">
                      This participant is from{" "}
                      <strong>{participant.city}</strong> and is not from the
                      Narayanpur/Bastar region. Please direct them to the
                      appropriate counter for verification and payment.
                    </p>
                    <div className="bg-white rounded p-4 border border-amber-200">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-gray-500">Name</span>
                          <p className="font-medium">
                            {participant.first_name} {participant.last_name}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">
                            BIB Number
                          </span>
                          <p className="font-medium">
                            #{participant.bib_num?.toString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Eligible participant - show full details and actions
                  <>
                    {/* Participant Info Card */}
                    <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 shadow-sm border mx-4 sm:mx-8 md:mx-16 lg:mx-32">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-x-12 lg:gap-x-24">
                        <ParticipantDetailItem
                          icon={User}
                          label="Name"
                          value={`${participant.first_name} ${participant.last_name}`}
                          iconColor="text-blue-500"
                        />

                        <div className="flex items-start gap-3">
                          <Tag className="w-6 h-6 text-amber-500 mt-1 shrink-0" />
                          <div className="flex-1">
                            <div className="text-sm text-gray-500">
                              BIB Number
                            </div>
                            <div className="mt-1 text-2xl font-bold text-amber-700">
                              #{participant.bib_num?.toString()}
                            </div>
                          </div>
                        </div>

                        <ParticipantDetailItem
                          icon={MapPin}
                          label="City"
                          value={participant.city}
                          iconColor="text-orange-500"
                        />

                        <ParticipantDetailItem
                          icon={Trophy}
                          label="Race Category"
                          value={participant.race_category || "10KM"}
                          iconColor="text-indigo-500"
                        />

                        <div className="flex items-start gap-3">
                          <CreditCard className="w-6 h-6 text-red-500 mt-1 shrink-0" />
                          <div className="flex-1">
                            <div className="text-sm text-gray-500">
                              Payment Status
                            </div>
                            <div className="mt-1">
                              <span
                                className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                                  isPaymentComplete()
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {participant.payment_status?.toUpperCase() ||
                                  "PENDING"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <FileCheck className="w-6 h-6 text-violet-500 mt-1 shrink-0" />
                          <div className="flex-1">
                            <div className="text-sm text-gray-500">
                              Government ID
                            </div>
                            {participant.govt_id ? (
                              <div className="mt-1">
                                <div className="font-medium">
                                  {participant.govt_id}
                                </div>
                                <div className="text-sm text-blue-600">
                                  {getIdType(participant.govt_id)}
                                </div>
                              </div>
                            ) : (
                              <div className="mt-1 text-gray-400">
                                No ID provided
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Wants T-shirt info */}
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 text-teal-500 mt-1 shrink-0 flex items-center justify-center">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="text-sm text-gray-500">
                              Wants T-shirt
                            </div>
                            <div className="mt-1">
                              <span
                                className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                                  participant.wants_tshirt
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {participant.wants_tshirt ? "Yes" : "No"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Government ID Verification Section */}
                    <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border mx-4 sm:mx-8 md:mx-16 lg:mx-32">
                      <h3 className="font-medium text-lg mb-4">
                        Government ID Verification
                      </h3>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div
                          className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                            participant.govt_id_verified
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {participant.govt_id_verified
                            ? "ID Verified"
                            : "ID Not Verified"}
                        </div>

                        {!participant.govt_id_verified ? (
                          <Button
                            onClick={handleVerifyGovtId}
                            disabled={verifyingId}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {verifyingId ? (
                              "Verifying..."
                            ) : (
                              <>
                                <Shield className="w-4 h-4 mr-2" />
                                Verify ID
                              </>
                            )}
                          </Button>
                        ) : (
                          <div className="flex items-center text-green-600 gap-2">
                            <Shield className="w-5 h-5" />
                            <span>ID has been verified</span>
                          </div>
                        )}
                      </div>

                      {!participant.govt_id && (
                        <p className="text-sm text-gray-500 mt-3">
                          Note: No government ID was provided during
                          registration. You can still verify if physical ID is
                          shown.
                        </p>
                      )}
                    </div>

                    {/* Payment Section */}
                    <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border mx-4 sm:mx-8 md:mx-16 lg:mx-32">
                      <h3 className="font-medium text-lg mb-4">
                        Payment Verification
                      </h3>

                      {isPaymentComplete() ? (
                        <div className="flex items-center gap-3">
                          <div className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            Payment Complete
                          </div>
                          <div className="text-green-600 flex items-center gap-2">
                            <Check className="w-5 h-5" />
                            <span>
                              Paid via{" "}
                              {participant.payment_status?.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      ) : needsPayment() ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
                              Payment Pending
                            </div>
                            <span className="text-gray-600">
                              Amount to collect:{" "}
                              <strong className="text-lg">
                                Rs. {getPaymentAmount()}
                              </strong>
                              {participant.wants_tshirt
                                ? " (Registration + T-shirt)"
                                : " (Registration only)"}
                            </span>
                          </div>

                          {showPaymentMethods ? (
                            <div className="space-y-3">
                              <p className="text-sm text-gray-600">
                                Select payment method:
                              </p>
                              <div className="flex flex-col sm:flex-row gap-3">
                                <Button
                                  onClick={() => handlePaymentAction("ONLINE")}
                                  disabled={processingPayment}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  <QrCode className="w-4 h-4 mr-2" />
                                  {processingPayment
                                    ? "Processing..."
                                    : "Online Payment"}
                                </Button>
                                <Button
                                  onClick={() => handlePaymentAction("CASH")}
                                  disabled={processingPayment}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Coins className="w-4 h-4 mr-2" />
                                  {processingPayment
                                    ? "Processing..."
                                    : "Cash Payment"}
                                </Button>
                                <Button
                                  onClick={() => setShowPaymentMethods(false)}
                                  variant="outline"
                                  disabled={processingPayment}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              onClick={() => setShowPaymentMethods(true)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CreditCard className="w-4 h-4 mr-2" />
                              Take Payment: Rs. {getPaymentAmount()}
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="text-gray-600">
                          <p>
                            Current status:{" "}
                            <strong>
                              {participant.payment_status?.toUpperCase() ||
                                "PENDING"}
                            </strong>
                          </p>
                          <p className="text-sm mt-2">
                            This participant has payment status "
                            {participant.payment_status}". No payment action
                            required at this counter.
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentAndVerification;
