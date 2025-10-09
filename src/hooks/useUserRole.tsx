import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type UserRole = "admin" | "moderator" | null;

export const useUserRole = () => {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setRole(null);
          setLoading(false);
          return;
        }

        const { data: roleData, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching role:", error);
          setRole(null);
        } else if (roleData) {
          setRole(roleData.role as UserRole);
        } else {
          setRole(null);
        }
      } catch (error) {
        console.error("Error in fetchUserRole:", error);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, []);

  return { role, loading, isAdmin: role === "admin", isModerator: role === "moderator" };
};
