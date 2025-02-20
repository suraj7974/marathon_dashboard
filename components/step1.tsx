import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { Search, User, Calendar, Mail, Phone, CreditCard, MapPin, Trophy, FileCheck, Shield, AlertTriangle } from "lucide-react";
import { supabase } from "../lib/supabase";
import type { Participant } from "../types/participant";
import { ParticipantDetailItem } from "./participant-detail-item";

const getIdType = (id: string): string => {
  if (!id) return "";
  
  // Remove any spaces from the ID
  const cleanId = id.replace(/\s/g, '');
  
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

const PaymentVerify = () => {
  const [participantNumber, setParticipantNumber] = useState("");
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [verifyingId, setVerifyingId] = useState(false);

  const fetchParticipantDetails = async (number: string) => {
    setLoading(true);
    setError("");

    try {
      const { data, error: searchError } = await supabase.from("registrations").select("*").eq("identification_number", number.toUpperCase()).maybeSingle();

      if (searchError) {
        throw searchError;
      }

      if (data) {
        setParticipant(data);
      } else {
        setError(`No participant found with ID: ${number}`);
        setParticipant(null);
      }
    } catch (err) {
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

  const handleMarkAsPaid = async () => {
    if (!participant) return;

    setUpdatingPayment(true);
    try {
      const { error } = await supabase
        .from("registrations")
        .update({ payment_status: "DONE" })
        .eq("identification_number", participant.identification_number);

      if (error) throw error;

      setParticipant({
        ...participant,
        payment_status: "DONE",
      });
    } catch (err) {
      setError("Failed to update payment status");
    } finally {
      setUpdatingPayment(false);
    }
  };

  const handleVerifyGovtId = async (verify: boolean) => {
    if (!participant?.govt_id) return;

    setVerifyingId(true);
    try {
      const { error } = await supabase
        .from("registrations")
        .update({ govt_id_verified: verify })
        .eq("identification_number", participant.identification_number);

      if (error) throw error;

      setParticipant((prev) =>
        prev
          ? {
              ...prev,
              govt_id_verified: verify,
            }
          : null
      );
    } catch (err) {
      setError(`Failed to ${verify ? "verify" : "unverify"} government ID`);
    } finally {
      setVerifyingId(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <Card className="w-full mx-auto shadow-md">
          <CardHeader className="border-b">
            <CardTitle className="text-xl font-semibold text-center">Dashboard</CardTitle>
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
                <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 shadow-sm border mx-4 sm:mx-8 md:mx-16 lg:mx-32">
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

                    <ParticipantDetailItem
                      icon={Calendar}
                      label="Registration Date"
                      value={new Date(participant.created_at).toLocaleDateString()}
                      iconColor="text-purple-500"
                    />

                    <ParticipantDetailItem icon={Mail} label="Email" value={participant.email} iconColor="text-green-500" />

                    <ParticipantDetailItem icon={Phone} label="Phone" value={participant.mobile} iconColor="text-yellow-500" />

                    <ParticipantDetailItem icon={MapPin} label="City" value={participant.city} iconColor="text-orange-500" />

                    <ParticipantDetailItem icon={Trophy} label="Race Categories" value={participant.race_categories || "10KM"} iconColor="text-indigo-500" />

                    <div className="flex flex-col gap-2">
                      <div className="flex items-start gap-3">
                        <FileCheck className="w-6 h-6 text-violet-500 mt-1 shrink-0" />
                        <div className="flex-1">
                          <div className="text-sm text-gray-500">Government ID</div>
                          {participant.govt_id ? (
                            <div className="mt-1">
                              <div className="font-medium">{participant.govt_id}</div>
                              <div className="text-sm text-blue-600">{getIdType(participant.govt_id)}</div>
                            </div>
                          ) : (
                            <div className="mt-1 text-gray-400">No ID</div>
                          )}
                        </div>
                      </div>
                      {participant.govt_id && (
                        <div className="flex items-center gap-2 ml-9">
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

                <div className="bg-white rounded-lg p-4 shadow-sm border mx-4 sm:mx-8 md:mx-16 lg:mx-32">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-medium text-lg mb-4">Payment Verification</h3>
                      <Button
                        onClick={handleMarkAsPaid}
                        disabled={updatingPayment || participant.payment_status === "DONE"}
                        className="w-full sm:w-auto bg-green-600 hover:bg-green-700 px-6 py-2"
                      >
                        {updatingPayment ? "Processing..." : "Mark as Paid"}
                      </Button>
                      {participant.payment_status === "DONE" && (
                        <div className="mt-2 text-green-600 text-sm flex items-center">
                          <Shield className="w-4 h-4 mr-1" />
                          Payment already verified
                        </div>
                      )}
                    </div>

                    {participant.govt_id && (
                      <div>
                        <h3 className="font-medium text-lg mb-4">Government ID Verification</h3>
                        <div className="flex gap-3">
                          <Button
                            onClick={() => handleVerifyGovtId(true)}
                            disabled={verifyingId || participant.govt_id_verified}
                            variant={participant.govt_id_verified ? "outline" : "default"}
                            className="flex-1"
                          >
                            Verify ID
                          </Button>
                          <Button
                            onClick={() => handleVerifyGovtId(false)}
                            disabled={verifyingId || !participant.govt_id_verified}
                            variant="outline"
                            className="flex-1"
                          >
                            Unverify ID
                          </Button>
                        </div>
                      </div>
                    )}
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

export default PaymentVerify;