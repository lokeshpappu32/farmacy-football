export function homeForRole(role) {
  if (role === "admin") return "/admin";
  if (role === "mr") return "/mr";
  return "/dashboard";
}
