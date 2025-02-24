import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "../components/protected-route";
import Login from "../components/login";
import PaymentVerify from "../components/step1";
import TShirtDistribution from "../components/step2";
import BibDistribution from "../components/step3";
import ViewDetails from "../components/viewdetails";
import GovernmentIdVerification from "../components/step0"
import "./App.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/govt" element={<GovernmentIdVerification />} />

        <Route
          path="/"
          element={
            <ProtectedRoute requiredRole="payment">
              <PaymentVerify />
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
          path="/bib"
          element={
            <ProtectedRoute requiredRole="bib">
              <BibDistribution />
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
