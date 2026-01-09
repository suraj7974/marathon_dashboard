import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "../components/protected-route";
import Login from "../components/login";
import PaymentAndVerification from "../components/verify";
import TShirtDistribution from "../components/step2";
import HospitalityKitDistribution from "../components/step4";
import ViewDetails from "../components/viewdetails";
import MobileSearch from "../components/mobilesearch";
import TshirtSales from "../components/tshirt";
import AccommodationManagement from "../components/viewvenue";
import Influencers from "../components/influencers";
import "./App.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/mobile" element={<MobileSearch />} />
        <Route path="/tshirt" element={<TshirtSales />} />
        <Route path="/view-venue" element={<AccommodationManagement/>}/>

        <Route
          path="/verify"
          element={
            <ProtectedRoute requiredRole="verify">
              <PaymentAndVerification />
            </ProtectedRoute>
          }
        />

        <Route
          path="/shirt"
          element={
            <ProtectedRoute requiredRole="shirt">
              <TShirtDistribution />
            </ProtectedRoute>
          }
        />

        <Route
          path="/kit"
          element={
            <ProtectedRoute requiredRole="kit">
              <HospitalityKitDistribution />
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

        <Route path="/view-details" element={<ViewDetails />} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
