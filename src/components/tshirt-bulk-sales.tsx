import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import {
  ShoppingCart,
  User,
  Phone,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  QrCode,
  Loader2,
  Check,
  RefreshCw,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { logEvent, LogEvents } from "../lib/logger";

interface InventoryItem {
  size: string;
  current_stock: number;
}

const SIZES = ["S", "M", "L", "XL", "XXL"] as const;
const UNIT_PRICE = 200;

const TshirtBulkSales = () => {
  const [buyerName, setBuyerName] = useState("");
  const [buyerMobile, setBuyerMobile] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({
    S: 0,
    M: 0,
    L: 0,
    XL: 0,
    XXL: 0,
  });
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch inventory
      const { data: invData, error: invError } = await supabase
        .schema("marathon")
        .from("tshirt_inventory")
        .select("size, current_stock");

      if (invError) throw invError;
      if (invData) setInventory(invData);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getStock = (size: string) => {
    const item = inventory.find((i) => i.size === size);
    return item?.current_stock || 0;
  };

  const getTotalQuantity = () => {
    return Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
  };

  const getTotalAmount = () => {
    return getTotalQuantity() * UNIT_PRICE;
  };

  const handleQuantityChange = (size: string, delta: number) => {
    setQuantities((prev) => {
      const newQty = Math.max(0, (prev[size] || 0) + delta);
      const stock = getStock(size);
      // Don't exceed available stock
      return {
        ...prev,
        [size]: Math.min(newQty, stock),
      };
    });
  };

  const handleSubmitSale = async (paymentMethod: "cash" | "qr") => {
    // Validation
    if (!buyerName.trim()) {
      setError("Please enter buyer name");
      return;
    }

    if (getTotalQuantity() === 0) {
      setError("Please select at least one t-shirt");
      return;
    }

    // Check stock availability
    for (const size of SIZES) {
      if (quantities[size] > getStock(size)) {
        setError(`Not enough stock for size ${size}`);
        return;
      }
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      // First, try to decrement inventory using the RPC function
      const { data: decrementResult, error: decrementError } = await supabase
        .schema("marathon")
        .rpc("decrement_bulk_inventory", {
          p_s: quantities.S,
          p_m: quantities.M,
          p_l: quantities.L,
          p_xl: quantities.XL,
          p_xxl: quantities.XXL,
        });

      if (decrementError) {
        // If RPC fails, try manual update
        console.warn("RPC failed, trying manual update:", decrementError);

        for (const size of SIZES) {
          if (quantities[size] > 0) {
            const { error: updateError } = await supabase
              .schema("marathon")
              .from("tshirt_inventory")
              .update({
                current_stock: getStock(size) - quantities[size],
                updated_at: new Date().toISOString(),
              })
              .eq("size", size);

            if (updateError) throw updateError;
          }
        }
      } else if (decrementResult === false) {
        setError("Insufficient stock. Please refresh and try again.");
        setSubmitting(false);
        return;
      }

      // Create the sale record
      const { error: saleError } = await supabase
        .schema("marathon")
        .from("tshirt_bulk_sales")
        .insert({
          buyer_name: buyerName.trim(),
          buyer_mobile: buyerMobile.trim() || null,
          quantity_s: quantities.S,
          quantity_m: quantities.M,
          quantity_l: quantities.L,
          quantity_xl: quantities.XL,
          quantity_xxl: quantities.XXL,
          payment_method: paymentMethod,
          payment_status: "completed",
        });

      if (saleError) throw saleError;

      setSuccess(
        `Sale completed! ${getTotalQuantity()} t-shirts sold for Rs. ${getTotalAmount()}`,
      );

      // Log bulk sale
      logEvent(LogEvents.BULK_SALE_COMPLETED, {
        category: "bulksales",
        buyer_name: buyerName.trim(),
        buyer_mobile: buyerMobile.trim() || null,
        quantities: { ...quantities },
        total_quantity: getTotalQuantity(),
        total_amount: getTotalAmount(),
        payment_method: paymentMethod,
      });

      // Reset form
      setBuyerName("");
      setBuyerMobile("");
      setQuantities({ S: 0, M: 0, L: 0, XL: 0, XXL: 0 });

      // Refresh data
      await fetchData();
    } catch (err) {
      console.error("Sale error:", err);
      setError("Failed to complete sale. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Bulk T-Shirt Sales
            </h1>
            <p className="text-gray-500">Sell t-shirts to walk-in customers</p>
          </div>
          <Button onClick={fetchData} variant="outline" disabled={loading}>
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        {/* Alerts */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200 text-green-800">
            <AlertDescription className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              {success}
            </AlertDescription>
          </Alert>
        )}

        <div className="max-w-2xl mx-auto space-y-6">
          {/* Sale Form */}
          <div className="space-y-6">
            {/* Buyer Info */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Buyer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="Enter buyer name"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      className="h-11"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Mobile (Optional)
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Enter mobile number"
                        value={buyerMobile}
                        onChange={(e) => setBuyerMobile(e.target.value)}
                        className="h-11 pl-10"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Size Selection */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-purple-600" />
                  Select Sizes & Quantity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  {SIZES.map((size) => {
                    const stock = getStock(size);
                    const qty = quantities[size];
                    const isOutOfStock = stock === 0;

                    return (
                      <div
                        key={size}
                        className={`p-4 rounded-lg border-2 transition-colors ${
                          qty > 0
                            ? "border-purple-500 bg-purple-50"
                            : isOutOfStock
                              ? "border-gray-200 bg-gray-100 opacity-50"
                              : "border-gray-200 bg-white"
                        }`}
                      >
                        <div className="text-center mb-2">
                          <span className="text-2xl font-bold text-gray-800">
                            {size}
                          </span>
                          <p className="text-xs text-gray-500">
                            Stock:{" "}
                            <span
                              className={
                                stock < 10 ? "text-red-600 font-medium" : ""
                              }
                            >
                              {stock}
                            </span>
                          </p>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuantityChange(size, -1)}
                            disabled={qty === 0 || isOutOfStock}
                            className="h-8 w-8 p-0"
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="w-8 text-center font-bold text-lg">
                            {qty}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuantityChange(size, 1)}
                            disabled={qty >= stock || isOutOfStock}
                            className="h-8 w-8 p-0"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Payment Section */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-green-600" />
                  Payment
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Summary */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Total Quantity</span>
                    <span className="font-semibold">
                      {getTotalQuantity()} t-shirts
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Unit Price</span>
                    <span className="font-semibold">Rs. {UNIT_PRICE}</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">
                        Total Amount
                      </span>
                      <span className="text-2xl font-bold text-green-600">
                        Rs. {getTotalAmount()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Breakdown by size */}
                {getTotalQuantity() > 0 && (
                  <div className="bg-blue-50 rounded-lg p-3 mb-4 text-sm">
                    <span className="font-medium text-blue-800">
                      Breakdown:{" "}
                    </span>
                    <span className="text-blue-700">
                      {SIZES.filter((s) => quantities[s] > 0)
                        .map((s) => `${quantities[s]} ${s}`)
                        .join(", ")}
                    </span>
                  </div>
                )}

                {/* Payment Buttons */}
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={() => handleSubmitSale("cash")}
                    disabled={submitting || getTotalQuantity() === 0}
                    className="h-14 bg-green-600 hover:bg-green-700 text-lg"
                  >
                    {submitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Banknote className="w-5 h-5 mr-2" />
                        Cash
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleSubmitSale("qr")}
                    disabled={submitting || getTotalQuantity() === 0}
                    className="h-14 bg-blue-600 hover:bg-blue-700 text-lg"
                  >
                    {submitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <QrCode className="w-5 h-5 mr-2" />
                        QR Payment
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TshirtBulkSales;
