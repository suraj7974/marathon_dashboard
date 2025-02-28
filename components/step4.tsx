import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { Search, User, MapPin, Trophy, Shield, AlertTriangle, Check, Home, Package } from "lucide-react";
import { supabase } from "../lib/supabase";
import type { Participant } from "../types/participant";
import { ParticipantDetailItem } from "./participant-detail-item";

const HospitalityKitDistribution = () => {
  const [participantNumber, setParticipantNumber] = useState("");
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [updatingKit, setUpdatingKit] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>("");

  const fetchParticipantDetails = async (number: string) => {
    setLoading(true);
    setError("");
    setDebugInfo("");

    try {
      const { data, error: searchError } = await supabase.from("registrations").select("*").eq("identification_number", number.toUpperCase()).maybeSingle();

      if (searchError) throw searchError;

      if (data) {
        // Check if participant is from Narayanpur (they are not eligible)
        if (data.is_from_narayanpur) {
          setError("Local participants from Narayanpur are not eligible for hospitality kits");
          setParticipant(null);
          return;
        }

        setParticipant(data);
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

  const handleUpdateKitStatus = async () => {
    if (!participant) return;

    setUpdatingKit(true);
    setError("");
    setDebugInfo("");

    try {
      // Double-check that participant is not from Narayanpur for added security
      if (participant.is_from_narayanpur) {
        setError("Error: Local participants from Narayanpur are not eligible for hospitality kits");
        return;
      }

      // Check if payment is completed first
      if (participant.payment_status !== "DONE" && !participant.payment_offline) {
        setError("Payment must be completed before distributing hospitality kit");
        return;
      }

      // Update the kits status to true (distributed)
      const { error } = await supabase.from("registrations").update({ kits: true }).eq("identification_number", participant.identification_number).select();

      if (error) {
        console.error("Supabase error:", error);
        throw new Error(`Database error: ${error.message}`);
      }

      // Update local state
      setParticipant({
        ...participant,
        kits: true,
      });

      setDebugInfo("Hospitality kit has been successfully distributed");
    } catch (err) {
      console.error("Update error:", err);
      setError("Failed to update hospitality kit status: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setUpdatingKit(false);
    }
  };

  const canDistributeKit = () => {
    if (!participant) return false;

    // Double-check that participant is not from Narayanpur
    if (participant.is_from_narayanpur) return false;

    // Can distribute if payment is complete and kit not already distributed
    return (participant.payment_status === "DONE" || participant.payment_offline === true) && !participant.kits;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <Card className="w-full mx-auto shadow-md">
          <CardHeader className="border-b">
            <CardTitle className="text-xl font-semibold text-center">Hospitality Kit Distribution</CardTitle>
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
                <AlertDescription className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {participant && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 shadow-sm border mx-4 sm:mx-8 md:mx-16 lg:px-32">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-x-12 lg:gap-x-24">
                    <ParticipantDetailItem icon={User} label="Name" value={`${participant.first_name} ${participant.last_name}`} iconColor="text-blue-500" />

                    <ParticipantDetailItem
                      icon={Shield}
                      label="Payment Status"
                      value={participant.payment_status === "DONE" || participant.payment_offline ? "PAID" : "PENDING"}
                      iconColor={participant.payment_status === "DONE" || participant.payment_offline ? "text-green-500" : "text-red-500"}
                    />

                    <ParticipantDetailItem icon={Trophy} label="Race Category" value={participant.race_category || "10KM"} iconColor="text-indigo-500" />

                    <ParticipantDetailItem icon={MapPin} label="City" value={participant.city || "Not specified"} iconColor="text-orange-500" />

                    <ParticipantDetailItem
                      icon={Package}
                      label="Hospitality Kit"
                      value={participant.kits ? "Received" : "Not Received"}
                      iconColor={participant.kits ? "text-green-500" : "text-amber-500"}
                    />

                    <ParticipantDetailItem
                      icon={Home}
                      label="From"
                      value={participant.is_from_narayanpur ? "Narayanpur (Local)" : "Outside Narayanpur"}
                      iconColor="text-teal-500"
                    />
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 shadow-sm border mx-4 sm:mx-8 md:mx-16 lg:px-32">
                  <div className="flex flex-col gap-4">
                    <h3 className="font-medium text-lg">Hospitality Kit Distribution Status</h3>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div
                        className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                          participant.kits ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {participant.kits ? "Kit Distributed" : "Kit Not Distributed"}
                      </div>

                      {canDistributeKit() ? (
                        <Button onClick={handleUpdateKitStatus} disabled={updatingKit} className="bg-green-600 hover:bg-green-700 w-full sm:w-auto">
                          {updatingKit ? (
                            "Processing..."
                          ) : (
                            <>
                              <Package className="w-4 h-4 mr-2" />
                              Mark as Distributed
                            </>
                          )}
                        </Button>
                      ) : participant.kits ? (
                        <div className="text-green-600 text-sm flex items-center">
                          <Check className="w-4 h-4 mr-1" />
                          Kit has been distributed
                        </div>
                      ) : (
                        <div className="text-red-600 text-sm">
                          {participant.payment_status === "DONE" || participant.payment_offline
                            ? "Kit has already been distributed"
                            : "Payment must be completed before distributing kit"}
                        </div>
                      )}
                    </div>

                    {debugInfo && <div className="mt-3 text-sm text-green-600 bg-green-50 p-2 rounded border border-green-100">{debugInfo}</div>}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HospitalityKitDistribution;
