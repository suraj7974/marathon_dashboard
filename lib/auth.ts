type Role = "payment" | "shirt" | "bib" | "govt" | "tshirt" | "kit";

const PASSWORDS = {
  payment: "lorem1234",
  shirt: "lorem1234",
  bib: "lorem1234",
  govt: "lorem1234",
  tshirt: "lorem1234",
  kit: "lorem1234",
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
