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
  Shield,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { logEvent, LogEvents } from "../lib/logger";
import type { Participant } from "../types/participant";
import { ParticipantDetailItem } from "./participant-detail-item";
import {
  calculateAge,
  normaliseRace,
  getSubCategory,
} from "../lib/bib-validator";

const SCHEMA = "bastar_marathon";
const TABLE = "registrations";

interface ExtendedParticipant extends Participant {
  received_bib?: boolean;
}

const FiveKTenKCounter = () => {
  const [searchValue, setSearchValue] = useState("");
  const [participant, setParticipant] = useState<ExtendedParticipant | null>(
    null,
  );
  const [multipleResults, setMultipleResults] = useState<ExtendedParticipant[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);
  const [newBibNumber, setNewBibNumber] = useState("");
  const [assigningBib, setAssigningBib] = useState(false);

  const fetchParticipantDetails = async (value: string) => {
    setLoading(true);
    setError("");
    setSuccessMessage("");
    setShowPaymentMethods(false);
    setParticipant(null);
    setMultipleResults([]);
    setNewBibNumber("");

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
          .eq("phone", trimmedValue)
          .neq("payment_status", "PENDING");
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
      } else {
        // Filter for only 5K and 10K participants
        const fiveKTenKParticipants = data.filter((p) => {
          const race = normaliseRace(p.category || "");
          return race === "5K" || race === "10K";
        });

        if (fiveKTenKParticipants.length === 0) {
          setError(
            `Participant found but not a 5K/10K runner. Please use appropriate counter for ${normaliseRace(data[0].category || "") || "this category"}.`,
          );
        } else if (fiveKTenKParticipants.length === 1) {
          setParticipant(fiveKTenKParticipants[0]);
        } else {
          setMultipleResults(fiveKTenKParticipants);
          setSuccessMessage(
            `Found ${fiveKTenKParticipants.length} participants. Please select one.`,
          );
        }
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
      category: "5k10kcounter",
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
        updateQuery = updateQuery.eq(
          "identification_number",
          participant.identification_number,
        );
      }

      const { error } = await updateQuery;
      if (error) throw error;

      setParticipant((prev) =>
        prev ? { ...prev, payment_status: method } : null,
      );
      setSuccessMessage(`Payment marked as ${method}`);
      setShowPaymentMethods(false);

      logEvent(
        method === "ONLINE"
          ? LogEvents.PAYMENT_MARKED_ONLINE
          : LogEvents.PAYMENT_MARKED_CASH,
        {
          category: "5k10kcounter",
          participant_id: participant.identification_number,
          bib_num: participant.bib_number?.toString() || null,
          name: participant.full_name,
          payment_method: method,
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

          const { error: inventoryError } = await supabase
            .schema(SCHEMA)
            .rpc("decrement_bulk_inventory", rpcParams);

          if (inventoryError) {
            console.error("Inventory decrement error:", inventoryError);
            setError(
              `Inventory Error: ${inventoryError.message || "Failed to update inventory"}`,
            );
            setUpdatingItem(null);
            return;
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
        updateQuery = updateQuery.eq(
          "identification_number",
          participant.identification_number,
        );
      }

      const { error } = await updateQuery;
      if (error) throw error;

      setParticipant((prev) =>
        prev
          ? {
              ...prev,
              [column]: true,
            }
          : null,
      );
      setSuccessMessage(
        `${item === "tshirt" ? "T-shirt" : "Bib"} marked as received`,
      );

      logEvent(
        item === "tshirt"
          ? LogEvents.TSHIRT_DISTRIBUTED
          : LogEvents.BIB_DISTRIBUTED,
        {
          category: "5k10kcounter",
          participant_id: participant.identification_number,
          bib_num: participant.bib_number?.toString() || null,
          name: participant.full_name,
          ...(item === "tshirt" && { size: participant.t_shirt_size }),
        },
      );
    } catch (err) {
      setError(`Failed to mark ${item} as received`);
    } finally {
      setUpdatingItem(null);
    }
  };

  const handleIdVerification = async () => {
    if (!participant) return;

    setUpdatingItem("id");
    setError("");
    setSuccessMessage("");

    try {
      let updateQuery = supabase
        .schema(SCHEMA)
        .from(TABLE)
        .update({ govt_id_verified: true });

      if (participant.bib_number) {
        updateQuery = updateQuery.eq("bib_number", participant.bib_number);
      } else {
        updateQuery = updateQuery.eq(
          "identification_number",
          participant.identification_number,
        );
      }

      const { error } = await updateQuery;
      if (error) throw error;

      setParticipant((prev) =>
        prev ? { ...prev, govt_id_verified: true } : null,
      );
      setSuccessMessage("ID verified successfully");

      logEvent(LogEvents.ID_VERIFIED, {
        category: "5k10kcounter",
        participant_id: participant.identification_number,
        bib_num: participant.bib_number?.toString() || null,
        name: participant.full_name,
      });
    } catch (err) {
      setError("Failed to verify ID");
    } finally {
      setUpdatingItem(null);
    }
  };

  const handleBibInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const digitsOnly = value.replace(/\D/g, "");
    setNewBibNumber(digitsOnly);
  };

  const handleAssignBib = async () => {
    if (!participant) return;
    if (!newBibNumber.trim()) {
      setError("Please enter a BIB number");
      return;
    }

    const bibNum = parseInt(newBibNumber.trim(), 10);
    if (isNaN(bibNum)) {
      setError("Invalid BIB number");
      return;
    }

    setAssigningBib(true);
    setError("");
    setSuccessMessage("");

    try {
      const { data: existingBib } = await supabase
        .schema(SCHEMA)
        .from(TABLE)
        .select("identification_number, full_name")
        .eq("bib_number", bibNum)
        .neq(
          "identification_number",
          participant.identification_number || "NONE",
        )
        .maybeSingle();

      if (existingBib) {
        setError(
          `BIB ${bibNum} is already assigned to ${existingBib.full_name || "another participant"}. Please choose a different number.`,
        );
        setAssigningBib(false);
        return;
      }

      const { error } = await supabase
        .schema(SCHEMA)
        .from(TABLE)
        .update({ bib_number: bibNum })
        .eq("identification_number", participant.identification_number);

      if (error) throw error;

      setParticipant((prev) => (prev ? { ...prev, bib_number: bibNum } : null));
      setSuccessMessage(`BIB ${bibNum} assigned successfully`);
      setNewBibNumber("");

      logEvent(LogEvents.BIB_ASSIGNED, {
        category: "5k10kcounter",
        participant_id: participant.identification_number,
        bib_num: bibNum.toString(),
        name: participant.full_name,
      });
    } catch (err) {
      console.error("Error assigning BIB:", err);
      setError("Failed to assign BIB number");
    } finally {
      setAssigningBib(false);
    }
  };

  const age = participant?.date_of_birth
    ? calculateAge(participant.date_of_birth)
    : null;

  const race = participant?.category
    ? normaliseRace(participant.category)
    : null;
  const gender = participant?.gender || "";
  const city = participant?.city || "";
  const subCategory =
    race && gender && age !== null
      ? getSubCategory(race, gender, city, age)
      : "N/A";

  const isIdVerified = participant?.govt_id_verified === true;
  const isPaid =
    participant?.payment_status === "DONE" ||
    participant?.payment_status === "ONLINE" ||
    participant?.payment_status === "CASH";
  const hasBib = !!participant?.bib_number;
  const receivedTshirt = participant?.received_tshirt === true;
  const wantsTshirt = participant?.wants_tshirt !== false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-blue-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <Card className="border-t-4 border-t-cyan-500">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-cyan-100 p-3">
                <Trophy className="h-6 w-6 text-cyan-600" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-gray-800">
                  5K & 10K Counter
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Unified counter for all 5K and 10K participants
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Search Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-700">
              Search Participant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Mobile / BIB Number / Unique ID"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") handleSearch();
                  }}
                  className="pl-10"
                  disabled={loading}
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={loading || !searchValue.trim()}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                {loading ? "Searching..." : "Search"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {successMessage && (
          <Alert className="border-green-200 bg-green-50 text-green-800">
            <Check className="h-4 w-4" />
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        {/* Multiple Results Selection */}
        {multipleResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-700">
                Select Participant
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {multipleResults.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectParticipant(p)}
                    className="w-full rounded-lg border border-gray-200 p-4 text-left transition-all hover:border-cyan-500 hover:bg-cyan-50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-800">
                          {p.full_name || "N/A"}
                        </div>
                        <div className="text-sm text-gray-600">
                          {p.phone || "N/A"} • {p.city || "N/A"} •{" "}
                          {normaliseRace(p.category || "") || "N/A"}
                        </div>
                      </div>
                      <div className="text-sm font-medium text-cyan-600">
                        BIB: {p.bib_number || "Not Assigned"}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Participant Details */}
        {participant && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left Column - Info */}
            <Card className="border-l-4 border-l-cyan-500">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-700">
                  Participant Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ParticipantDetailItem
                  icon={User}
                  label="Name"
                  value={participant.full_name}
                  iconColor="text-blue-600"
                />
                <ParticipantDetailItem
                  icon={Trophy}
                  label="Race Category"
                  value={race || "N/A"}
                  iconColor="text-purple-600"
                />
                <ParticipantDetailItem
                  icon={Tag}
                  label="Sub-Category"
                  value={subCategory}
                  iconColor="text-orange-600"
                />
                <ParticipantDetailItem
                  icon={MapPin}
                  label="City"
                  value={participant.city}
                  iconColor="text-red-600"
                />
                <ParticipantDetailItem
                  icon={User}
                  label="Gender"
                  value={participant.gender}
                  iconColor="text-pink-600"
                />
                <ParticipantDetailItem
                  icon={Calendar}
                  label="Age"
                  value={age !== null ? `${age} years` : null}
                  iconColor="text-indigo-600"
                />
                <ParticipantDetailItem
                  icon={QrCode}
                  label="Unique ID"
                  value={participant.identification_number}
                  iconColor="text-teal-600"
                />
              </CardContent>
            </Card>

            {/* Right Column - Actions */}
            <div className="space-y-6">
              {/* ID Verification */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-700">
                    <Shield className="h-5 w-5" />
                    ID Verification
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Status:</span>
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-semibold ${
                          isIdVerified
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {isIdVerified ? "Verified" : "Not Verified"}
                      </span>
                    </div>
                    {!isIdVerified && (
                      <Button
                        onClick={handleIdVerification}
                        disabled={updatingItem === "id"}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {updatingItem === "id" ? "Verifying..." : "Verify ID"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Payment Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-700">
                    <CreditCard className="h-5 w-5" />
                    Payment Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Status:</span>
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-semibold ${
                          isPaid
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {participant.payment_status || "PENDING"}
                      </span>
                    </div>
                    {!isPaid && !showPaymentMethods && (
                      <Button
                        onClick={() => setShowPaymentMethods(true)}
                        size="sm"
                        variant="outline"
                      >
                        Mark as Paid
                      </Button>
                    )}
                  </div>

                  {showPaymentMethods && !isPaid && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handlePaymentAction("ONLINE")}
                        disabled={processingPayment}
                        size="sm"
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                      >
                        <QrCode className="mr-2 h-4 w-4" />
                        Online
                      </Button>
                      <Button
                        onClick={() => handlePaymentAction("CASH")}
                        disabled={processingPayment}
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <Coins className="mr-2 h-4 w-4" />
                        Cash
                      </Button>
                      <Button
                        onClick={() => setShowPaymentMethods(false)}
                        disabled={processingPayment}
                        size="sm"
                        variant="outline"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* BIB Assignment */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-700">
                    <Tag className="h-5 w-5" />
                    BIB Assignment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        BIB Number:
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-semibold ${
                          hasBib
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {participant.bib_number || "Not Assigned"}
                      </span>
                    </div>
                  </div>

                  {!hasBib && (
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Enter BIB Number"
                        value={newBibNumber}
                        onChange={handleBibInputChange}
                        disabled={assigningBib}
                      />
                      <Button
                        onClick={handleAssignBib}
                        disabled={assigningBib || !newBibNumber.trim()}
                        className="bg-cyan-600 hover:bg-cyan-700"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        {assigningBib ? "Assigning..." : "Assign"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* T-Shirt Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-700">
                    <ShoppingBag className="h-5 w-5" />
                    T-Shirt Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Wants T-Shirt:</span>
                      <div className="font-semibold">
                        {wantsTshirt ? "Yes" : "No"}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Size:</span>
                      <div className="font-semibold">
                        {participant.t_shirt_size || "N/A"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Status:</span>
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-semibold ${
                          receivedTshirt
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {receivedTshirt ? "Received" : "Not Received"}
                      </span>
                    </div>
                    {!receivedTshirt && wantsTshirt && (
                      <Button
                        onClick={() => handleUpdateItemStatus("tshirt")}
                        disabled={updatingItem === "tshirt"}
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <Check className="mr-2 h-4 w-4" />
                        {updatingItem === "tshirt"
                          ? "Marking..."
                          : "Mark Received"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FiveKTenKCounter;
