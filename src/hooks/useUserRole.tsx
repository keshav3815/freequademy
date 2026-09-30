import { useAuth } from "@/contexts/AuthContext";

type UserRole = "admin" | "moderator" | null;

/**
 * Admin/moderator role for the admin panel. Thin wrapper over AuthContext so
 * roles are fetched once per session and update on sign-in/sign-out. A user
 * holding both roles resolves to "admin".
 */
export const useUserRole = () => {
  const { loading, isAdmin, isModerator } = useAuth();
  const role: UserRole = isAdmin ? "admin" : isModerator ? "moderator" : null;

  return { role, loading, isAdmin, isModerator };
};
