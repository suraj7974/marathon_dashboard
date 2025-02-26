import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { Search, User, CreditCard, Trophy, MapPin, FileCheck, Shield, AlertTriangle, Hash, Users, Building } from "lucide-react";
import { supabase } from "../lib/supabase";
import type { Participant } from "../types/participant";
import { ParticipantDetailItem } from "./participant-detail-item";

const BibDistribution = () => {
  const [participantNumber, setParticipantNumber] = useState("");
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [newBibNumber, setNewBibNumber] = useState("");
  const [bibError, setBibError] = useState("");
  const [updatingBib, setUpdatingBib] = useState(false);

  const fetchParticipantDetails = async (number: string) => {
    setLoading(true);
    setError("");
    setBibError("");

    try {
      const { data, error: searchError } = await supabase.from("registrations").select("*").eq("identification_number", number.toUpperCase()).maybeSingle();

      if (searchError) throw searchError;

      if (data) {
        setParticipant(data);
        setNewBibNumber("");
      } else {
        setError(`No participant found with ID: ${number}`);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParticipantNumber(e.target.value.toUpperCase());
  };

  const handleSearch = () => {
    if (!participantNumber.trim()) {
      setError("Please enter an identification number");
      return;
    }
    fetchParticipantDetails(participantNumber.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Function to get valid BIB range for current participant
  const getValidBibRange = (): { min: number; max: number } | null => {
    if (!participant) return null;

    const raceCategory = participant.race_category || "10KM";
    const isFromNarayanpur = participant.is_from_narayanpur;

    if (raceCategory === "5KM") {
      return { min: 5001, max: 5700 };
    } else if (raceCategory === "10KM") {
      return { min: 10000, max: 12499 };
    } else if (raceCategory === "21KM") {
      return isFromNarayanpur ? { min: 23000, max: 25999 } : { min: 21000, max: 22999 };
    }

    return null;
  };

  // Validate BIB number based on race category and location
  const validateBibNumber = (number: number): string => {
    if (!participant) return "No participant selected";

    const range = getValidBibRange();
    if (!range) return "Unable to determine valid BIB range";

    if (number < range.min || number > range.max) {
      return `BIB number must be between ${range.min}-${range.max}`;
    }

    return ""; // No error
  };

  const handleBibInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers
    const value = e.target.value.replace(/[^0-9]/g, "");
    setNewBibNumber(value);

    // Validate immediately if there's a value
    if (value) {
      const bibNumber = parseInt(value, 10);
      if (!isNaN(bibNumber)) {
        const error = validateBibNumber(bibNumber);
        setBibError(error);
      }
    } else {
      setBibError("");
    }
  };

  const handleBibKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleUpdateBib();
    }
  };

  const handleUpdateBib = async () => {
    if (!participant || !newBibNumber) return;

    try {
      const bibNumber = parseInt(newBibNumber, 10);
      if (isNaN(bibNumber)) {
        setBibError("Invalid bib number");
        return;
      }

      // Validate BIB number range
      const validationError = validateBibNumber(bibNumber);
      if (validationError) {
        setBibError(validationError);
        return;
      }

      setUpdatingBib(true);
      const { data, error } = await supabase
        .from("registrations")
        .update({ bib_num: bibNumber })
        .eq("identification_number", participant.identification_number)
        .select()
        .single();

      if (error) throw error;

      setParticipant(data);
      setNewBibNumber("");
      setBibError("");
    } catch (err) {
      setError("Failed to update bib number");
    } finally {
      setUpdatingBib(false);
    }
  };

  // Helper function to get the valid BIB range text
  const getBibRangeText = () => {
    const range = getValidBibRange();
    if (!range) return "";

    const raceCategory = participant?.race_category || "10KM";
    let categoryText = raceCategory;

    if (raceCategory === "21KM" && participant) {
      categoryText = participant.is_from_narayanpur ? "21KM Narayanpur" : "21KM Open";
    }

    return `Valid range for ${categoryText}: ${range.min}-${range.max}`;
  };

  const canAssignBib = (participant: Participant): { allowed: boolean; message: string } => {
    if (participant.is_from_narayanpur) {
      if (!participant.govt_id_verified) {
        return {
          allowed: false,
          message: "Government ID needs to be verified before BIB assignment",
        };
      }
    } else {
      if (!participant.received_tshirt) {
        return {
          allowed: false,
          message: "T-shirt must be collected before BIB assignment",
        };
      }
    }
    return { allowed: true, message: "" };
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <Card className="w-full mx-auto shadow-md">
          <CardHeader className="border-b">
            <CardTitle className="text-xl font-semibold text-center">BIB Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="flex flex-col sm:flex-row gap-3 px-4 sm:px-8 md:px-16 lg:px-32">
              <Input
                type="text"
                placeholder="Enter unique ID"
                value={participantNumber}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                disabled={loading}
                className="flex-1 h-12"
                maxLength={10}
              />
              <Button onClick={handleSearch} disabled={loading} className="bg-blue-600 hover:bg-blue-700 px-4 sm:px-8 h-12">
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

            {error && (
              <Alert variant="destructive" className="mx-4 sm:mx-8 md:mx-16 lg:mx-32">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {participant && (
              <>
                <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 shadow-sm border mx-4 sm:mx-8 md:mx-16 lg:px-32">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-x-12 lg:gap-x-24">
                    <ParticipantDetailItem icon={User} label="Name" value={`${participant.first_name} ${participant.last_name}`} iconColor="text-blue-500" />

                    <div className="flex items-start gap-3">
                      <CreditCard className="w-6 h-6 text-red-500 mt-1 shrink-0" />
                      <div className="flex-1">
                        <div className="text-sm text-gray-500">Payment Status</div>
                        <div className="mt-1">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                              participant.payment_status === "DONE" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            }`}
                          >
                            {participant.payment_status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <ParticipantDetailItem icon={Trophy} label="Race Category" value={participant.race_category || "10KM"} iconColor="text-indigo-500" />

                    <ParticipantDetailItem icon={Users} label="Gender" value={participant.gender} iconColor="text-purple-500" />

                    <ParticipantDetailItem icon={Building} label="City" value={participant.city || "Not specified"} iconColor="text-cyan-500" />

                    <ParticipantDetailItem
                      icon={MapPin}
                      label="From Narayanpur"
                      value={participant.is_from_narayanpur ? "Yes" : "No"}
                      iconColor="text-orange-500"
                    />

                    <div className="flex flex-col gap-2">
                      <ParticipantDetailItem
                        icon={FileCheck}
                        label="Government ID"
                        value={participant.govt_id}
                        iconColor="text-violet-500"
                        emptyMessage="No ID"
                      />
                      {participant.govt_id && (
                        <div className="flex items-center gap-2">
                          {participant.govt_id_verified ? (
                            <div className="flex items-center text-green-600 gap-2">
                              <Shield className="w-4 h-4" />
                              <span className="text-sm">Verified</span>
                            </div>
                          ) : (
                            <div className="flex items-center text-amber-600 gap-2">
                              <AlertTriangle className="w-4 h-4" />
                              <span className="text-sm">Not verified</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 shadow-sm border mx-4 sm:mx-8 md:mx-16 lg:px-32 mt-6">
                  <div className="flex flex-col gap-4">
                    <h3 className="font-medium text-lg">BIB Number Assignment</h3>

                    {participant.bib_num ? (
                      <div className="flex items-center gap-3">
                        <Hash className="w-6 h-6 text-green-600" />
                        <div>
                          <div className="text-2xl font-bold">{participant.bib_num}</div>
                          <div className="text-green-600 text-sm">BIB already allocated</div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {canAssignBib(participant).allowed ? (
                          <>
                            <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                              <p className="text-blue-800 font-medium">{getBibRangeText()}</p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                              <div className="relative flex-1">
                                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <Input
                                  type="text"
                                  placeholder="Enter BIB number"
                                  value={newBibNumber}
                                  onChange={handleBibInputChange}
                                  onKeyPress={handleBibKeyPress}
                                  className={`pl-10 h-12 ${bibError ? "border-red-500 focus:ring-red-500" : ""}`}
                                  disabled={updatingBib}
                                />
                              </div>
                              <Button
                                onClick={handleUpdateBib}
                                disabled={!newBibNumber || updatingBib || !!bibError}
                                className="bg-green-600 hover:bg-green-700 h-12"
                              >
                                {updatingBib ? "Updating..." : "Assign BIB Number"}
                              </Button>
                            </div>

                            {bibError && (
                              <Alert variant="destructive">
                                <AlertDescription className="flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4" />
                                  {bibError}
                                </AlertDescription>
                              </Alert>
                            )}
                          </>
                        ) : (
                          <Alert variant="destructive">
                            <AlertDescription className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4" />
                              {canAssignBib(participant).message}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BibDistribution;
