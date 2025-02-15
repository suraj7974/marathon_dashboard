import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Search, User, Calendar, Mail, Phone, CreditCard, MapPin, Trophy, Shirt } from "lucide-react";
import { supabase } from "../lib/supabase";
import type { Participant } from "../types/participant";

const TShirtDistributionDashboard = () => {
  const [participantNumber, setParticipantNumber] = useState("");
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [newPaymentStatus, setNewPaymentStatus] = useState("");

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

  const handleUpdatePaymentStatus = async () => {
    if (!participant || !newPaymentStatus) return;

    setUpdatingPayment(true);
    try {
      const { error } = await supabase
        .from("dashboard")
        .update({ payment_status: newPaymentStatus.toUpperCase() })
        .eq("identification_number", participant.identification_number);

      if (error) throw error;

      // Update local state
      setParticipant({
        ...participant,
        payment_status: newPaymentStatus.toUpperCase(),
      });

      // Reset selection
      setNewPaymentStatus("");
    } catch (err) {
      setError("Failed to update payment status");
    } finally {
      setUpdatingPayment(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <Card className="w-full mx-auto shadow-md">
          <CardHeader className="border-b">
            <CardTitle className="text-xl font-semibold text-center">T-Shirt Distribution Dashboard</CardTitle>
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
                    <div className="flex items-start gap-3">
                      <User className="w-6 h-6 text-blue-500 mt-1 shrink-0" />
                      <div>
                        <div className="text-sm text-gray-500">Name</div>
                        <div className="text-base sm:text-lg font-medium mt-1 break-words">
                          {participant.first_name} {participant.last_name}
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
                              participant.payment_status === "DONE" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            }`}
                          >
                            {participant.payment_status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Calendar className="w-6 h-6 text-purple-500 mt-1 shrink-0" />
                      <div>
                        <div className="text-sm text-gray-500">Registration Date</div>
                        <div className="text-base sm:text-lg font-medium mt-1">{new Date(participant.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Mail className="w-6 h-6 text-green-500 mt-1 shrink-0" />
                      <div>
                        <div className="text-sm text-gray-500">Email</div>
                        <div className="text-base sm:text-lg font-medium mt-1 break-words">{participant.email}</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Phone className="w-6 h-6 text-yellow-500 mt-1 shrink-0" />
                      <div>
                        <div className="text-sm text-gray-500">Phone</div>
                        <div className="text-base sm:text-lg font-medium mt-1">{participant.mobile}</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <MapPin className="w-6 h-6 text-orange-500 mt-1 shrink-0" />
                      <div>
                        <div className="text-sm text-gray-500">City</div>
                        <div className="text-base sm:text-lg font-medium mt-1">{participant.city}</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Trophy className="w-6 h-6 text-indigo-500 mt-1 shrink-0" />
                      <div>
                        <div className="text-sm text-gray-500">Race Categories</div>
                        <div className="text-base sm:text-lg font-medium mt-1">{participant.race_categories || "10KM"}</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Shirt className="w-6 h-6 text-teal-500 mt-1 shrink-0" />
                      <div>
                        <div className="text-sm text-gray-500">T-shirt Size</div>
                        <div className="text-base sm:text-lg font-medium mt-1">{participant.t_shirt_size}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Separate section for payment status update */}
                <div className="bg-white rounded-lg p-4 shadow-sm border mx-4 sm:mx-8 md:mx-16 lg:mx-32">
                  <h3 className="font-medium text-lg mb-4">Update Payment Status</h3>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="w-full sm:w-auto flex-1">
                      <select
                        value={newPaymentStatus}
                        onChange={(e) => setNewPaymentStatus(e.target.value)}
                        className="block w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm h-9"
                      >
                        <option value="">Select new status</option>
                        <option value="DONE">DONE</option>
                        <option value="PENDING">PENDING</option>
                        <option value="QR">QR</option>
                        <option value="OFFLINE">OFFLINE</option>
                      </select>
                    </div>

                    <Button
                      onClick={handleUpdatePaymentStatus}
                      disabled={!newPaymentStatus || updatingPayment}
                      className="whitespace-nowrap px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto h-9"
                    >
                      {updatingPayment ? "Updating..." : "Update Status"}
                    </Button>
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
