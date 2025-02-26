import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { ShoppingBag, DollarSign, QrCode, AlertTriangle, CheckCircle, Phone } from "lucide-react";
import { supabase } from "../lib/supabase";

const TshirtSales = () => {
  const [quantity, setQuantity] = useState<number>(1);
  const [mobileNumber, setMobileNumber] = useState<string>("");
  const [currentInventory, setCurrentInventory] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [updating, setUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  // Fetch current inventory on component mount
  useEffect(() => {
    fetchCurrentInventory();
  }, []);

  const fetchCurrentInventory = async () => {
    setLoading(true);
    setError("");

    try {
      const { data, error: fetchError } = await supabase
        .from("tshirt_inventory")
        .select("quantity_left")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      if (data) {
        setCurrentInventory(data.quantity_left);
      } else {
        setError("No inventory data found. Please set up inventory first.");
      }
    } catch (err) {
      console.error("Error fetching inventory:", err);
      setError("Failed to fetch current inventory");
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setQuantity(value);
    } else {
      setQuantity(1); // Default to 1 if input is invalid
    }
  };

  const handleMobileNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMobileNumber(e.target.value);
  };

  const handlePayment = async (paymentMethod: "CASH" | "QR") => {
    // Clear previous messages
    setError("");
    setSuccess("");
    
    // Validate quantity
    if (quantity <= 0) {
      setError("Quantity must be at least 1");
      return;
    }

    // Check if we have enough inventory
    if (currentInventory === null || quantity > currentInventory) {
      setError(`Not enough inventory. Only ${currentInventory || 0} T-shirts available.`);
      return;
    }

    // Validate mobile number
    if (!mobileNumber.trim()) {
      setError("Please enter a mobile number");
      return;
    }

    setUpdating(true);

    try {
      // Calculate new quantity
      const newQuantity = currentInventory - quantity;

      // Update the inventory
      const { error: updateError } = await supabase
        .from("tshirt_inventory")
        .insert({
          quantity_left: newQuantity,
          registration: false,
          payment_method: paymentMethod,
          mobile: mobileNumber.trim() // Store the mobile number
        });

      if (updateError) {
        throw updateError;
      }

      // Update local state
      setCurrentInventory(newQuantity);
      setSuccess(`Successfully sold ${quantity} T-shirt${quantity > 1 ? 's' : ''} with ${paymentMethod} payment`);
      
      // Reset quantity to 1 for next sale
      setQuantity(1);
      // Keep the mobile number for convenience in case of multiple sales to same person
    } catch (err) {
      console.error("Error updating inventory:", err);
      setError("Failed to update inventory");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <Card className="w-full max-w-md mx-auto shadow-md">
          <CardHeader className="border-b">
            <CardTitle className="text-xl font-semibold text-center">T-shirt Sales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Inventory Display */}
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Current Inventory</h3>
              {loading ? (
                <div className="text-2xl font-bold text-gray-400">Loading...</div>
              ) : (
                <div className="text-2xl font-bold text-blue-600">
                  {currentInventory !== null ? currentInventory : "N/A"}
                </div>
              )}
            </div>

            {/* Quantity Input */}
            <div className="space-y-2">
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                Sale Quantity
              </label>
              <div className="flex items-center">
                <ShoppingBag className="w-5 h-5 text-gray-400 mr-2" />
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max={currentInventory || 999}
                  value={quantity}
                  onChange={handleQuantityChange}
                  disabled={updating || loading || currentInventory === null || currentInventory === 0}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Mobile Number Input */}
            <div className="space-y-2">
              <label htmlFor="mobile" className="block text-sm font-medium text-gray-700">
                Mobile Number
              </label>
              <div className="flex items-center">
                <Phone className="w-5 h-5 text-gray-400 mr-2" />
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="Enter mobile number"
                  value={mobileNumber}
                  onChange={handleMobileNumberChange}
                  disabled={updating || loading}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Error and Success Messages */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">{success}</AlertDescription>
              </Alert>
            )}

            {/* Payment Buttons - Moved inside CardContent */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                onClick={() => handlePayment("CASH")}
                disabled={updating || loading || currentInventory === null || currentInventory === 0 || quantity > (currentInventory || 0)}
                className="w-full sm:w-1/2 bg-green-600 hover:bg-green-700"
              >
                {updating ? (
                  "Processing..."
                ) : (
                  <>
                    <DollarSign className="w-5 h-5 mr-2" />
                    Pay with Cash
                  </>
                )}
              </Button>
              <Button
                onClick={() => handlePayment("QR")}
                disabled={updating || loading || currentInventory === null || currentInventory === 0 || quantity > (currentInventory || 0)}
                className="w-full sm:w-1/2 bg-blue-600 hover:bg-blue-700"
              >
                {updating ? (
                  "Processing..."
                ) : (
                  <>
                    <QrCode className="w-5 h-5 mr-2" />
                    Pay with QR
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TshirtSales;