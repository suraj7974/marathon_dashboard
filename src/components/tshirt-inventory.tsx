import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import {
  Package,
  Plus,
  Minus,
  RefreshCw,
  Loader2,
  TrendingDown,
  BarChart3,
  Save,
  PackagePlus,
} from "lucide-react";
import { supabase } from "../lib/supabase";

interface InventoryItem {
  id: number;
  size: string;
  initial_stock: number;
  current_stock: number;
  updated_at: string;
}

const SIZES = ["S", "M", "L", "XL", "XXL"] as const;

const TshirtInventory = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [restockMode, setRestockMode] = useState(false);
  const [editValues, setEditValues] = useState<
    Record<string, { initial: number; current: number }>
  >({});
  const [restockValues, setRestockValues] = useState<Record<string, number>>({
    S: 0,
    M: 0,
    L: 0,
    XL: 0,
    XXL: 0,
  });

  const fetchInventory = async () => {
    setLoading(true);
    setError("");

    try {
      const { data, error: fetchError } = await supabase
        .schema("bastar_marathon")
        .from("tshirt_inventory")
        .select("*")
        .order("id");

      if (fetchError) throw fetchError;

      if (data) {
        setInventory(data);
        // Initialize edit values
        const values: Record<string, { initial: number; current: number }> = {};
        data.forEach((item) => {
          values[item.size] = {
            initial: item.initial_stock,
            current: item.current_stock,
          };
        });
        setEditValues(values);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to load inventory data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleSaveInventory = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      for (const size of SIZES) {
        const values = editValues[size];
        if (values) {
          const { error: updateError } = await supabase
            .schema("bastar_marathon")
            .from("tshirt_inventory")
            .update({
              initial_stock: values.initial,
              current_stock: values.current,
              updated_at: new Date().toISOString(),
            })
            .eq("size", size);

          if (updateError) throw updateError;
        }
      }

      setSuccess("Inventory updated successfully");
      setEditMode(false);
      await fetchInventory();
    } catch (err) {
      console.error("Save error:", err);
      setError("Failed to save inventory");
    } finally {
      setSaving(false);
    }
  };

  const handleRestock = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    const totalRestock = Object.values(restockValues).reduce(
      (sum, val) => sum + val,
      0,
    );
    if (totalRestock === 0) {
      setError("Please enter restock quantity for at least one size");
      setSaving(false);
      return;
    }

    try {
      for (const size of SIZES) {
        const addQty = restockValues[size] || 0;
        if (addQty > 0) {
          const item = inventory.find((i) => i.size === size);
          if (item) {
            const { error: updateError } = await supabase
              .schema("bastar_marathon")
              .from("tshirt_inventory")
              .update({
                initial_stock: item.initial_stock + addQty,
                current_stock: item.current_stock + addQty,
                updated_at: new Date().toISOString(),
              })
              .eq("size", size);

            if (updateError) throw updateError;
          }
        }
      }

      setSuccess(`Restocked ${totalRestock} t-shirts successfully`);
      setRestockMode(false);
      setRestockValues({ S: 0, M: 0, L: 0, XL: 0, XXL: 0 });
      await fetchInventory();
    } catch (err) {
      console.error("Restock error:", err);
      setError("Failed to restock inventory");
    } finally {
      setSaving(false);
    }
  };

  const getTotalStats = () => {
    const totalInitial = inventory.reduce(
      (sum, item) => sum + item.initial_stock,
      0,
    );
    const totalCurrent = inventory.reduce(
      (sum, item) => sum + item.current_stock,
      0,
    );
    const totalDistributed = totalInitial - totalCurrent;
    return { totalInitial, totalCurrent, totalDistributed };
  };

  const { totalInitial, totalCurrent, totalDistributed } = getTotalStats();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              T-Shirt Inventory
            </h1>
            <p className="text-gray-500">
              Monitor and manage t-shirt stock levels
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={fetchInventory}
              variant="outline"
              disabled={loading}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            {!editMode && !restockMode && (
              <>
                <Button
                  onClick={() => setRestockMode(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <PackagePlus className="w-4 h-4 mr-2" />
                  Restock
                </Button>
                <Button onClick={() => setEditMode(true)} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Edit Stock
                </Button>
              </>
            )}
            {editMode && (
              <>
                <Button
                  onClick={handleSaveInventory}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setEditMode(false);
                    fetchInventory();
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
              </>
            )}
            {restockMode && (
              <>
                <Button
                  onClick={handleRestock}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <PackagePlus className="w-4 h-4 mr-2" />
                      Add Stock
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setRestockMode(false);
                    setRestockValues({ S: 0, M: 0, L: 0, XL: 0, XXL: 0 });
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200 text-green-800">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Restock Panel */}
        {restockMode && (
          <Card className="border-0 shadow-md mb-6 border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-green-600" />
                Add New Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                Enter the quantity of new t-shirts to add. This will increase
                both total stock and available stock.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {SIZES.map((size) => (
                  <div
                    key={size}
                    className="flex flex-col items-center gap-2 p-4 bg-green-50 rounded-lg border border-green-200"
                  >
                    <span className="font-bold text-lg text-green-800">
                      {size}
                    </span>
                    <Input
                      type="number"
                      min="0"
                      value={restockValues[size] || 0}
                      onChange={(e) =>
                        setRestockValues((prev) => ({
                          ...prev,
                          [size]: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="w-20 text-center"
                      placeholder="0"
                    />
                    <span className="text-xs text-gray-500">
                      Current:{" "}
                      {inventory.find((i) => i.size === size)?.current_stock ||
                        0}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Total to add:</strong>{" "}
                  {Object.values(restockValues).reduce(
                    (sum, val) => sum + val,
                    0,
                  )}{" "}
                  t-shirts
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Stock</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {totalInitial}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Available</p>
                  <p className="text-3xl font-bold text-green-600">
                    {totalCurrent}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Distributed</p>
                  <p className="text-3xl font-bold text-amber-600">
                    {totalDistributed}
                  </p>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Inventory Table */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Stock by Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      Size
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">
                      Total Stock
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">
                      Available
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">
                      Distributed
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {SIZES.map((size) => {
                    const item = inventory.find((i) => i.size === size);
                    const initial = editMode
                      ? editValues[size]?.initial || 0
                      : item?.initial_stock || 0;
                    const current = editMode
                      ? editValues[size]?.current || 0
                      : item?.current_stock || 0;
                    const distributed = initial - current;

                    return (
                      <tr
                        key={size}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg text-lg font-bold text-gray-700">
                            {size}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          {editMode ? (
                            <Input
                              type="number"
                              min="0"
                              value={editValues[size]?.initial || 0}
                              onChange={(e) =>
                                setEditValues((prev) => ({
                                  ...prev,
                                  [size]: {
                                    ...prev[size],
                                    initial: parseInt(e.target.value) || 0,
                                  },
                                }))
                              }
                              className="w-24 mx-auto text-center"
                            />
                          ) : (
                            <span className="text-lg font-semibold">
                              {initial}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {editMode ? (
                            <Input
                              type="number"
                              min="0"
                              value={editValues[size]?.current || 0}
                              onChange={(e) =>
                                setEditValues((prev) => ({
                                  ...prev,
                                  [size]: {
                                    ...prev[size],
                                    current: parseInt(e.target.value) || 0,
                                  },
                                }))
                              }
                              className="w-24 mx-auto text-center"
                            />
                          ) : (
                            <span className="text-lg font-semibold text-green-600">
                              {current}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="text-lg font-semibold text-amber-600">
                            {distributed}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions - Increment/Decrement (only in edit mode) */}
        {editMode && (
          <Card className="border-0 shadow-md mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Quick Adjust</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                Use these buttons to quickly adjust available stock for each
                size
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {SIZES.map((size) => (
                  <div
                    key={size}
                    className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-lg"
                  >
                    <span className="font-bold text-lg">{size}</span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setEditValues((prev) => ({
                            ...prev,
                            [size]: {
                              ...prev[size],
                              current: Math.max(
                                0,
                                (prev[size]?.current || 0) - 1,
                              ),
                            },
                          }))
                        }
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-12 text-center font-semibold">
                        {editValues[size]?.current || 0}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setEditValues((prev) => ({
                            ...prev,
                            [size]: {
                              ...prev[size],
                              current: (prev[size]?.current || 0) + 1,
                            },
                          }))
                        }
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TshirtInventory;
