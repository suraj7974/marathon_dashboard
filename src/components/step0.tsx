import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { Search, User, FileCheck, Shield, AlertTriangle ,MapPin} from "lucide-react";
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

const GovernmentIdVerification = () => {
  const [participantNumber, setParticipantNumber] = useState("");
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verifyingId, setVerifyingId] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const fetchParticipantDetails = async (number: string) => {
    setLoading(true);
    setError("");
    setSuccessMessage("");

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

  const handleVerifyGovtId = async (verify: boolean) => {
    if (!participant?.govt_id) return;

    setVerifyingId(true);
    setSuccessMessage("");
    setError("");
    
    try {
      // If unverifying, update both govt_id_verified and is_from_narayanpur
      const updateData = verify 
        ? { govt_id_verified: true } 
        : { govt_id_verified: false, is_from_narayanpur: false };
      
      const { error } = await supabase
        .from("registrations")
        .update(updateData)
        .eq("identification_number", participant.identification_number);

      if (error) throw error;

      setParticipant((prev) =>
        prev
          ? {
              ...prev,
              govt_id_verified: verify,
              is_from_narayanpur: verify ? prev.is_from_narayanpur : false,
            }
          : null
      );
      
      setSuccessMessage(verify 
        ? "Government ID successfully verified" 
        : "Government ID unverified and Narayanpur status removed");
        
    } catch (err) {
      setError(`Failed to ${verify ? "verify" : "unverify"} government ID`);
    } finally {
      setVerifyingId(false);
    }
  };

  const handleRemoveNarayanpurStatus = async () => {
    if (!participant) return;

    setVerifyingId(true);
    setSuccessMessage("");
    setError("");
    
    try {
      const { error } = await supabase
        .from("registrations")
        .update({ 
          is_from_narayanpur: false,
          govt_id_verified: false,
          payment_status: "PENDING" // Added this line to update payment_status to PENDING
        })
        .eq("identification_number", participant.identification_number);

      if (error) throw error;

      setParticipant((prev) =>
        prev
          ? {
              ...prev,
              is_from_narayanpur: false,
              govt_id_verified: false,
              payment_status: "PENDING" // Update local state as well
            }
          : null
      );
      
      setSuccessMessage("Narayanpur status removed, ID verification cleared, and payment status set to PENDING");
        
    } catch (err) {
      setError("Failed to remove Narayanpur status");
    } finally {
      setVerifyingId(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <Card className="w-full mx-auto shadow-md">
          <CardHeader className="border-b">
            <CardTitle className="text-xl font-semibold text-center">Government ID Verification</CardTitle>
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
            
            {successMessage && (
              <Alert className="mx-4 sm:mx-8 md:mx-16 lg:mx-32 bg-green-50 border-green-200">
                <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
              </Alert>
            )}

            {participant && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 shadow-sm border mx-4 sm:mx-8 md:mx-16 lg:mx-32">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-x-12">
                    <ParticipantDetailItem icon={User} label="Name" value={`${participant.first_name} ${participant.last_name}`} iconColor="text-blue-500" />

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
                          <div className="mt-1 text-gray-400">No ID provided</div>
                        )}
                      </div>
                    </div>

                    {participant.govt_id && (
                      <div className="flex items-center gap-2 sm:col-span-2">
                        {participant.govt_id_verified ? (
                          <div className="flex items-center text-green-600 gap-2">
                            <Shield className="w-5 h-5" />
                            <span>ID Verified</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-amber-600 gap-2">
                            <AlertTriangle className="w-5 h-5" />
                            <span>ID Not Verified</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="sm:col-span-2 mt-2">
                      <div className={`flex items-center gap-2 ${participant.is_from_narayanpur ? "text-blue-600" : "text-gray-600"}`}>
                        <MapPin className="w-5 h-5" />
                        <span>{participant.is_from_narayanpur ? "Participant from Narayanpur" : "Not from Narayanpur"}</span>
                      </div>
                    </div>
                    
                    <div className="sm:col-span-2 mt-2">
                      <div className="flex items-center gap-2 text-gray-600">
                        <div className="text-sm text-gray-500">Payment Status:</div>
                        <span className={`font-medium ${participant.payment_status === "PENDING" ? "text-amber-600" : participant.payment_status === "COMPLETED" ? "text-green-600" : "text-gray-700"}`}>
                          {participant.payment_status || "Not Set"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {participant.govt_id && (
                  <div className="bg-white rounded-lg p-6 shadow-sm border mx-4 sm:mx-8 md:mx-16 lg:mx-32">
                    {participant.is_from_narayanpur ? (
                      <div className="space-y-4">
                        <h3 className="font-medium text-lg">Narayanpur Participant ID Verification</h3>
                        <p className="text-gray-600">This participant is from Narayanpur and requires government ID verification.</p>
                        
                        <div className="flex flex-col sm:flex-row gap-3 mt-4">
                          <Button
                            onClick={() => handleVerifyGovtId(true)}
                            disabled={verifyingId || participant.govt_id_verified}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {verifyingId ? "Processing..." : "Verify ID"}
                          </Button>
                          
                          <Button
                            onClick={handleRemoveNarayanpurStatus}
                            disabled={verifyingId || !participant.is_from_narayanpur}
                            variant="outline"
                            className="border-red-300 text-red-700 hover:bg-red-50"
                          >
                            {verifyingId ? "Processing..." : "Remove Narayanpur Status"}
                          </Button>
                        </div>
                        
                        {participant.govt_id_verified && (
                          <div className="text-green-600 flex items-center mt-2">
                            <Shield className="w-5 h-5 mr-2" />
                            ID has been verified
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <AlertTriangle className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                        <h3 className="font-medium text-lg mb-2">No ID Verification Required</h3>
                        <p className="text-gray-600">This participant is not from Narayanpur. No special ID verification is needed.</p>
                      </div>
                    )}
                  </div>
                )}
                
                {!participant.govt_id && (
                  <div className="bg-white rounded-lg p-6 shadow-sm border mx-4 sm:mx-8 md:mx-16 lg:mx-32">
                    <div className="text-center py-4">
                      <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                      <h3 className="font-medium text-lg mb-2">No Government ID Available</h3>
                      <p className="text-gray-600">This participant has not provided a government ID.</p>
                      
                      {participant.is_from_narayanpur && (
                        <div className="mt-6">
                          <p className="text-amber-700 mb-3">This participant is marked as from Narayanpur but has no ID. You can remove the Narayanpur status:</p>
                          <Button
                            onClick={handleRemoveNarayanpurStatus}
                            disabled={verifyingId}
                            variant="outline"
                            className="border-red-300 text-red-700 hover:bg-red-50 mt-2"
                          >
                            {verifyingId ? "Processing..." : "Remove Narayanpur Status"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GovernmentIdVerification;