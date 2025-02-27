type Role = "payment" | "shirt" | "bib" | "govt" | "tshirt";

const PASSWORDS = {
  payment: "suraj79",
  shirt: "shub79",
  bib: "prat79",
  govt: "vipi79",
  tshirt: "prab79",
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
