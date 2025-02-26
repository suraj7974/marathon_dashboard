import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { Search, User, CreditCard, Trophy, Shirt, FileCheck, Shield, AlertTriangle, Check, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import type { Participant } from "../types/participant";
import { ParticipantDetailItem } from "./participant-detail-item";

const TShirtDistribution = () => {
  const [participantNumber, setParticipantNumber] = useState("");
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [updatingTshirt, setUpdatingTshirt] = useState(false);

  const fetchParticipantDetails = async (number: string) => {
    setLoading(true);
    setError("");

    try {
      const { data, error: searchError } = await supabase
        .from("registrations")
        .select("*, received_tshirt:received_tshirt::boolean")
        .eq("identification_number", number.toUpperCase())
        .maybeSingle();

      if (searchError) throw searchError;

      if (data) {
        setParticipant({
          ...data,
          received_tshirt: Boolean(data.received_tshirt),
        });
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

  const handleUpdateTshirtStatus = async (received: boolean) => {
    if (!participant) return;

    setUpdatingTshirt(true);
    try {
      const { data, error } = await supabase
        .from("registrations")
        .update({ received_tshirt: received })
        .eq("identification_number", participant.identification_number)
        .select()
        .single();

      if (error) throw error;

      setParticipant((prev) =>
        prev
          ? {
              ...prev,
              received_tshirt: Boolean(data.received_tshirt),
            }
          : null
      );
    } catch (err) {
      setError("Failed to update t-shirt status");
    } finally {
      setUpdatingTshirt(false);
    }
  };

  const canDistributeTshirt = () => {
    if (!participant) return false;
    if (participant.is_from_narayanpur) {
      return participant.payment_shirt;
    } else {
      return participant.payment_status === "DONE";
    }
  };

  const getPaymentStatusDisplay = (participant: Participant) => {
    if (participant.is_from_narayanpur) {
      return {
        status: participant.payment_shirt ? "PAID" : "PENDING",
        label: "T-shirt Payment",
      };
    }
    return {
      status: participant.payment_status,
      label: "Payment Status",
    };
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <Card className="w-full mx-auto shadow-md">
          <CardHeader className="border-b">
            <CardTitle className="text-xl font-semibold text-center">T-shirt Distribution</CardTitle>
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
              <div className="space-y-6">
                <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 shadow-sm border mx-4 sm:px-8 md:px-16 lg:px-32">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-x-12 lg:gap-x-24">
                    <ParticipantDetailItem icon={User} label="Name" value={`${participant.first_name} ${participant.last_name}`} iconColor="text-blue-500" />

                    <div className="flex items-start gap-3">
                      <CreditCard className="w-6 h-6 text-red-500 mt-1 shrink-0" />
                      <div className="flex-1">
                        <div className="text-sm text-gray-500">{getPaymentStatusDisplay(participant).label}</div>
                        <div className="mt-1">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                              getPaymentStatusDisplay(participant).status === "DONE" || getPaymentStatusDisplay(participant).status === "PAID"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {getPaymentStatusDisplay(participant).status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <ParticipantDetailItem icon={Trophy} label="Race Categories" value={participant.race_categories || "10KM"} iconColor="text-indigo-500" />

                    <ParticipantDetailItem icon={Shirt} label="T-shirt Size" value={participant.t_shirt_size} iconColor="text-teal-500" />

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

                <div className="bg-white rounded-lg p-4 shadow-sm border mx-4 sm:mx-8 md:mx-16 lg:px-32">
                  <div className="flex flex-col gap-4">
                    <h3 className="font-medium text-lg">T-shirt Distribution Status</h3>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div
                        className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                          participant.received_tshirt ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {participant.received_tshirt ? "T-shirt Distributed" : "Not Distributed"}
                      </div>

                      {canDistributeTshirt() ? (
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                          <Button
                            onClick={() => handleUpdateTshirtStatus(true)}
                            disabled={updatingTshirt || participant.received_tshirt}
                            className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Mark as Distributed
                          </Button>
                          <Button
                            onClick={() => handleUpdateTshirtStatus(false)}
                            disabled={updatingTshirt || !participant.received_tshirt}
                            variant="outline"
                            className="border-red-200 text-red-600 hover:bg-red-50 w-full sm:w-auto"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Mark as Not Distributed
                          </Button>
                        </div>
                      ) : (
                        <div className="text-red-600 text-sm">
                          {participant.is_from_narayanpur
                            ? "Payment for T-shirt is pending. Please complete the payment."
                            : "Payment is pending. Please complete the payment."}
                        </div>
                      )}
                    </div>
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

export default TShirtDistribution;
