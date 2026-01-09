import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { Search, User, CreditCard, Trophy, MapPin, FileCheck, Shield, AlertTriangle, Users, Building, Phone, Tag, Check, X, Calendar } from "lucide-react";
import { supabase } from "../lib/supabase";
import type { Participant } from "../types/participant";
import { ParticipantDetailItem } from "./participant-detail-item";

const ViewDetails = () => {
  const [searchInput, setSearchInput] = useState("");
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchParticipantDetails = async (input: string) => {
    setLoading(true);
    setError("");

    try {
      // First try to search by bib_num if input is numeric (primary search)
      if (/^\d+$/.test(input)) {
        const bibNumber = parseInt(input, 10);
        const { data: bibData, error: bibError } = await supabase
          .schema("marathon")
          .from("registrations_2026")
          .select("*")
          .eq("bib_num", bibNumber)
          .maybeSingle();

        if (bibError) throw bibError;

        if (bibData) {
          setParticipant(bibData);
          return;
        }
      }

      // If no results by BIB or input is not numeric, try to search by identification_number (secondary)
      const { data: idData } = await supabase
        .schema("marathon")
        .from("registrations_2026")
        .select("*")
        .eq("identification_number", input.toUpperCase())
        .maybeSingle();

      if (idData) {
        setParticipant(idData);
        setLoading(false);
        return;
      }

      // If no participant found through either method
      setError(`No participant found with BIB or ID: ${input}`);
      setParticipant(null);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Error fetching participant details");
      setParticipant(null);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  };

  const handleSearch = () => {
    if (!searchInput.trim()) {
      setError("Please enter a BIB Number or ID");
      return;
    }
    fetchParticipantDetails(searchInput.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Helper function to format date
  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return "Not specified";

    try {
      const date = new Date(dateString);
      // Check if valid date
      if (isNaN(date.getTime())) return "Invalid date";

      // Format as DD/MM/YYYY
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch (error) {
      console.error("Date formatting error:", error);
      return "Error formatting date";
    }
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <Card className="w-full mx-auto shadow-md">
          <CardHeader className="border-b">
            <CardTitle className="text-xl font-semibold text-center">View Participant Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="flex flex-col sm:flex-row gap-3 px-4 sm:px-8 md:px-16 lg:px-32">
              <Input
                type="text"
                placeholder="Enter BIB Number or ID"
                value={searchInput}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                disabled={loading}
                className="flex-1 h-12"
              />
              <Button onClick={handleSearch} disabled={loading} className="bg-blue-600 hover:bg-blue-700 px-4 sm:px-8 h-12">
                {loading ? (
                  "Searching..."
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" /> Search
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
              <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 shadow-sm border mx-4 sm:mx-8 md:mx-16 lg:px-32">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-x-12 lg:gap-x-24">
                  <ParticipantDetailItem icon={User} label="Name" value={`${participant.first_name} ${participant.last_name}`} iconColor="text-blue-500" />

                  <ParticipantDetailItem icon={Phone} label="Mobile" value={participant.mobile} iconColor="text-green-500" />

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
                  <ParticipantDetailItem icon={Calendar} label="Date of Birth" value={formatDate(participant.date_of_birth)} iconColor="text-green-500" />

                  <ParticipantDetailItem icon={Users} label="Gender" value={participant.gender} iconColor="text-purple-500" />

                  <ParticipantDetailItem icon={Building} label="City" value={participant.city || "Not specified"} iconColor="text-cyan-500" />

                  {/* Bib Number Status */}
                  <div className="flex items-start gap-3">
                    <Tag className="w-6 h-6 text-amber-500 mt-1 shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm text-gray-500">Bib Number</div>
                      <div className="mt-1">
                        {participant.bib_num ? (
                          <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            #{participant.bib_num.toString()}
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-gray-600">
                            <X className="w-4 h-4 mr-1 text-red-500" /> Not allocated
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* T-shirt Size */}
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
                      <div className="text-sm text-gray-500">T-shirt Size</div>
                      <div className="mt-1 font-medium">{participant.t_shirt_size || "Not specified"}</div>
                    </div>
                  </div>

                  {/* T-shirt Distribution Status */}
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 text-pink-500 mt-1 shrink-0 flex items-center justify-center">
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
                      <div className="text-sm text-gray-500">T-shirt Distribution</div>
                      <div className="mt-1">
                        {participant.received_tshirt ? (
                          <span className="inline-flex items-center text-green-600">
                            <Check className="w-4 h-4 mr-1" /> Distributed
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-red-600">
                            <X className="w-4 h-4 mr-1" /> Not distributed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ViewDetails;
