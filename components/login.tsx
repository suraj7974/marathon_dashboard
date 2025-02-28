import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { authenticate, setStoredAuth } from "../lib/auth";
import { setSessionStartTime } from "../lib/session-timeout";

const Login = () => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = (role: "payment" | "shirt" | "bib" | "govt" | "tshirt" | "kit") => {
    if (authenticate(role, password)) {
      setStoredAuth(role);
      setSessionStartTime();
      navigate(role === "payment" ? "/" : `/${role}`);
    } else {
      setError("Invalid password");
    }
  };

  const handleViewDetails = () => {
    navigate("/view-details");
  };

  const handleidsearch = () => {
    navigate("/mobile");
  };

  const handleidstaysearch = () => {
    navigate("/view-venue");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full space-y-8">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Dashboard Access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Input type="password" placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} />

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Button onClick={() => handleLogin("govt")} className="w-full">
              Govt ID Section
            </Button>
            <Button onClick={() => handleLogin("payment")} className="w-full">
              Payment Section
            </Button>
            <Button onClick={() => handleLogin("shirt")} className="w-full">
              T-Shirt Section
            </Button>
            <Button onClick={() => handleLogin("bib")} className="w-full">
              BIB Section
            </Button>
            <Button onClick={() => handleLogin("kit")} className="w-full">
              kits
            </Button>
          </div>

          <div className="pt-4 border-t">
            <Button onClick={handleidstaysearch} variant="outline" className="w-full">
              View Venue Details
            </Button>
            <Button onClick={handleViewDetails} variant="outline" className="w-full">
              View Participant Details
            </Button>
            <Button onClick={handleidsearch} variant="outline" className="w-full">
              Find Identification number
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
