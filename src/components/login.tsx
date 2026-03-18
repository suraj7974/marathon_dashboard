import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { authenticate, setStoredAuth } from "../lib/auth";
import { setSessionStartTime } from "../lib/session-timeout";
import { getStoredUid, createUid, validatePhoneNumber } from "../lib/uid";
import {
  ShieldCheck,
  Shirt,
  Users,
  Lock,
  BarChart3,
  ShoppingCart,
  User,
  Phone,
  Loader2,
  ClipboardList,
} from "lucide-react";

type AuthRole =
  | "NprBastar"
  | "open"
  | "influencers"
  | "inventory"
  | "bulksales"
  | "reports";

const Login = () => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // UID Dialog state
  const [showUidDialog, setShowUidDialog] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pendingRole, setPendingRole] = useState<AuthRole | null>(null);
  const [uidLoading, setUidLoading] = useState(false);
  const [uidError, setUidError] = useState("");

  const navigateToRole = (role: AuthRole) => {
    if (role === "NprBastar") {
      navigate("/NprBastar");
    } else if (role === "open") {
      navigate("/open");
    } else if (role === "bulksales") {
      navigate("/bulk-sales");
    } else if (role === "inventory") {
      navigate("/inventory");
    } else if (role === "reports") {
      navigate("/reports");
    } else {
      navigate(`/${role}`);
    }
  };

  const handleLogin = (role: AuthRole) => {
    if (authenticate(role, password)) {
      // Check if UID exists in localStorage
      const existingUid = getStoredUid();

      if (existingUid) {
        // UID exists, proceed with login
        setStoredAuth(role);
        setSessionStartTime();
        navigateToRole(role);
      } else {
        // No UID, show dialog to collect name and phone
        setPendingRole(role);
        setShowUidDialog(true);
      }
    } else {
      setError("Invalid password");
    }
  };

  const handleUidSubmit = async () => {
    if (!fullName.trim()) {
      setUidError("Please enter your full name");
      return;
    }

    // Validate phone is exactly 10 digits
    if (!validatePhoneNumber(phoneNumber)) {
      setUidError("Phone number must be exactly 10 digits");
      return;
    }

    if (!pendingRole) return;

    setUidLoading(true);
    setUidError("");

    try {
      await createUid(fullName, phoneNumber);

      // UID created successfully, proceed with login
      setStoredAuth(pendingRole);
      setSessionStartTime();
      setShowUidDialog(false);
      navigateToRole(pendingRole);
    } catch (err: unknown) {
      console.error("Error creating UID:", err);
      // Show the actual error message from the createUid function
      if (err instanceof Error) {
        setUidError(err.message);
      } else {
        setUidError("Failed to register. Please try again.");
      }
    } finally {
      setUidLoading(false);
    }
  };

  // const handleViewDetails = () => {
  //   navigate("/view-details");
  // };

  // const handleidstaysearch = () => {
  //   navigate("/view-venue");
  // };

  const loginSections = [
    {
      role: "NprBastar" as AuthRole,
      label: "Npr & Bastar",
      icon: ShieldCheck,
      description: "ID verification & payments",
      gradient: "from-emerald-500 to-teal-600",
    },
    {
      role: "open" as AuthRole,
      label: "Open category",
      icon: Shirt,
      description: "payment and distribution",
      gradient: "from-violet-500 to-purple-600",
    },
    // {
    //   role: "kit" as AuthRole,
    //   label: "Kits Section",
    //   icon: Package,
    //   description: "Kit distribution",
    //   gradient: "from-blue-500 to-cyan-600",
    // },
    {
      role: "influencers" as AuthRole,
      label: "Influencers",
      icon: Users,
      description: "Influencer management",
      gradient: "from-pink-500 to-rose-600",
    },
    {
      role: "inventory" as AuthRole,
      label: "T-Shirt Inventory",
      icon: BarChart3,
      description: "Monitor stock levels",
      gradient: "from-amber-500 to-orange-600",
    },
    {
      role: "bulksales" as AuthRole,
      label: "Bulk Sales",
      icon: ShoppingCart,
      description: "Sell t-shirts to customers",
      gradient: "from-indigo-500 to-blue-600",
    },
    {
      role: "reports" as AuthRole,
      label: "Reports",
      icon: ClipboardList,
      description: "View activity reports",
      gradient: "from-teal-500 to-emerald-600",
    },
  ];

  // const quickActions = [
  //   {
  //     onClick: handleidstaysearch,
  //     label: "View Venue Details",
  //     icon: MapPin,
  //   },
  //   {
  //     onClick: handleViewDetails,
  //     label: "View Participant",
  //     icon: Eye,
  //   },
  // ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200/40 to-indigo-200/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-200/40 to-blue-200/40 rounded-full blur-3xl" />
      </div>

      <Card className="max-w-lg w-full relative z-10 shadow-2xl border-0 bg-white/80 backdrop-blur-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <span className="text-2xl font-bold text-white">AM</span>
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Bastar Marathon 2026
          </CardTitle>
          <p className="text-sm text-gray-500">Dashboard Access Portal</p>
        </CardHeader>

        <CardContent className="space-y-6 pt-4">
          {/* Password Input */}
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              className="pl-10 h-12 text-base"
            />
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Login Sections */}
          <div className="grid grid-cols-2 gap-3">
            {loginSections.map((section) => (
              <button
                key={section.role}
                onClick={() => handleLogin(section.role)}
                className={`group relative overflow-hidden rounded-xl p-4 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-lg bg-gradient-to-br ${section.gradient} text-white`}
              >
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
                <section.icon className="h-6 w-6 mb-2" />
                <div className="font-semibold text-sm">{section.label}</div>
                <div className="text-xs text-white/80 mt-0.5">
                  {section.description}
                </div>
              </button>
            ))}
          </div>

          {/* Quick Actions */}
          {/*<div className="pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3 font-medium">
              Quick Actions
            </p>
            <div className="flex flex-col gap-2">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  onClick={action.onClick}
                  variant="outline"
                  className="w-full justify-start h-11 hover:bg-muted/50"
                >
                  <action.icon className="h-4 w-4 mr-3 text-muted-foreground" />
                  {action.label}
                </Button>
              ))}
            </div>
          </div>*/}
        </CardContent>
      </Card>

      {/* UID Registration Dialog */}
      <Dialog open={showUidDialog} onOpenChange={setShowUidDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Welcome! Please identify yourself
            </DialogTitle>
            <DialogDescription>
              Enter your details to continue. This helps us track who performed
              actions in the dashboard.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {/* Full Name Input */}
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  setUidError("");
                }}
                className="pl-10 h-12"
              />
            </div>

            {/* Phone Number Input */}
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="tel"
                placeholder="Phone Number"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  setUidError("");
                }}
                className="pl-10 h-12"
              />
            </div>

            {/* Error Alert */}
            {uidError && (
              <Alert variant="destructive">
                <AlertDescription>{uidError}</AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <Button
              onClick={handleUidSubmit}
              disabled={uidLoading}
              className="w-full h-12 text-base"
            >
              {uidLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;
