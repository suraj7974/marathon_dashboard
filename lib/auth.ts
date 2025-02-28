type Role = "payment" | "shirt" | "bib" | "govt" | "tshirt";

const PASSWORDS = {
  payment: "payment1234",
  shirt: "shirt1234",
  bib: "bib1234",
  govt: "govt1234",
  tshirt: "sales1234",
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
