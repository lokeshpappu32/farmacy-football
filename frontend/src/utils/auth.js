export function homeForRole(role) {
  if (role === "admin") return "/admin";
  return "/dashboard";
}
