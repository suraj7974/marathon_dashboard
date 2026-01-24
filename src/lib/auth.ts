type Role = "NprBastar" | "open" | "influencers" | "inventory" | "bulksales";

const PASSWORDS = {
  NprBastar: "lorem1234",
  open: "lorem1234",
  influencers: "lorem1234",
  inventory: "lorem1234",
  bulksales: "lorem1234",
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
