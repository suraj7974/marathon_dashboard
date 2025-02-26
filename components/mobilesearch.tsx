import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { Search, User, Phone, CreditCard, Info } from "lucide-react";
import { supabase } from "../lib/supabase";
import type { Participant } from "../types/participant";

type IdNumberWithStatus = {
  idNumber: string;
  paymentStatus: string;
};

type SearchResult = {
  fullName: string;
  idNumbersWithStatus: IdNumberWithStatus[];
  onlyPendingPayments: boolean;
  entries: Participant[];
};

const MobileSearch = () => {
  const [mobileNumber, setMobileNumber] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numeric input
    const value = e.target.value.replace(/\D/g, '');
    setMobileNumber(value);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleSearch = async () => {
    if (!mobileNumber.trim() || mobileNumber.length !== 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);
    setError("");
    setSearchResults([]);

    try {
      // Query the database for all entries with the given mobile number
      const { data, error: searchError } = await supabase
        .from("registrations")
        .select("*")
        .eq("mobile", mobileNumber.trim());

      if (searchError) {
        throw searchError;
      }

      if (!data || data.length === 0) {
        setError(`No participants found with mobile number: ${mobileNumber}`);
        return;
      }

      // Process the results to group by unique names
      const participants = data as Participant[];
      const nameGroups = new Map<string, { 
        idNumbersWithStatus: Map<string, string>, 
        entries: Participant[] 
      }>();

      // Group participants by full name and collect unique identification numbers with status
      participants.forEach(participant => {
        const fullName = `${participant.first_name} ${participant.last_name}`;
        
        if (!nameGroups.has(fullName)) {
          nameGroups.set(fullName, { 
            idNumbersWithStatus: new Map<string, string>(), 
            entries: [] 
          });
        }

        const group = nameGroups.get(fullName)!;
        group.idNumbersWithStatus.set(
          participant.identification_number, 
          participant.payment_status
        );
        group.entries.push(participant);
      });

      // Convert the Map to the desired result format and apply filtering logic
      const results: SearchResult[] = Array.from(nameGroups.entries()).map(([fullName, data]) => {
        // Get all ID numbers with their payment status
        const allIdNumbersWithStatus = Array.from(data.idNumbersWithStatus.entries()).map(
          ([idNumber, status]) => ({ idNumber, paymentStatus: status })
        );

        // Filter for non-pending IDs
        const nonPendingIds = allIdNumbersWithStatus.filter(
          item => item.paymentStatus !== "PENDING"
        );

        // Check if we only have pending payments
        const onlyPendingPayments = nonPendingIds.length === 0 && allIdNumbersWithStatus.length > 0;

        // If we only have pending payments, show them all
        // Otherwise, only show non-pending IDs
        const idNumbersToShow = onlyPendingPayments 
          ? allIdNumbersWithStatus 
          : nonPendingIds;

        return {
          fullName,
          idNumbersWithStatus: idNumbersToShow,
          onlyPendingPayments,
          entries: data.entries
        };
      });

      setSearchResults(results);
    } catch (err) {
      console.error("Error searching for participants:", err);
      setError("Error fetching participant details");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <Card className="w-full mx-auto shadow-md">
          <CardHeader className="border-b">
            <CardTitle className="text-xl font-semibold text-center">Mobile Number Search</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="flex flex-col sm:flex-row gap-3 px-4 sm:px-8 md:px-16 lg:px-32">
              <Input
                type="text"
                placeholder="Enter 10-digit mobile number"
                value={mobileNumber}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                disabled={loading}
                className="flex-1 h-12"
                maxLength={10}
              />
              <Button 
                onClick={handleSearch} 
                disabled={loading || mobileNumber.length !== 10} 
                className="bg-blue-600 hover:bg-blue-700 px-4 sm:px-8 h-12"
              >
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

            {searchResults.length > 0 && (
              <div className="space-y-6 mx-4 sm:mx-8 md:mx-16 lg:mx-32">
                <h2 className="text-lg font-semibold">
                  Found {searchResults.length} unique {searchResults.length === 1 ? "name" : "names"} with mobile number {mobileNumber}
                </h2>
                
                {searchResults.map((result, index) => (
                  <Card key={index} className="overflow-hidden">
                    <CardHeader className="bg-gray-50 py-4">
                      <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-blue-500" />
                        <span className="font-medium">{result.fullName}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-4">
                        {result.onlyPendingPayments && (
                          <Alert className="bg-amber-50 border-amber-200">
                            <Info className="h-4 w-4 text-amber-600" />
                            <AlertDescription className="text-amber-700">
                              Only pending payments found for this name
                            </AlertDescription>
                          </Alert>
                        )}
                        
                        <div>
                          <h3 className="text-sm font-medium text-gray-500 mb-2">
                            Identification Numbers ({result.idNumbersWithStatus.length})
                          </h3>
                          <div className="space-y-2">
                            {result.idNumbersWithStatus.map((item, idxId) => (
                              <div key={idxId} className="flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-mono">{item.idNumber}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  item.paymentStatus === "DONE" 
                                    ? "bg-green-100 text-green-800" 
                                    : item.paymentStatus === "PENDING" 
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-blue-100 text-blue-800"
                                }`}>
                                  {item.paymentStatus}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-medium text-gray-500 mb-2">
                            Mobile Number
                          </h3>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-mono">{mobileNumber}</span>
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-medium text-gray-500 mb-2">
                            Total Entries: {result.entries.length}
                          </h3>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MobileSearch;