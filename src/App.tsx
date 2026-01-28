import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ProtectedRoute } from "@/components/protected-route";
import Login from "@/components/login";
import PaymentAndVerification from "@/components/nprBastarCategory";
import TShirtDistribution from "@/components/openCategory";
import ViewDetails from "@/components/viewdetails";
import AccommodationManagement from "@/components/viewvenue";
import Influencers from "@/components/influencers";
import TshirtInventory from "@/components/tshirt-inventory";
import TshirtBulkSales from "@/components/tshirt-bulk-sales";
import Reports from "@/components/reports";

// import "./App.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/view-venue" element={<AccommodationManagement />} />

        <Route
          path="/NprBastar"
          element={
            <ProtectedRoute requiredRole="NprBastar">
              <PaymentAndVerification />
            </ProtectedRoute>
          }
        />

        <Route
          path="/open"
          element={
            <ProtectedRoute requiredRole="open">
              <TShirtDistribution />
            </ProtectedRoute>
          }
        />

        <Route
          path="/influencers"
          element={
            <ProtectedRoute requiredRole="influencers">
              <Influencers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/inventory"
          element={
            <ProtectedRoute requiredRole="inventory">
              <TshirtInventory />
            </ProtectedRoute>
          }
        />

        <Route
          path="/bulk-sales"
          element={
            <ProtectedRoute requiredRole="bulksales">
              <TshirtBulkSales />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute requiredRole="reports">
              <Reports />
            </ProtectedRoute>
          }
        />

        <Route path="/view-details" element={<ViewDetails />} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
