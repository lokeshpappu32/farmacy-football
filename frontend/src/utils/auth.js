export function homeForRole(role) {
  if (role === "super_admin") return "/super-admin";
  if (role === "admin") return "/admin";
  if (role === "hetero_rep") return "/rep/dashboard";
  return "/dashboard";
}
