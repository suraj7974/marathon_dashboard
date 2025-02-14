import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Search, User, Calendar, Mail, Phone, CreditCard } from "lucide-react";
import { supabase } from "../lib/supabase";
import type { Participant } from "../types/participant";

const TShirtDistributionDashboard = () => {
  const [participantNumber, setParticipantNumber] = useState("");
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchParticipantDetails = async (number: string) => {
    setLoading(true);
    setError("");

    try {
      const { data, error: searchError } = await supabase.from("dashboard").select("*").eq("identification_number", number.toUpperCase()).maybeSingle();

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <Card className="w-full max-w-3xl mx-auto shadow-md">
          <CardHeader className="border-b">
            <CardTitle className="text-xl font-semibold text-center">T-Shirt Distribution Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="flex gap-3">
              <Input
                type="text"
                placeholder="Enter unique ID"
                value={participantNumber}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                disabled={loading}
                className="flex-1 h-10"
                maxLength={10}
              />
              <Button onClick={handleSearch} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                {loading ? (
                  "Searching..."
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {participant && (
              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-blue-500 mt-1" />
                    <div>
                      <div className="text-sm text-gray-500">Name</div>
                      <div className="font-medium mt-1">
                        {participant.first_name} {participant.last_name}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-purple-500 mt-1" />
                    <div>
                      <div className="text-sm text-gray-500">Registration Date</div>
                      <div className="font-medium mt-1">{new Date(participant.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-green-500 mt-1" />
                    <div>
                      <div className="text-sm text-gray-500">Email</div>
                      <div className="font-medium mt-1 truncate max-w-[200px]">{participant.email}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-yellow-500 mt-1" />
                    <div>
                      <div className="text-sm text-gray-500">Phone</div>
                      <div className="font-medium mt-1">{participant.mobile}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 col-span-2">
                    <CreditCard className="w-5 h-5 text-red-500 mt-1" />
                    <div>
                      <div className="text-sm text-gray-500">Payment Status</div>
                      <div className="mt-1">
                        <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">{participant.payment_status}</span>
                      </div>
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

export default TShirtDistributionDashboard;
