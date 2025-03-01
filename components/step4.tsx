import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { Search, User, MapPin, Trophy, Shield, AlertTriangle, Check, Home, Package, Hotel, AlertCircle } from "lucide-react";
import { supabase } from "../lib/supabase";
import type { Participant } from "../types/participant";
import { ParticipantDetailItem } from "./participant-detail-item";
import { data } from "react-router-dom";

const HospitalityKitDistribution = () => {
  const [participantNumber, setParticipantNumber] = useState("");
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [updatingKit, setUpdatingKit] = useState(false);
  const [allocatingAccommodation, setAllocatingAccommodation] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [accommodationInfo, setAccommodationInfo] = useState<string>("");

  const fetchParticipantDetails = async (number: string) => {
    setLoading(true);
    setError("");
    setDebugInfo("");
    setAccommodationInfo("");

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

  const handleAllocateAccommodation = async () => {
    if (!participant) return;

    setAllocatingAccommodation(true);
    setError("");
    setAccommodationInfo("");
    
    try {
      // Determine if eligible for accommodation
      if (participant.is_from_narayanpur) {
        setError("Local participants are not eligible for accommodation");
        return;
      }

      if (participant.payment_status !== "DONE" && !participant.payment_offline) {
        setError("Payment must be completed before allocating accommodation");
        return;
      }
      
      // Get participant's state and city
      const participantCity = participant.city ? participant.city.toLowerCase() : '';
      const participantState = participant.state ? participant.state.toLowerCase() : '';
      let cityToSearch = participantCity;
      
      // If not from Chhattisgarh, use "other"
      if (participantState.toLowerCase().trim() !== 'chattisgarh') {
        cityToSearch = 'other';
      }
      
      let allocatedVenue = "";
      // let _allocatedId = null;
      
      if (participant.gender === 'FEMALE') {
        // First, find the venue from female_stay_inventory based on city
        const { data: venueData, error: venueError } = await supabase
          .from('female_stay_inventory')
          .select('venue')
          .ilike('city', cityToSearch)
          .maybeSingle();
          console.log(data);
          
        if (venueError) throw venueError;
        
        if (!venueData) {
          // If no venue found for this city, use "other"
          const { data: otherVenueData, error: otherVenueError } = await supabase
            .from('female_stay_inventory')
            .select('venue')
            .eq('city', 'other')
            .maybeSingle();
            
          if (otherVenueError) throw otherVenueError;
          if (otherVenueData) {
            allocatedVenue = otherVenueData.venue;
          } else {
            throw new Error("No venue found for females");
          }
        } else {
          allocatedVenue = venueData.venue;
        }
        
        // Now check availability in venue_female and allocate
        const { data: venueAvailability, error: availabilityError } = await supabase
          .from('venue_female')
          .select('*')
          .eq('name', allocatedVenue)
          .maybeSingle();
          
        if (availabilityError) throw availabilityError;
        
        if (!venueAvailability) {
          throw new Error(`Venue ${allocatedVenue} not found in the system`);
        }
        
        // Check if venue has capacity
        if (venueAvailability.allocated < venueAvailability.total_count) {
          // Update allocation count
          const { error: updateError } = await supabase
            .from('venue_female')
            .update({ allocated: venueAvailability.allocated + 1 })
            .eq('id', venueAvailability.id);
            
          if (updateError) throw updateError;
          
          // _allocatedId = venueAvailability.id;
        } else {
          // Allocate to reserve venue
          allocatedVenue = "Reserve_LiveliHood";
          
          // Get the LiveliHood venue and update it
          const { data: reserveVenue, error: reserveError } = await supabase
            .from('venue_female')
            .select('*')
            .eq('name', 'Reserve_LiveliHood')
            .maybeSingle();
            
          if (reserveError) throw reserveError;
          
          if (reserveVenue) {
            const { error: updateReserveError } = await supabase
              .from('venue_female')
              .update({ allocated: reserveVenue.allocated + 1 })
              .eq('id', reserveVenue.id);
              
            if (updateReserveError) throw updateReserveError;
            
            // _allocatedId = reserveVenue.id;
          } else {
            throw new Error("Reserve venue not found");
          }
        }
      } else {
        // Handle male accommodation
        const { data: venueData, error: venueError } = await supabase
          .from('male_stay_inventory')
          .select('venue')
          .ilike('city', cityToSearch)
          .maybeSingle();
          
        if (venueError) throw venueError;
        
        if (!venueData) {
          // If no venue found for this city, use "other"
          const { data: otherVenueData, error: otherVenueError } = await supabase
            .from('male_stay_inventory')
            .select('venue')
            .eq('city', 'other')
            .maybeSingle();
            
          if (otherVenueError) throw otherVenueError;
          if (otherVenueData) {
            allocatedVenue = otherVenueData.venue;
          } else {
            throw new Error("No venue found for males");
          }
        } else {
          allocatedVenue = venueData.venue;
        }
        
        // Now check availability in venue_male and allocate
        const { data: venueAvailability, error: availabilityError } = await supabase
          .from('venue_male')
          .select('*')
          .eq('name', allocatedVenue)
          .maybeSingle();
          
        if (availabilityError) throw availabilityError;
        
        if (!venueAvailability) {
          throw new Error(`Venue ${allocatedVenue} not found in the system`);
        }
        
        // Check if venue has capacity
        if (venueAvailability.allocated < venueAvailability.total_count) {
          // Update allocation count
          const { error: updateError } = await supabase
            .from('venue_male')
            .update({ allocated: venueAvailability.allocated + 1 })
            .eq('id', venueAvailability.id);
            
          if (updateError) throw updateError;
          
          // _allocatedId = venueAvailability.id;
        } else {
          // Try to allocate to one of the reserve venues
          const reserveVenues = ['ramoutin college', 'Dewangan bhavan', 'Officer Club', 'Muslim venue'];
          
          // Find a reserve venue with availability
          let reserveVenueFound = false;
          
          for (const reserveName of reserveVenues) {
            const { data: reserveVenue, error: reserveError } = await supabase
              .from('venue_male')
              .select('*')
              .eq('name', reserveName)
              .maybeSingle();
              
            if (reserveError) continue;
            
            if (reserveVenue && reserveVenue.allocated < reserveVenue.total_count) {
              const { error: updateReserveError } = await supabase
                .from('venue_male')
                .update({ allocated: reserveVenue.allocated + 1 })
                .eq('id', reserveVenue.id);
                
              if (updateReserveError) continue;
              
              allocatedVenue = reserveName;
              // _allocatedId = reserveVenue.id;
              reserveVenueFound = true;
              break;
            }
          }
          
          if (!reserveVenueFound) {
            // All reserve venues are full, assign to the first one anyway
            const { data: firstReserve, error: firstReserveError } = await supabase
              .from('venue_male')
              .select('*')
              .eq('name', reserveVenues[0])
              .maybeSingle();
              
            if (firstReserveError) throw firstReserveError;
            
            if (firstReserve) {
              const { error: updateFirstReserveError } = await supabase
                .from('venue_male')
                .update({ allocated: firstReserve.allocated + 1 })
                .eq('id', firstReserve.id);
                
              if (updateFirstReserveError) throw updateFirstReserveError;
              
              allocatedVenue = reserveVenues[0];
              // _allocatedId = firstReserve.id;
            } else {
              throw new Error("No reserve venues found");
            }
          }
        }
      }
      
      // Update participant record with allocated venue
      const { error: updateParticipantError } = await supabase
        .from('registrations')
        .update({ 
          accommodation_venue: allocatedVenue,
          accommodation_allocated: true 
        })
        .eq('identification_number', participant.identification_number);
        
      if (updateParticipantError) throw updateParticipantError;
      
      // Update local state
      setParticipant({
        ...participant,
        accommodation_venue: allocatedVenue,
        accommodation_allocated: true
      });
      
      setAccommodationInfo(`Successfully allocated to: ${allocatedVenue}`);
      
    } catch (err) {
      console.error("Accommodation allocation error:", err);
      setError("Failed to allocate accommodation: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setAllocatingAccommodation(false);
    }
  };

  const canDistributeKit = () => {
    if (!participant) return false;

    // Double-check that participant is not from Narayanpur
    if (participant.is_from_narayanpur) return false;

    // Can distribute if payment is complete and kit not already distributed
    return (participant.payment_status === "DONE" || participant.payment_offline === true) && !participant.kits;
  };
  
  const canAllocateAccommodation = () => {
    if (!participant) return false;
    
    // Cannot allocate for local participants
    if (participant.is_from_narayanpur) return false;
    
    // Payment must be complete
    if (participant.payment_status !== "DONE" && !participant.payment_offline) return false;
    
    // Must not already have accommodation allocated
    return !participant.accommodation_allocated;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <Card className="w-full mx-auto shadow-md">
          <CardHeader className="border-b">
            <CardTitle className="text-xl font-semibold text-center">Hospitality Kit & Accommodation</CardTitle>
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
                    
                    <ParticipantDetailItem icon={User} label="Gender" value={participant.gender || "Not specified"} iconColor="text-purple-500" />

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
                    
                    <ParticipantDetailItem
                      icon={Hotel}
                      label="Accommodation"
                      value={participant.accommodation_allocated ? participant.accommodation_venue || "Allocated" : "Not Allocated"}
                      iconColor={participant.accommodation_allocated ? "text-green-500" : "text-amber-500"}
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
                
                <div className="bg-white rounded-lg p-4 shadow-sm border mx-4 sm:mx-8 md:mx-16 lg:px-32">
                  <div className="flex flex-col gap-4">
                    <h3 className="font-medium text-lg">Accommodation Allocation Status</h3>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div
                        className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                          participant.accommodation_allocated ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {participant.accommodation_allocated ? "Accommodation Allocated" : "Accommodation Not Allocated"}
                      </div>

                      {canAllocateAccommodation() ? (
                        <Button onClick={handleAllocateAccommodation} disabled={allocatingAccommodation} className="bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto">
                          {allocatingAccommodation ? (
                            "Processing..."
                          ) : (
                            <>
                              <Hotel className="w-4 h-4 mr-2" />
                              Allocate Accommodation
                            </>
                          )}
                        </Button>
                      ) : participant.accommodation_allocated ? (
                        <div className="text-green-600 text-sm flex items-center">
                          <Check className="w-4 h-4 mr-1" />
                          Accommodation has been allocated
                        </div>
                      ) : (
                        <div className="text-red-600 text-sm flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {participant.is_from_narayanpur 
                            ? "Local participants are not eligible for accommodation" 
                            : participant.payment_status !== "DONE" && !participant.payment_offline
                              ? "Payment must be completed before allocating accommodation"
                              : "Cannot allocate accommodation at this time"}
                        </div>
                      )}
                    </div>

                    {accommodationInfo && (
                      <div className="mt-3 text-sm text-green-600 bg-green-50 p-2 rounded border border-green-100">{accommodationInfo}</div>
                    )}
                    
                    {participant.accommodation_allocated && participant.accommodation_venue && (
                      <div className="mt-3 bg-blue-50 p-3 rounded border border-blue-100">
                        <h4 className="font-medium text-blue-700">Accommodation Details</h4>
                        <p className="text-blue-600 mt-1">Venue: {participant.accommodation_venue}</p>
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

export default HospitalityKitDistribution; 
