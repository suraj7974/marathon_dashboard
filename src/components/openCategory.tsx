import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import {
  Search,
  User,
  AlertTriangle,
  MapPin,
  Trophy,
  CreditCard,
  QrCode,
  Coins,
  Check,
  XCircle,
  Tag,
  ShoppingBag,
  Plus,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { logEvent, LogEvents } from "../lib/logger";
import type { Participant } from "../types/participant";
import { ParticipantDetailItem } from "./participant-detail-item";
import {
  calculateAge,
  normaliseRace,
  getSubCategory,
  validateBibNumber,
  CATEGORIES,
  UNIVERSAL_BIB_42K_21K,
  UNIVERSAL_BIB_10K,
} from "../lib/bib-validator";

const SCHEMA = "bastar_marathon";
const TABLE = "registrations";

// Bastar region cities (These belong to the NPR/Bastar counter)
const BASTAR_REGION_CITIES = [
  "bastar",
  "jagdalpur",
  "kanker",
  "dantewada",
  "kondagaon",
  "bijapur",
  "sukma",
  "narayanpur",
];

interface ExtendedParticipant extends Participant {
  received_bib?: boolean;
}

const isFromBastar = (city: string): boolean => {
  if (!city) return false;
  return BASTAR_REGION_CITIES.includes(city.toLowerCase().trim());
};

const OpenCategoryVerification = () => {
  const [searchValue, setSearchValue] = useState("");
  const [participant, setParticipant] = useState<ExtendedParticipant | null>(null);
  const [multipleResults, setMultipleResults] = useState<ExtendedParticipant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);
  const [newBibNumber, setNewBibNumber] = useState("");
  const [assigningBib, setAssigningBib] = useState(false);
  const [bibValidation, setBibValidation] = useState<{
    valid: boolean;
    subCategory: string | null;
    expectedRange?: { start: number; end: number };
    universal?: boolean;
    race?: string;
  } | null>(null);

  const fetchParticipantDetails = async (value: string) => {
    setLoading(true);
    setError("");
    setSuccessMessage("");
    setShowPaymentMethods(false);
    setParticipant(null);
    setMultipleResults([]);
    setNewBibNumber("");
    setBibValidation(null);

    try {
      let data: ExtendedParticipant[] | null = null;
      let fetchError: unknown = null;
      let searchType = "";
      const trimmedValue = value.trim();

      if (/^\d{10}$/.test(trimmedValue)) {
        searchType = "Mobile Number";
        const response = await supabase
          .schema(SCHEMA)
          .from(TABLE)
          .select("*")
          .eq("phone", trimmedValue);
        data = response.data;
        fetchError = response.error;
      } else if (/^\d+$/.test(trimmedValue)) {
        searchType = "BIB Number";
        const bibResponse = await supabase
          .schema(SCHEMA)
          .from(TABLE)
          .select("*")
          .eq("bib_number", parseInt(trimmedValue, 10));

        if (bibResponse.error) throw bibResponse.error;

        if (bibResponse.data && bibResponse.data.length > 0) {
          data = bibResponse.data;
        } else {
          searchType = "Unique ID";
          const uidResponse = await supabase
            .schema(SCHEMA)
            .from(TABLE)
            .select("*")
            .eq("identification_number", trimmedValue.toUpperCase());

          if (uidResponse.error) throw uidResponse.error;
          data = uidResponse.data;

          if (!data || data.length === 0) {
            searchType = "BIB or Unique ID";
          }
        }
      } else {
        searchType = "Unique ID";
        const response = await supabase
          .schema(SCHEMA)
          .from(TABLE)
          .select("*")
          .eq("identification_number", trimmedValue.toUpperCase());
        data = response.data;
        fetchError = response.error;
      }

      if (fetchError) throw fetchError;

      if (!data || data.length === 0) {
        setError(`No participant found with ${searchType}: ${trimmedValue}`);
      } else if (data.length === 1) {
        setParticipant(data[0]);
      } else {
        setMultipleResults(data);
        setSuccessMessage(`Found ${data.length} participants. Please select one.`);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Error fetching participant details");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectParticipant = (selected: ExtendedParticipant) => {
    setParticipant(selected);
    setMultipleResults([]);
    setSuccessMessage("");

    logEvent(LogEvents.PARTICIPANT_SELECTED, {
      category: "opencategory",
      participant_id: selected.identification_number,
      bib_num: selected.bib_number?.toString() || null,
      name: selected.full_name,
      city: selected.city,
    });
  };

  const handleSearch = () => {
    if (!searchValue.trim()) {
      setError("Please enter a value to search");
      return;
    }
    fetchParticipantDetails(searchValue.trim());
  };

  const handlePaymentAction = async (method: "ONLINE" | "CASH") => {
    if (!participant) return;

    setProcessingPayment(true);
    setSuccessMessage("");
    setError("");

    try {
      let updateQuery = supabase
        .schema(SCHEMA)
        .from(TABLE)
        .update({ payment_status: method });

      if (participant.bib_number) {
        updateQuery = updateQuery.eq("bib_number", participant.bib_number);
      } else {
        updateQuery = updateQuery.eq("identification_number", participant.identification_number);
      }

      const { error } = await updateQuery;
      if (error) throw error;

      setParticipant((prev) => prev ? { ...prev, payment_status: method } : null);
      setSuccessMessage(`Payment marked as ${method}`);
      setShowPaymentMethods(false);

      logEvent(
        method === "ONLINE" ? LogEvents.PAYMENT_MARKED_ONLINE : LogEvents.PAYMENT_MARKED_CASH,
        {
          category: "opencategory",
          participant_id: participant.identification_number,
          bib_num: participant.bib_number?.toString() || null,
          name: participant.full_name,
          payment_method: method,
          amount: getPaymentAmount(),
        },
      );
    } catch (err) {
      setError("Failed to update payment status");
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleUpdateItemStatus = async (item: "tshirt" | "bib") => {
    if (!participant) return;
    if (item === "bib" && !participant.bib_number) {
      setError("Cannot mark Bib as received: No Bib Number assigned.");
      return;
    }

    setUpdatingItem(item);
    setError("");
    setSuccessMessage("");

    const column = item === "tshirt" ? "received_tshirt" : "received_bib";
    const updateData = { [column]: true };

    try {
      if (item === "tshirt" && participant.t_shirt_size) {
        const size = participant.t_shirt_size.toUpperCase();
        if (["S", "M", "L", "XL", "XXL"].includes(size)) {
          const rpcParams = {
            p_s: size === "S" ? 1 : 0,
            p_m: size === "M" ? 1 : 0,
            p_l: size === "L" ? 1 : 0,
            p_xl: size === "XL" ? 1 : 0,
            p_xxl: size === "XXL" ? 1 : 0,
          };

          const { data: decrementResult, error: decrementError } = await supabase
            .schema("bastar_marathon")
            .rpc("decrement_bulk_inventory", rpcParams);

          if (decrementError) {
            console.error("Inventory decrement failed:", decrementError);
          } else if (decrementResult === false) {
            console.warn(`Inventory reported insufficient stock for size ${size}, but marking as received.`);
          }
        }
      }

      let updateQuery = supabase
        .schema(SCHEMA)
        .from(TABLE)
        .update(updateData);

      if (participant.bib_number) {
        updateQuery = updateQuery.eq("bib_number", participant.bib_number);
      } else {
        updateQuery = updateQuery.eq("identification_number", participant.identification_number);
      }

      const { error } = await updateQuery;
      if (error) throw error;

      setParticipant((prev) => prev ? { ...prev, [column]: true } : null);
      setSuccessMessage(`${item === "tshirt" ? "T-shirt" : "Bib"} marked as received`);

      logEvent(
        item === "tshirt" ? LogEvents.TSHIRT_DISTRIBUTED : LogEvents.BIB_DISTRIBUTED,
        {
          category: "opencategory",
          participant_id: participant.identification_number,
          bib_num: participant.bib_number?.toString() || null,
          name: participant.full_name,
          item_type: item,
          t_shirt_size: item === "tshirt" ? participant.t_shirt_size : null,
        },
      );
    } catch (err) {
      console.error(`Error updating ${item} status:`, err);
      setError(`Failed to update ${item} status`);
    } finally {
      setUpdatingItem(null);
    }
  };

  const handleBibInputChange = (value: string) => {
    setNewBibNumber(value.replace(/\D/g, ""));
    setBibValidation(null);

    if (!participant || !value) return;

    const bibNum = parseInt(value, 10);
    if (isNaN(bibNum)) return;

    const race = normaliseRace(participant.category || "");
    if (!race) return;

    const age = calculateAge(participant.date_of_birth);
    const subCat = getSubCategory(race, participant.gender || "", participant.city || "", age);
    if (!subCat) return;

    const result = validateBibNumber(bibNum, race, subCat);
    setBibValidation({ valid: result.valid, subCategory: subCat, expectedRange: result.expectedRange, universal: result.universal, race });
  };

  const handleAssignBib = async () => {
    if (!participant || !newBibNumber) return;

    const bibNum = parseInt(newBibNumber, 10);
    if (isNaN(bibNum)) {
      setError("Please enter a valid numeric BIB number.");
      return;
    }

    // Block if bib is outside the expected range (universal range 2000-2700 is always valid)
    if (bibValidation && !bibValidation.valid) {
      const range = bibValidation.expectedRange;
      const rangeText = range ? ` Expected range: ${range.start}–${range.end}.` : "";
      setError(`BIB #${bibNum} is outside the allowed range for "${bibValidation.subCategory}".${rangeText} Use a BIB in the correct range or the universal range (2000–2700).`);
      return;
    }

    setAssigningBib(true);
    setError("");
    setSuccessMessage("");

    try {
      const { error } = await supabase
        .schema(SCHEMA)
        .from(TABLE)
        .update({ bib_number: bibNum })
        .eq("identification_number", participant.identification_number);

      if (error) throw error;

      setParticipant((prev) => prev ? { ...prev, bib_number: bibNum } : null);
      setSuccessMessage(`BIB #${bibNum} assigned successfully.`);
      setNewBibNumber("");
      setBibValidation(null);

      logEvent(LogEvents.BIB_ASSIGNED, {
        category: "opencategory",
        participant_id: participant.identification_number,
        name: participant.full_name,
        assigned_bib: bibNum,
      });
    } catch (err) {
      console.error("Error assigning BIB:", err);
      setError("Failed to assign BIB number. It might be already in use.");
    } finally {
      setAssigningBib(false);
    }
  };

  const getPaymentAmount = () => {
    if (!participant) return 0;
    return participant.wants_tshirt ? 499 : 299;
  };

  const isEligibleForThisCounter = () => {
    if (!participant) return false;
    return !isFromBastar(participant.city || "");
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
    const status = participant.payment_status?.toUpperCase();
    return !status || status === "OFFLINE" || status === "PENDING";
  };

  const canDistributeItems = () => {
    if (!participant) return false;
    return isPaymentComplete();
  };

  // Age helpers
  const participantAge = participant ? calculateAge(participant.date_of_birth) : null;
  const participantRace = participant ? normaliseRace(participant.category || "") : null;
  const participantSubCategory =
    participantRace && participant
      ? getSubCategory(participantRace, participant.gender || "", participant.city || "", participantAge)
      : null;

  const getBibRangeInfo = (): { subCategoryRange: { start: number; end: number } | null; universalRange: { start: number; end: number } | null } => {
    if (!participantRace || !participantSubCategory) return { subCategoryRange: null, universalRange: null };
    
    const ranges = CATEGORIES[participantRace];
    const subCategoryRange = ranges?.[participantSubCategory] ?? null;
    
    // Determine universal range based on race
    let universalRange = null;
    if (participantRace === "42K" || participantRace === "21K") {
      universalRange = UNIVERSAL_BIB_42K_21K;
    } else if (participantRace === "10K") {
      universalRange = UNIVERSAL_BIB_10K;
    }
    
    return { subCategoryRange, universalRange };
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <Card className="w-full mx-auto shadow-md">
          <CardHeader className="border-b">
            <CardTitle className="text-xl font-semibold text-center">
              Open Category Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Search Section */}
            <div className="flex flex-col sm:flex-row gap-3 px-4 sm:px-8 md:px-16 lg:px-32">
              <Input
                id="search-input"
                type="text"
                placeholder="Enter BIB, Mobile (10 digits) or Unique ID"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                disabled={loading}
                className="flex-1 h-12"
              />
              <Button
                onClick={handleSearch}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 px-4 sm:px-8 h-12"
              >
                {loading ? "Searching..." : (
                  <><Search className="w-5 h-5 mr-2" />Search</>
                )}
              </Button>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="mx-4 sm:mx-8 md:mx-16 lg:mx-32">
                <AlertDescription className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />{error}
                </AlertDescription>
              </Alert>
            )}

            {/* Success Alert */}
            {successMessage && (
              <Alert className="mx-4 sm:mx-8 md:mx-16 lg:mx-32 bg-green-50 border-green-200">
                <AlertDescription className="text-green-800 flex items-center gap-2">
                  <Check className="w-4 h-4" />{successMessage}
                </AlertDescription>
              </Alert>
            )}

            {/* Multiple Results */}
            {multipleResults.length > 0 && !participant && (
              <div className="space-y-4 mx-4 sm:mx-8 md:mx-16 lg:mx-32">
                <h3 className="text-lg font-semibold text-gray-700">Select a participant:</h3>
                <div className="grid gap-4">
                  {multipleResults.map((result) => (
                    <div
                      key={result.bib_number ?? result.identification_number}
                      className="bg-white p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-100 rounded-full">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-lg">{result.full_name}</div>
                          <div className="text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                            <span className="flex items-center gap-1">
                              <Tag className="w-3 h-3" /> BIB: {result.bib_number?.toString() || "N/A"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Trophy className="w-3 h-3" /> {result.category}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {result.city}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button onClick={() => handleSelectParticipant(result)} className="bg-blue-600 hover:bg-blue-700 shrink-0">
                        Select
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Participant Details */}
            {participant && (
              <div className="space-y-6">
                {!isEligibleForThisCounter() ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mx-4 sm:mx-8 md:mx-16 lg:mx-32">
                    <div className="flex items-center gap-3 mb-4">
                      <XCircle className="w-8 h-8 text-amber-600" />
                      <h3 className="text-lg font-semibold text-amber-800">Please Go to Bastar Counter</h3>
                    </div>
                    <p className="text-amber-700 mb-4">
                      This participant is from <strong>{participant.city}</strong> (Bastar Region). Please direct them to the Bastar Verification counter.
                    </p>
                    <div className="bg-white rounded p-4 border border-amber-200">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-gray-500">Name</span>
                          <p className="font-medium">{participant.full_name}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">BIB Number</span>
                          <p className="font-medium">#{participant.bib_number?.toString() || "N/A"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Participant Info Card */}
                    <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 shadow-sm border mx-4 sm:mx-8 md:mx-16 lg:mx-32">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-x-12 lg:gap-x-24">
                        <ParticipantDetailItem
                          icon={User}
                          label="Name"
                          value={participant.full_name || "N/A"}
                          iconColor="text-blue-500"
                        />

                        <div className="flex items-start gap-3">
                          <Tag className="w-6 h-6 text-amber-500 mt-1 shrink-0" />
                          <div className="flex-1">
                            <div className="text-sm text-gray-500">BIB Number</div>
                            <div className="mt-1 text-2xl font-bold text-amber-700">
                              {participant.bib_number ? `#${participant.bib_number}` : "Not Assigned"}
                            </div>
                          </div>
                        </div>

                        <ParticipantDetailItem
                          icon={MapPin}
                          label="City"
                          value={participant.city || "N/A"}
                          iconColor="text-orange-500"
                        />

                        <ParticipantDetailItem
                          icon={Trophy}
                          label="Category"
                          value={participant.category || "N/A"}
                          iconColor="text-indigo-500"
                        />

                        {/* Age Calculator */}
                        <div className="flex items-start gap-3">
                          <Calendar className="w-6 h-6 text-green-500 mt-1 shrink-0" />
                          <div className="flex-1">
                            <div className="text-sm text-gray-500">Age</div>
                            <div className="mt-1">
                              {participantAge !== null ? (
                                <span className="text-lg font-semibold text-gray-800">
                                  {participantAge} years
                                </span>
                              ) : (
                                <span className="text-gray-400 text-sm">DOB not available</span>
                              )}
                              {participant.date_of_birth && (
                                <div className="text-xs text-gray-400 mt-0.5">
                                  DOB: {new Date(participant.date_of_birth).toLocaleDateString("en-GB")}
                                </div>
                              )}
                              {participantSubCategory && (
                                <div className="text-xs text-indigo-600 mt-0.5 font-medium">
                                  {participantSubCategory}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <CreditCard className="w-6 h-6 text-red-500 mt-1 shrink-0" />
                          <div className="flex-1">
                            <div className="text-sm text-gray-500">Payment Status</div>
                            <div className="mt-1">
                              <span
                                className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                                  isPaymentComplete()
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {participant.payment_status?.toUpperCase() || "PENDING"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <ShoppingBag className="w-6 h-6 text-teal-500 mt-1 shrink-0" />
                          <div className="flex-1">
                            <div className="text-sm text-gray-500">T-Shirt Info</div>
                            <div className="mt-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                                    participant.wants_tshirt
                                      ? "bg-green-100 text-green-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {participant.wants_tshirt ? "Yes" : "No"}
                                </span>
                                {participant.wants_tshirt && participant.t_shirt_size && (
                                  <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                    Size: {participant.t_shirt_size}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mx-4 sm:mx-8 md:mx-16 lg:mx-32">
                      {/* Payment */}
                      <div className="space-y-6">
                        <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border h-full">
                          <h3 className="font-medium text-lg mb-4">Payment</h3>
                          <div className="grid grid-cols-1 gap-4">
                            <div className="flex flex-col gap-4 p-4 border rounded-lg bg-gray-50">
                              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                  <div className="p-2 bg-amber-100 rounded-full">
                                    <CreditCard className="w-5 h-5 text-amber-600" />
                                  </div>
                                  <div>
                                    <div className="font-medium">Payment</div>
                                    <div className="text-sm text-gray-500">
                                      {isPaymentComplete() ? "Completed" : `Due: Rs. ${getPaymentAmount()}`}
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  {isPaymentComplete() ? (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      <Check className="w-3 h-3 mr-1" />
                                      {participant.payment_status?.toUpperCase()}
                                    </span>
                                  ) : needsPayment() && !showPaymentMethods ? (
                                    <Button size="sm" onClick={() => setShowPaymentMethods(true)} className="bg-green-600 hover:bg-green-700">
                                      Take Payment
                                    </Button>
                                  ) : (
                                    <span className="text-xs text-gray-500 font-medium">
                                      {participant.payment_status?.toUpperCase() || "PENDING"}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {showPaymentMethods && (
                                <div className="pt-3 mt-1 border-t border-gray-200">
                                  <p className="text-xs text-gray-500 mb-3">Select Method:</p>
                                  <div className="flex flex-wrap gap-2">
                                    <Button size="sm" onClick={() => handlePaymentAction("ONLINE")} disabled={processingPayment} className="bg-blue-600 hover:bg-blue-700 flex-1">
                                      <QrCode className="w-3 h-3 mr-2" />Online
                                    </Button>
                                    <Button size="sm" onClick={() => handlePaymentAction("CASH")} disabled={processingPayment} className="bg-green-600 hover:bg-green-700 flex-1">
                                      <Coins className="w-3 h-3 mr-2" />Cash
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => setShowPaymentMethods(false)} disabled={processingPayment} className="flex-shrink-0">
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* T-shirt & BIB */}
                      <div className="space-y-6">
                        <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border h-full">
                          <h3 className="font-medium text-lg mb-4">Tshirt and BIB</h3>
                          <div className="grid grid-cols-1 gap-4">
                            {/* T-Shirt */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border rounded-lg bg-gray-50">
                              <div className="flex items-center gap-4">
                                <div className="p-2 bg-purple-100 rounded-full">
                                  <ShoppingBag className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                  <div className="font-medium">T-Shirt</div>
                                  <div className="text-sm text-gray-500">
                                    {participant.wants_tshirt ? (
                                      <span className="font-medium text-purple-700">
                                        Size: {participant.t_shirt_size || "N/A"}
                                      </span>
                                    ) : "Not Required"}
                                  </div>
                                </div>
                              </div>
                              <div>
                                {participant.wants_tshirt ? (
                                  participant.received_tshirt ? (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      <Check className="w-3 h-3 mr-1" />Received
                                    </span>
                                  ) : (
                                    <Button
                                      size="sm"
                                      onClick={() => handleUpdateItemStatus("tshirt")}
                                      disabled={!canDistributeItems() || updatingItem === "tshirt"}
                                      className="bg-purple-600 hover:bg-purple-700"
                                    >
                                      {updatingItem === "tshirt" ? "Updating..." : "Mark Received"}
                                    </Button>
                                  )
                                ) : (
                                  <span className="text-xs text-gray-400">Skipped</span>
                                )}
                              </div>
                            </div>

                            {/* BIB */}
                            <div className="flex flex-col gap-4 p-4 border rounded-lg bg-gray-50">
                              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                  <div className="p-2 bg-orange-100 rounded-full">
                                    <Tag className="w-5 h-5 text-orange-600" />
                                  </div>
                                  <div>
                                    <div className="font-medium">Bib Number</div>
                                    <div className="text-sm font-medium text-orange-700">
                                      {participant.bib_number ? `#${participant.bib_number}` : "Not Assigned"}
                                    </div>
                                    {/* BIB range hint */}
                                    {getBibRangeInfo().subCategoryRange && (
                                      <div className="text-xs text-gray-500 mt-0.5">
                                        Expected range: {getBibRangeInfo().subCategoryRange!.start}–{getBibRangeInfo().subCategoryRange!.end}
                                        {getBibRangeInfo().universalRange && (
                                          <span className="text-green-600">
                                            {" "}or {getBibRangeInfo().universalRange!.start}–{getBibRangeInfo().universalRange!.end} (Universal)
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  {participant.received_bib ? (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      <Check className="w-3 h-3 mr-1" />Received
                                    </span>
                                  ) : (
                                    <Button
                                      size="sm"
                                      onClick={() => handleUpdateItemStatus("bib")}
                                      disabled={!canDistributeItems() || !participant.bib_number || updatingItem === "bib"}
                                      className="bg-orange-600 hover:bg-orange-700"
                                    >
                                      {updatingItem === "bib" ? "Updating..." : "Mark Received"}
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {/* Assign BIB Input */}
                              {!participant.bib_number && canDistributeItems() && (
                                <div className="pt-3 mt-1 border-t border-gray-200 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Input
                                      placeholder="Enter BIB #"
                                      className="h-9"
                                      value={newBibNumber}
                                      onChange={(e) => handleBibInputChange(e.target.value)}
                                    />
                                    <Button
                                      size="sm"
                                      className="bg-blue-600 hover:bg-blue-700 shrink-0"
                                      onClick={handleAssignBib}
                                      disabled={assigningBib || !newBibNumber}
                                    >
                                      <Plus className="w-4 h-4 mr-1" />Assign
                                    </Button>
                                  </div>
                                  {/* BIB Validation feedback */}
                                  {bibValidation && newBibNumber && (
                                    <div
                                      className={`text-xs flex items-center gap-1.5 px-2 py-1.5 rounded ${
                                        bibValidation.valid
                                          ? "bg-green-50 text-green-700 border border-green-200"
                                          : "bg-red-50 text-red-700 border border-red-200"
                                      }`}
                                    >
                                      {bibValidation.valid ? (
                                        <Check className="w-3 h-3 shrink-0" />
                                      ) : (
                                        <AlertCircle className="w-3 h-3 shrink-0" />
                                      )}
                                      {bibValidation.valid
                                        ? bibValidation.universal
                                          ? bibValidation.race === "42K" || bibValidation.race === "21K"
                                            ? `Universal BIB (2000–2700) — valid for 42K/21K`
                                            : bibValidation.race === "10K"
                                            ? `Universal BIB (6000–7000) — valid for 10K`
                                            : `Universal BIB`
                                          : `Valid BIB for ${bibValidation.subCategory}`
                                        : `BIB outside range for ${bibValidation.subCategory}${bibValidation.expectedRange ? ` (${bibValidation.expectedRange.start}–${bibValidation.expectedRange.end})` : ""}`}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {!canDistributeItems() && (
                              <div className="text-xs text-center text-amber-600 bg-amber-50 p-2 rounded border border-amber-100">
                                Complete payment to enable distribution
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
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

export default OpenCategoryVerification;
