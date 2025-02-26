import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { Search, User, Calendar, Mail, Phone, CreditCard, MapPin, Trophy, FileCheck, Shield, AlertTriangle, Home, DollarSign } from "lucide-react";
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

  const handlePaymentAction = async () => {
    if (!participant) return;

    setUpdatingPayment(true);
    try {
      // Different update logic based on conditions
      if (participant.is_from_narayanpur && participant.govt_id_verified) {
        // For Narayanpur residents with verified ID, update payment_shirt
        const { error } = await supabase
          .from("registrations")
          .update({ payment_shirt: true })
          .eq("identification_number", participant.identification_number);
          
        if (error) throw error;
        
        setParticipant({
          ...participant,
          payment_shirt: true,
        });
      } else if (!participant.is_from_narayanpur) {
        // For non-Narayanpur residents, update payment_offline
        const { error } = await supabase
          .from("registrations")
          .update({ payment_offline: true })
          .eq("identification_number", participant.identification_number);
          
        if (error) throw error;
        
        setParticipant({
          ...participant,
          payment_offline: true,
        });
      }
    } catch (err) {
      setError("Failed to update payment status");
    } finally {
      setUpdatingPayment(false);
    }
  };

  // Helper function to determine payment verification button state
  const getPaymentVerificationSection = () => {
    if (!participant) return null;

    // Case 1: For Narayanpur residents
    if (participant.is_from_narayanpur) {
      // Need to verify government ID first
      if (!participant.govt_id_verified) {
        return (
          <div>
            <h3 className="font-medium text-lg mb-4">Payment Verification for T-shirt</h3>
            <div className="text-amber-600 text-sm flex items-center">
              <AlertTriangle className="w-4 h-4 mr-1" />
              You need to verify your government ID in order to continue
            </div>
          </div>
        );
      }
      
      // ID verified, check if t-shirt payment is done
      return (
        <div>
          <h3 className="font-medium text-lg mb-4">Payment Verification for T-shirt</h3>
          {participant.payment_shirt ? (
            <div className="text-green-600 text-sm flex items-center">
              <Shield className="w-4 h-4 mr-1" />
              T-shirt payment verified
            </div>
          ) : (
            <Button
              onClick={handlePaymentAction}
              disabled={updatingPayment}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 px-6 py-2"
            >
              {updatingPayment ? "Processing..." : "Mark T-shirt as Paid"}
            </Button>
          )}
        </div>
      );
    }
    
    // Case 2: For non-Narayanpur residents
    // If payment is already marked as DONE
    if (participant.payment_status === "DONE") {
      return (
        <div>
          <h3 className="font-medium text-lg mb-4">Payment Verification</h3>
          <div className="text-green-600 text-sm flex items-center">
            <Shield className="w-4 h-4 mr-1" />
            Payment already verified
          </div>
        </div>
      );
    }
    
    // If offline payment is already verified
    if (participant.payment_offline) {
      return (
        <div>
          <h3 className="font-medium text-lg mb-4">Payment Verification</h3>
          <div className="text-green-600 text-sm flex items-center">
            <Shield className="w-4 h-4 mr-1" />
            Payment already verified
          </div>
        </div>
      );
    }
    
    // Payment pending, show mark as paid button
    return (
      <div>
        <h3 className="font-medium text-lg mb-4">Payment Verification</h3>
        <Button
          onClick={handlePaymentAction}
          disabled={updatingPayment}
          className="w-full sm:w-auto bg-green-600 hover:bg-green-700 px-6 py-2"
        >
          {updatingPayment ? "Processing..." : "Mark as Paid"}
        </Button>
      </div>
    );
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
                              participant.payment_status === "DONE" || participant.payment_offline ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            }`}
                          >
                            {participant.payment_status === "DONE" || participant.payment_offline ? "DONE" : participant.payment_status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* New Offline Payment Status Section */}
                    <div className="flex items-start gap-3">
                      <DollarSign className="w-6 h-6 text-emerald-500 mt-1 shrink-0" />
                      <div className="flex-1">
                        <div className="text-sm text-gray-500"> Payment Mode</div>
                        <div className="mt-1">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                              participant.payment_offline ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {participant.payment_offline ? "Offline" : "Other"}
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

                    {/* Narayanpur status section with T-shirt payment info */}
                    <div className="flex items-start gap-3">
                      <Home className="w-6 h-6 text-teal-500 mt-1 shrink-0" />
                      <div className="flex-1">
                        <div className="text-sm text-gray-500">From Narayanpur</div>
                        <div className="mt-1">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                              participant.is_from_narayanpur ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {participant.is_from_narayanpur ? "Yes" : "No"}
                          </span>
                          
                          {participant.is_from_narayanpur && (
                            <div className="mt-1 text-sm">
                              <span className="font-medium">T-shirt Payment:</span>{" "}
                              <span className={participant.payment_shirt ? "text-green-600" : "text-amber-600"}>
                                {participant.payment_shirt ? "Verified" : "Not Verified"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <ParticipantDetailItem icon={Trophy} label="Race Categories" value={participant.race_category || "10KM"} iconColor="text-indigo-500" />

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

                <div className="bg-white rounded-lg p-4 shadow-sm border mx-4 sm:mx-8 md:px-16 lg:px-32">
                  {getPaymentVerificationSection()}
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