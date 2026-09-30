import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, UserPlus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface Club {
  id: string;
  name: string;
  description: string;
  category: string;
  member_count: number;
  is_member: boolean;
}

const ClubsSection = () => {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
    fetchClubs();
  }, []);

  const checkUser = async () => {
    // Local session (no network round trip); RLS enforces access server-side.
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    setUser(user);
  };

  const fetchClubs = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    const [clubsResult, membershipResult] = await Promise.all([
      supabase
        .from("student_clubs")
        .select("id, name, description, category, member_count")
        .order("member_count", { ascending: false })
        .limit(50),
      userId
        ? supabase.from("club_members").select("club_id").eq("user_id", userId)
        : Promise.resolve({ data: [] as { club_id: string }[], error: null }),
    ]);

    if (clubsResult.error) {
      console.error("Error fetching clubs:", clubsResult.error);
      return;
    }
    const memberOf = new Set((membershipResult.data || []).map((m) => m.club_id));
    setClubs((clubsResult.data || []).map((club) => ({ ...club, is_member: memberOf.has(club.id) })) as Club[]);
  };

  const handleJoinClub = async (clubId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      toast({ title: "Please login to join clubs", variant: "destructive" });
      navigate("/login");
      return;
    }

    const { error } = await supabase
      .from("club_members")
      .insert({ club_id: clubId, user_id: user.id });

    if (error) {
      toast({ title: "Error joining club", variant: "destructive" });
    } else {
      toast({ title: "Successfully joined club!" });
      fetchClubs();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Student Clubs & Groups</h2>
          <p className="text-muted-foreground">Join communities based on your interests</p>
        </div>
        <Button onClick={() => navigate("/community/create-club")} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Create Club
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clubs.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No clubs yet. Create one!</p>
            </CardContent>
          </Card>
        ) : (
          clubs.map((club) => (
            <Card key={club.id} className="hover:shadow-md transition-shadow overflow-hidden">
              <Link
                to={`/community/club/${club.id}`}
                className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                <CardHeader>
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-lg">{club.name}</CardTitle>
                    <Badge>{club.category}</Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {club.description}
                  </CardDescription>
                </CardHeader>
              </Link>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {club.member_count} members
                  </div>
                  {club.is_member ? (
                    <Badge variant="secondary">Member</Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={(e) => handleJoinClub(club.id, e)}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Join
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ClubsSection;