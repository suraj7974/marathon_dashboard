import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import {
  Search,
  User,
  AlertTriangle,
  MapPin,
  Trophy,
  Phone,
  Calendar,
  Medal,
  CheckCircle,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { logEvent, LogEvents } from "../lib/logger";
import type { Participant } from "../types/participant";
import { ParticipantDetailItem } from "./participant-detail-item";
import { calculateAge, normaliseRace } from "../lib/bib-validator";

const SCHEMA = "bastar_marathon";
const TABLE = "registrations";

const MedalDistribution = () => {
  const [searchValue, setSearchValue] = useState("");
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [markingEligible, setMarkingEligible] = useState(false);
  const [markingReceived, setMarkingReceived] = useState(false);

  const fetchParticipantByBib = async (bibNumber: string) => {
    setLoading(true);
    setError("");
    setSuccessMessage("");
    setParticipant(null);

    try {
      const trimmedValue = bibNumber.trim();

      if (!/^\d+$/.test(trimmedValue)) {
        setError("Please enter a valid BIB number (numbers only)");
        return;
      }

      const response = await supabase
        .schema(SCHEMA)
        .from(TABLE)
        .select("*")
        .eq("bib_number", parseInt(trimmedValue, 10));

      if (response.error) throw response.error;

      if (!response.data || response.data.length === 0) {
        setError(`No participant found with BIB number: ${trimmedValue}`);
      } else if (response.data.length === 1) {
        const foundParticipant = response.data[0];
        setParticipant(foundParticipant);

        // Auto-mark 5K participants as eligible if not already marked
        const raceCategory = foundParticipant.category
          ? normaliseRace(foundParticipant.category)
          : null;
        if (
          raceCategory === "5K" &&
          !foundParticipant.medal_eligible &&
          foundParticipant.id
        ) {
          // Silently mark as eligible in the background
          try {
            await supabase
              .schema(SCHEMA)
              .from(TABLE)
              .update({ medal_eligible: true })
              .eq("id", foundParticipant.id);

            // Update local state
            setParticipant({ ...foundParticipant, medal_eligible: true });

            // Log the event
            await logEvent(LogEvents.MEDAL_ELIGIBLE_MARKED, {
              participant_id: foundParticipant.id,
              bib_number: foundParticipant.bib_number,
              name: foundParticipant.full_name,
              auto_marked: true,
              category: "5K",
            });
          } catch (autoMarkError) {
            console.error("Error auto-marking 5K as eligible:", autoMarkError);
            // Don't show error to user, they can still manually mark if needed
          }
        }
      } else {
        // Multiple participants with same BIB (shouldn't happen, but handle it)
        setParticipant(response.data[0]);
        setError(
          `Warning: Multiple participants found with this BIB. Showing first result.`,
        );
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Error fetching participant details");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!searchValue.trim()) {
      setError("Please enter a BIB number");
      return;
    }
    fetchParticipantByBib(searchValue);
  };

  const handleMarkEligible = async () => {
    if (!participant?.id) return;

    setMarkingEligible(true);
    setError("");
    setSuccessMessage("");

    try {
      const { error: updateError } = await supabase
        .schema(SCHEMA)
        .from(TABLE)
        .update({ medal_eligible: true })
        .eq("id", participant.id);

      if (updateError) throw updateError;

      // Update local state
      setParticipant({ ...participant, medal_eligible: true });
      setSuccessMessage("Participant marked as eligible for medal!");

      // Log the event
      await logEvent(LogEvents.MEDAL_ELIGIBLE_MARKED, {
        participant_id: participant.id,
        bib_number: participant.bib_number,
        name: participant.full_name,
      });
    } catch (err) {
      console.error("Error marking eligible:", err);
      setError("Failed to mark participant as eligible");
    } finally {
      setMarkingEligible(false);
    }
  };

  const handleMarkReceived = async () => {
    if (!participant?.id) return;

    setMarkingReceived(true);
    setError("");
    setSuccessMessage("");

    try {
      // For 5K participants, mark as eligible too if not already marked
      const raceCategory = participant.category
        ? normaliseRace(participant.category)
        : null;
      const is5K = raceCategory === "5K";

      if (is5K && !participant.medal_eligible) {
        // Mark both eligible and received in one go
        const { error: updateError } = await supabase
          .schema(SCHEMA)
          .from(TABLE)
          .update({ medal_eligible: true, medal_received: true })
          .eq("id", participant.id);

        if (updateError) throw updateError;

        // Update local state
        setParticipant({
          ...participant,
          medal_eligible: true,
          medal_received: true,
        });

        // Log both events
        await logEvent(LogEvents.MEDAL_ELIGIBLE_MARKED, {
          participant_id: participant.id,
          bib_number: participant.bib_number,
          name: participant.full_name,
          auto_marked: true,
          category: "5K",
        });
      } else {
        // Just mark as received
        const { error: updateError } = await supabase
          .schema(SCHEMA)
          .from(TABLE)
          .update({ medal_received: true })
          .eq("id", participant.id);

        if (updateError) throw updateError;

        // Update local state
        setParticipant({ ...participant, medal_received: true });
      }

      setSuccessMessage("Medal marked as received!");

      // Log the received event
      await logEvent(LogEvents.MEDAL_RECEIVED, {
        participant_id: participant.id,
        bib_number: participant.bib_number,
        name: participant.full_name,
        category: raceCategory,
      });
    } catch (err) {
      console.error("Error marking received:", err);
      setError("Failed to mark medal as received");
    } finally {
      setMarkingReceived(false);
    }
  };

  const age = participant?.date_of_birth
    ? calculateAge(participant.date_of_birth)
    : null;

  const categoryDisplay = participant?.category
    ? normaliseRace(participant.category) || participant.category
    : "N/A";

  // Check if participant is 5K category
  const is5KCategory = participant
    ? normaliseRace(participant.category || "") === "5K"
    : false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <Card className="border-t-4 border-t-purple-500">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-purple-100 p-3">
                <Medal className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-gray-800">
                  Medal Distribution
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Search by BIB number and distribute medals
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Search Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-700">
              Search Participant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Enter BIB Number"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") handleSearch();
                  }}
                  className="pl-10"
                  disabled={loading}
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={loading || !searchValue.trim()}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {loading ? "Searching..." : "Search"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {successMessage && (
          <Alert className="border-green-200 bg-green-50 text-green-800">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        {/* Participant Details */}
        {participant && (
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-700">
                Participant Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Participant Info Grid */}
              <div className="grid gap-4 md:grid-cols-2">
                <ParticipantDetailItem
                  icon={User}
                  label="Name"
                  value={participant.full_name || "N/A"}
                  iconColor="text-blue-600"
                />
                <ParticipantDetailItem
                  icon={Trophy}
                  label="BIB Number"
                  value={participant.bib_number?.toString() || "Not Assigned"}
                  iconColor="text-yellow-600"
                />
                <ParticipantDetailItem
                  icon={Phone}
                  label="Phone"
                  value={participant.phone || "N/A"}
                  iconColor="text-green-600"
                />
                <ParticipantDetailItem
                  icon={Trophy}
                  label="Category"
                  value={categoryDisplay}
                  iconColor="text-purple-600"
                />
                <ParticipantDetailItem
                  icon={MapPin}
                  label="City"
                  value={participant.city || "N/A"}
                  iconColor="text-red-600"
                />
                <ParticipantDetailItem
                  icon={Calendar}
                  label="Age"
                  value={age !== null ? `${age} years` : "N/A"}
                  iconColor="text-indigo-600"
                />
              </div>

              {/* Medal Status */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h3 className="mb-3 font-semibold text-gray-700">
                  Medal Status
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Eligible for Medal:
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-semibold ${
                        participant.medal_eligible
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {participant.medal_eligible ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Medal Received:
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-semibold ${
                        participant.medal_received
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {participant.medal_received ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {is5KCategory ? (
                // For 5K: Show only Medal Received button (no eligibility check needed)
                <div className="space-y-3">
                  <Button
                    onClick={handleMarkReceived}
                    disabled={
                      markingReceived || participant.medal_received === true
                    }
                    className="w-full bg-green-600 hover:bg-green-700 h-12 text-base"
                  >
                    {markingReceived
                      ? "Marking..."
                      : participant.medal_received
                        ? "Already Received"
                        : "Mark Medal as Received"}
                  </Button>
                </div>
              ) : (
                // For other categories: Show both buttons with eligibility requirement
                <div className="space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      onClick={handleMarkEligible}
                      disabled={
                        markingEligible || participant.medal_eligible === true
                      }
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      {markingEligible
                        ? "Marking..."
                        : participant.medal_eligible
                          ? "Already Eligible"
                          : "Mark as Eligible"}
                    </Button>
                    <Button
                      onClick={handleMarkReceived}
                      disabled={
                        markingReceived ||
                        !participant.medal_eligible ||
                        participant.medal_received === true
                      }
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {markingReceived
                        ? "Marking..."
                        : participant.medal_received
                          ? "Already Received"
                          : "Medal Received"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MedalDistribution;
