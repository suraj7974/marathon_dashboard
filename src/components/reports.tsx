import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  RefreshCw,
  BarChart3,
  Users,
  CreditCard,
  ShoppingBag,
  Tag,
  Shield,
  Shirt,
  Calendar,
} from "lucide-react";
import { supabase } from "../lib/supabase";

interface LogEntry {
  id: number;
  uid: string;
  time: string;
  Event: string;
  metadata: {
    category?: string;
    payment_method?: string;
    quantities?: Record<string, number>;
    total_quantity?: number;
    total_amount?: number;
    [key: string]: unknown;
  };
}

interface UidMapping {
  uid: string;
  Name: string;
}

interface RegistrationStats {
  uid: string;
  name: string;
  cashPayments: number;
  onlinePayments: number;
  govtIdVerified: number;
  tshirtDistributed: number;
  bibAssigned: number;
  bibDistributed: number;
}

interface BulkSalesStats {
  uid: string;
  name: string;
  cashSales: number;
  qrSales: number;
  cashAmount: number;
  qrAmount: number;
  sizeS: number;
  sizeM: number;
  sizeL: number;
  sizeXL: number;
  sizeXXL: number;
  totalQuantity: number;
  totalAmount: number;
}

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [registrationStats, setRegistrationStats] = useState<RegistrationStats[]>([]);
  const [bulkSalesStats, setBulkSalesStats] = useState<BulkSalesStats[]>([]);
  
  // Date filter state - empty by default (no filter applied)
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");

  // Parse log timestamp for comparison
  const parseLogTimestamp = (timeStr: string): Date => {
    // Handle format: "2026-01-28 05:00:34.123000+05:30"
    const cleanTime = timeStr.replace(/\+.*$/, ""); // Remove timezone
    return new Date(cleanTime.replace(" ", "T"));
  };

  // Check if log is within date range (returns true if no filter applied)
  const isWithinDateRange = (logTime: string): boolean => {
    // If no dates set, show all data
    if (!startDate && !endDate) return true;
    
    const logDate = parseLogTimestamp(logTime);
    
    // If only start date set
    if (startDate && !endDate) {
      const start = new Date(`${startDate}T${startTime || "00:00"}:00`);
      return logDate >= start;
    }
    
    // If only end date set
    if (!startDate && endDate) {
      const end = new Date(`${endDate}T${endTime || "23:59"}:59`);
      return logDate <= end;
    }
    
    // Both dates set
    const start = new Date(`${startDate}T${startTime || "00:00"}:00`);
    const end = new Date(`${endDate}T${endTime || "23:59"}:59`);
    return logDate >= start && logDate <= end;
  };

  const fetchReports = async () => {
    setLoading(true);
    setError("");

    try {
      // Fetch all logs
      const { data: logs, error: logsError } = await supabase
        .schema("marathon")
        .from("dashboard_log")
        .select("*")
        .order("time", { ascending: false });

      if (logsError) throw logsError;

      // Fetch UID mappings for names
      const { data: uidMappings, error: uidError } = await supabase
        .schema("marathon")
        .from("uid_mapping")
        .select("uid, Name");

      if (uidError) throw uidError;

      const uidNameMap = new Map<string, string>();
      (uidMappings as UidMapping[])?.forEach((mapping) => {
        uidNameMap.set(mapping.uid, mapping.Name);
      });

      // Process logs - filter by date range
      const regStats = new Map<string, RegistrationStats>();
      const bulkStats = new Map<string, BulkSalesStats>();

      (logs as LogEntry[])?.forEach((log) => {
        // Skip if outside date range
        if (!isWithinDateRange(log.time)) return;

        const uid = log.uid;
        const name = uidNameMap.get(uid) || uid;
        const category = log.metadata?.category;

        // Registration categories (nprbastarcategory, opencategory)
        if (category === "nprbastarcategory" || category === "opencategory") {
          if (!regStats.has(uid)) {
            regStats.set(uid, {
              uid,
              name,
              cashPayments: 0,
              onlinePayments: 0,
              govtIdVerified: 0,
              tshirtDistributed: 0,
              bibAssigned: 0,
              bibDistributed: 0,
            });
          }

          const stats = regStats.get(uid)!;

          switch (log.Event) {
            case "PAYMENT_MARKED_CASH":
              stats.cashPayments++;
              break;
            case "PAYMENT_MARKED_ONLINE":
              stats.onlinePayments++;
              break;
            case "ID_VERIFIED":
              stats.govtIdVerified++;
              break;
            case "TSHIRT_DISTRIBUTED":
              stats.tshirtDistributed++;
              break;
            case "BIB_ASSIGNED":
              stats.bibAssigned++;
              break;
            case "BIB_DISTRIBUTED":
              stats.bibDistributed++;
              break;
          }
        }

        // Bulk sales category
        if (category === "bulksales" && log.Event === "BULK_SALE_COMPLETED") {
          if (!bulkStats.has(uid)) {
            bulkStats.set(uid, {
              uid,
              name,
              cashSales: 0,
              qrSales: 0,
              cashAmount: 0,
              qrAmount: 0,
              sizeS: 0,
              sizeM: 0,
              sizeL: 0,
              sizeXL: 0,
              sizeXXL: 0,
              totalQuantity: 0,
              totalAmount: 0,
            });
          }

          const stats = bulkStats.get(uid)!;
          const paymentMethod = log.metadata?.payment_method;
          const quantities = log.metadata?.quantities || {};
          const amount = (log.metadata?.total_amount as number) || 0;
          const quantity = (log.metadata?.total_quantity as number) || 0;

          if (paymentMethod === "cash") {
            stats.cashSales++;
            stats.cashAmount += amount;
          } else if (paymentMethod === "qr") {
            stats.qrSales++;
            stats.qrAmount += amount;
          }

          stats.sizeS += (quantities.S as number) || 0;
          stats.sizeM += (quantities.M as number) || 0;
          stats.sizeL += (quantities.L as number) || 0;
          stats.sizeXL += (quantities.XL as number) || 0;
          stats.sizeXXL += (quantities.XXL as number) || 0;
          stats.totalQuantity += quantity;
          stats.totalAmount += amount;
        }
      });

      setRegistrationStats(Array.from(regStats.values()));
      setBulkSalesStats(Array.from(bulkStats.values()));
    } catch (err) {
      console.error("Error fetching reports:", err);
      setError("Failed to load reports. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Calculate totals for registration stats
  const regTotals = registrationStats.reduce(
    (acc, stat) => ({
      cashPayments: acc.cashPayments + stat.cashPayments,
      onlinePayments: acc.onlinePayments + stat.onlinePayments,
      govtIdVerified: acc.govtIdVerified + stat.govtIdVerified,
      tshirtDistributed: acc.tshirtDistributed + stat.tshirtDistributed,
      bibAssigned: acc.bibAssigned + stat.bibAssigned,
      bibDistributed: acc.bibDistributed + stat.bibDistributed,
    }),
    { cashPayments: 0, onlinePayments: 0, govtIdVerified: 0, tshirtDistributed: 0, bibAssigned: 0, bibDistributed: 0 }
  );

  // Calculate totals for bulk sales
  const bulkTotals = bulkSalesStats.reduce(
    (acc, stat) => ({
      cashSales: acc.cashSales + stat.cashSales,
      qrSales: acc.qrSales + stat.qrSales,
      cashAmount: acc.cashAmount + stat.cashAmount,
      qrAmount: acc.qrAmount + stat.qrAmount,
      sizeS: acc.sizeS + stat.sizeS,
      sizeM: acc.sizeM + stat.sizeM,
      sizeL: acc.sizeL + stat.sizeL,
      sizeXL: acc.sizeXL + stat.sizeXL,
      sizeXXL: acc.sizeXXL + stat.sizeXXL,
      totalQuantity: acc.totalQuantity + stat.totalQuantity,
      totalAmount: acc.totalAmount + stat.totalAmount,
    }),
    {
      cashSales: 0,
      qrSales: 0,
      cashAmount: 0,
      qrAmount: 0,
      sizeS: 0,
      sizeM: 0,
      sizeL: 0,
      sizeXL: 0,
      sizeXXL: 0,
      totalQuantity: 0,
      totalAmount: 0,
    }
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-blue-600" />
              Dashboard Reports
            </h1>
            <p className="text-gray-500">Activity reports grouped by user</p>
          </div>
          <Button onClick={fetchReports} variant="outline" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Date Filter */}
        <Card className="mb-6 border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Date & Time Filter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <Button onClick={fetchReports} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                {loading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Apply Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Registration Reports */}
        <Card className="mb-8 border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              Registration Counter Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : registrationStats.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No data available</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">User</TableHead>
                      <TableHead className="text-center font-semibold">
                        <div className="flex items-center justify-center gap-1">
                          <CreditCard className="w-4 h-4" />
                          Cash
                        </div>
                      </TableHead>
                      <TableHead className="text-center font-semibold">
                        <div className="flex items-center justify-center gap-1">
                          <CreditCard className="w-4 h-4" />
                          Online
                        </div>
                      </TableHead>
                      <TableHead className="text-center font-semibold">
                        <div className="flex items-center justify-center gap-1">
                          <Shield className="w-4 h-4" />
                          ID Verified
                        </div>
                      </TableHead>
                      <TableHead className="text-center font-semibold">
                        <div className="flex items-center justify-center gap-1">
                          <Shirt className="w-4 h-4" />
                          T-Shirt
                        </div>
                      </TableHead>
                      <TableHead className="text-center font-semibold">
                        <div className="flex items-center justify-center gap-1">
                          <Tag className="w-4 h-4" />
                          BIB Assigned
                        </div>
                      </TableHead>
                      <TableHead className="text-center font-semibold">
                        <div className="flex items-center justify-center gap-1">
                          <Tag className="w-4 h-4" />
                          BIB Distributed
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registrationStats.map((stat) => (
                      <TableRow key={stat.uid}>
                        <TableCell className="font-medium">{stat.name}</TableCell>
                        <TableCell className="text-center">{stat.cashPayments}</TableCell>
                        <TableCell className="text-center">{stat.onlinePayments}</TableCell>
                        <TableCell className="text-center">{stat.govtIdVerified}</TableCell>
                        <TableCell className="text-center">{stat.tshirtDistributed}</TableCell>
                        <TableCell className="text-center">{stat.bibAssigned}</TableCell>
                        <TableCell className="text-center">{stat.bibDistributed}</TableCell>
                      </TableRow>
                    ))}
                    {/* Totals Row */}
                    <TableRow className="bg-blue-50 font-semibold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-center">{regTotals.cashPayments}</TableCell>
                      <TableCell className="text-center">{regTotals.onlinePayments}</TableCell>
                      <TableCell className="text-center">{regTotals.govtIdVerified}</TableCell>
                      <TableCell className="text-center">{regTotals.tshirtDistributed}</TableCell>
                      <TableCell className="text-center">{regTotals.bibAssigned}</TableCell>
                      <TableCell className="text-center">{regTotals.bibDistributed}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bulk Sales Reports */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-purple-600" />
              Bulk Sales Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : bulkSalesStats.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No data available</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">User</TableHead>
                      <TableHead className="text-center font-semibold">Cash Sales</TableHead>
                      <TableHead className="text-center font-semibold">QR Sales</TableHead>
                      <TableHead className="text-center font-semibold">Cash (₹)</TableHead>
                      <TableHead className="text-center font-semibold">QR (₹)</TableHead>
                      <TableHead className="text-center font-semibold">S</TableHead>
                      <TableHead className="text-center font-semibold">M</TableHead>
                      <TableHead className="text-center font-semibold">L</TableHead>
                      <TableHead className="text-center font-semibold">XL</TableHead>
                      <TableHead className="text-center font-semibold">XXL</TableHead>
                      <TableHead className="text-center font-semibold">Total Qty</TableHead>
                      <TableHead className="text-center font-semibold">Total (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bulkSalesStats.map((stat) => (
                      <TableRow key={stat.uid}>
                        <TableCell className="font-medium">{stat.name}</TableCell>
                        <TableCell className="text-center">{stat.cashSales}</TableCell>
                        <TableCell className="text-center">{stat.qrSales}</TableCell>
                        <TableCell className="text-center">{stat.cashAmount.toLocaleString()}</TableCell>
                        <TableCell className="text-center">{stat.qrAmount.toLocaleString()}</TableCell>
                        <TableCell className="text-center">{stat.sizeS}</TableCell>
                        <TableCell className="text-center">{stat.sizeM}</TableCell>
                        <TableCell className="text-center">{stat.sizeL}</TableCell>
                        <TableCell className="text-center">{stat.sizeXL}</TableCell>
                        <TableCell className="text-center">{stat.sizeXXL}</TableCell>
                        <TableCell className="text-center font-medium">{stat.totalQuantity}</TableCell>
                        <TableCell className="text-center font-medium">{stat.totalAmount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    {/* Totals Row */}
                    <TableRow className="bg-purple-50 font-semibold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-center">{bulkTotals.cashSales}</TableCell>
                      <TableCell className="text-center">{bulkTotals.qrSales}</TableCell>
                      <TableCell className="text-center">{bulkTotals.cashAmount.toLocaleString()}</TableCell>
                      <TableCell className="text-center">{bulkTotals.qrAmount.toLocaleString()}</TableCell>
                      <TableCell className="text-center">{bulkTotals.sizeS}</TableCell>
                      <TableCell className="text-center">{bulkTotals.sizeM}</TableCell>
                      <TableCell className="text-center">{bulkTotals.sizeL}</TableCell>
                      <TableCell className="text-center">{bulkTotals.sizeXL}</TableCell>
                      <TableCell className="text-center">{bulkTotals.sizeXXL}</TableCell>
                      <TableCell className="text-center">{bulkTotals.totalQuantity}</TableCell>
                      <TableCell className="text-center">{bulkTotals.totalAmount.toLocaleString()}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
