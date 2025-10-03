import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
    fetchClubs();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchClubs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from("student_clubs")
      .select(`
        *,
        club_members!left(user_id)
      `)
      .order("member_count", { ascending: false });

    if (error) {
      console.error("Error fetching clubs:", error);
    } else {
      const clubsWithMembership = data?.map(club => ({
        ...club,
        is_member: club.club_members?.some((m: any) => m.user_id === user?.id) || false
      })) || [];
      setClubs(clubsWithMembership);
    }
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
            <Card
              key={club.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/community/club/${club.id}`)}
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