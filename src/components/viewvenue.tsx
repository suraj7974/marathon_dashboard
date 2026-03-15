import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Input } from "./ui/input";
import { Hotel, Download, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import type { Participant } from "../types/participant";

interface VenueInfo {
  id: string | number;
  name: string;
  total_count: number;
  allocated: number;
}

const AccommodationManagement = () => {
  const [gender, setGender] = useState<string>("female");
  const [venues, setVenues] = useState<VenueInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [selectedVenue, setSelectedVenue] = useState<string>("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState<boolean>(false);

  // Fetch venues when gender changes
  useEffect(() => {
    fetchVenues(gender);
  }, [gender]);

  // Filter participants when search query changes
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredParticipants(participants);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredParticipants(
        participants.filter(
          (p) =>
            (p.identification_number ?? "").toLowerCase().includes(query) ||
            (p.full_name ?? "").toLowerCase().includes(query) ||
            (p.phone ?? "").includes(query)
        )
      );
    }
  }, [searchQuery, participants]);

  const fetchVenues = async (gender: string) => {
    setLoading(true);
    setError("");
    setSelectedVenue("");
    setParticipants([]);

    try {
      const { data, error: venueError } = await supabase.from(`venue_${gender}`).select("*").order("name");

      if (venueError) throw venueError;

      if (data) {
        setVenues(data);
      } else {
        setVenues([]);
      }
    } catch (err) {
      console.error("Fetch venues error:", err);
      setError(`Error fetching ${gender} venues: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipantsForVenue = async (venue: string) => {
    if (!venue) return;

    setLoadingParticipants(true);
    setError("");

    try {
      const { data, error: participantsError } = await supabase
        .schema("bastar_marathon")
        .from("registrations")
        .select("*")
        .eq("accommodation_venue", venue)
        .ilike("gender", gender)
        .eq("accommodation_allocated", true)
        .order("full_name");

      if (participantsError) throw participantsError;
      console.log(data);

      if (data) {
        setParticipants(data);
        setFilteredParticipants(data);
      } else {
        setParticipants([]);
        setFilteredParticipants([]);
      }
    } catch (err) {
      console.error("Fetch participants error:", err);
      setError(`Error fetching participants: ${err instanceof Error ? err.message : "Unknown error"}`);
      setParticipants([]);
      setFilteredParticipants([]);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleVenueChange = (value: string) => {
    setSelectedVenue(value);
    fetchParticipantsForVenue(value);
  };

  const handleGenderChange = (value: string) => {
    setGender(value);
    setSelectedVenue("");
    setParticipants([]);
    setFilteredParticipants([]);
    setSearchQuery("");
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  const exportToCSV = () => {
    if (filteredParticipants.length === 0) return;

    const headers = ["ID Number", "Name", "Phone", "Gender", "City", "State", "Race Category"];

    const csvData = filteredParticipants.map((p) => [
      p.identification_number ?? "",
      p.full_name ?? "",
      p.phone ?? "",
      p.gender ?? "",
      p.city || "N/A",
      p.state || "N/A",
      p.category || "N/A",
    ]);

    // Add headers as the first row
    csvData.unshift(headers);

    // Convert data to CSV string
    const csvString = csvData.map((row) => row.join(",")).join("\n");

    // Create a blob and download
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${gender}-${selectedVenue}-participants.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getVenueUtilization = (venue: VenueInfo) => {
    const percentage = venue.total_count > 0 ? Math.round((venue.allocated / venue.total_count) * 100) : 0;
    return `${venue.allocated}/${venue.total_count} (${percentage}%)`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <Card className="w-full mx-auto shadow-md">
          <CardHeader className="border-b">
            <CardTitle className="text-xl font-semibold text-center">Accommodation Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="flex flex-col md:flex-row justify-center gap-6 items-center">
              <div className="w-full md:w-1/3">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Gender</label>
                <Tabs defaultValue="female" value={gender} onValueChange={handleGenderChange} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="female">Female</TabsTrigger>
                    <TabsTrigger value="male">Male</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                <span className="block sm:inline">{error}</span>
              </div>
            )}

            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <h3 className="text-lg font-medium mb-4">Available Venues</h3>

              {loading ? (
                <div className="text-center py-4">Loading venues...</div>
              ) : venues.length === 0 ? (
                <div className="text-center py-4 text-gray-500">No venues found</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Venue Name</TableHead>
                        <TableHead>Capacity</TableHead>
                        <TableHead>Allocated</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {venues.map((venue) => (
                        <TableRow key={venue.id} className={selectedVenue === venue.name ? "bg-blue-50" : ""}>
                          <TableCell className="font-medium">{venue.name}</TableCell>
                          <TableCell>{venue.total_count}</TableCell>
                          <TableCell>{getVenueUtilization(venue)}</TableCell>
                          <TableCell>
                            <Button size="sm" variant={selectedVenue === venue.name ? "default" : "outline"} onClick={() => handleVenueChange(venue.name)}>
                              <Hotel className="h-4 w-4 mr-2" />
                              View Participants
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {selectedVenue && (
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                  <h3 className="text-lg font-medium">
                    Participants at <span className="text-blue-600">{selectedVenue}</span>
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative w-full sm:w-64">
                      <Input type="text" placeholder="Search by ID, name or phone" value={searchQuery} onChange={handleSearchChange} className="pr-8" />
                      {searchQuery && (
                        <button className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={clearSearch}>
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {filteredParticipants.length > 0 && (
                      <Button onClick={exportToCSV} variant="outline" className="whitespace-nowrap">
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                      </Button>
                    )}
                  </div>
                </div>

                {loadingParticipants ? (
                  <div className="text-center py-4">Loading participants...</div>
                ) : filteredParticipants.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    {searchQuery ? "No matching participants found" : "No participants allocated to this venue yet"}
                  </div>
                ) : (
                  <>
                    <div className="text-sm text-gray-500 mb-2">
                      Showing {filteredParticipants.length}
                      {searchQuery && participants.length !== filteredParticipants.length ? ` of ${participants.length}` : ""} participants
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID Number</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>City</TableHead>
                            <TableHead>State</TableHead>
                            <TableHead>Race Category</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredParticipants.map((participant) => (
                            <TableRow key={participant.identification_number}>
                              <TableCell className="font-medium">{participant.identification_number}</TableCell>
                              <TableCell>{participant.full_name ?? ""}</TableCell>
                              <TableCell>{participant.phone ?? ""}</TableCell>
                              <TableCell>{participant.city || "N/A"}</TableCell>
                              <TableCell>{participant.state || "N/A"}</TableCell>
                              <TableCell>{participant.category || "N/A"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccommodationManagement;
