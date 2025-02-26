type Role = "payment" | "shirt" | "bib" | "govt" | "tshirt";

const PASSWORDS = {
  payment: "payment123",
  shirt: "shirt123",
  bib: "bib123",
  govt: "govt123",
  tshirt: "sales123",
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
