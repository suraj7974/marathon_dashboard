type Role =
  | "NprBastar"
  | "open"
  | "influencers"
  | "inventory"
  | "bulksales"
  | "reports";

const PASSWORDS = {
  NprBastar: "1234",
  open: "1234",
  influencers: "1234",
  inventory: "bastar1234",
  bulksales: "1234",
  reports: "bastar1234",
};

export const authenticate = (role: Role, password: string): boolean => {
  return PASSWORDS[role] === password;
};

export const getStoredAuth = (): Role | null => {
  return localStorage.getItem("auth_role") as Role | null;
};

export const setStoredAuth = (role: Role) => {
  localStorage.setItem("auth_role", role);
};

export const clearStoredAuth = () => {
  localStorage.removeItem("auth_role");
};
