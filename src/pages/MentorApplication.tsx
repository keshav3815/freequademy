import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Award, BookOpen, Users, Clock } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function MentorApplication() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [expertise, setExpertise] = useState<string[]>([]);
  const [newExpertise, setNewExpertise] = useState("");
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    qualification: "",
    experience_years: "",
    motivation: "",
    is_volunteer: false,
  });
  const { user, profile, isMentor } = useAuth();
  const [existingStatus, setExistingStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setFormData(prev => ({
      ...prev,
      full_name: prev.full_name || profile?.full_name || "",
      email: prev.email || user.email || "",
    }));
    supabase
      .from('mentor_applications')
      .select('status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setExistingStatus(data?.status ?? null));
  }, [user, profile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleAddExpertise = () => {
    if (newExpertise.trim() && !expertise.includes(newExpertise.trim())) {
      setExpertise([...expertise, newExpertise.trim()]);
      setNewExpertise("");
    }
  };

  const handleRemoveExpertise = (skill: string) => {
    setExpertise(expertise.filter(e => e !== skill));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Local session (no network round trip); RLS enforces access server-side.
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to submit your application",
          variant: "destructive",
        });
        navigate('/login');
        return;
      }

      const { error } = await supabase
        .from('mentor_applications')
        .insert({
          user_id: user.id,
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          expertise: expertise,
          qualification: formData.qualification,
          experience_years: parseInt(formData.experience_years),
          motivation: formData.motivation,
          is_volunteer: formData.is_volunteer,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Application Submitted",
        description: "Thank you for applying! We'll review your application and get back to you soon.",
      });

      navigate('/mentorship');
    } catch (error) {
      console.error('Application error:', error);
      toast({
        title: "Error",
        description: "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/mentorship')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Mentorship
        </Button>

        <div className="max-w-3xl mx-auto">
          {(isMentor || existingStatus === 'pending') ? (
            <Card>
              <CardHeader>
                <CardTitle>{isMentor ? "You're already a mentor" : "Application under review"}</CardTitle>
                <CardDescription>
                  {isMentor
                    ? "Head to your teacher dashboard to manage sessions and content."
                    : "Thanks for applying! An administrator will review your application. You'll get mentor access once it's approved."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate(isMentor ? '/teacher' : '/dashboard')}>
                  {isMentor ? "Go to teacher dashboard" : "Back to dashboard"}
                </Button>
              </CardContent>
            </Card>
          ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">Mentor Application</CardTitle>
              <CardDescription>
                Join our community of mentors and make a difference in students' lives
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="experience_years">Years of Experience *</Label>
                    <Input
                      id="experience_years"
                      name="experience_years"
                      type="number"
                      min="0"
                      value={formData.experience_years}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qualification">Qualification/Educational Background *</Label>
                  <Input
                    id="qualification"
                    name="qualification"
                    value={formData.qualification}
                    onChange={handleInputChange}
                    placeholder="e.g., M.Tech in Computer Science, B.Ed in Mathematics"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Areas of Expertise *</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newExpertise}
                      onChange={(e) => setNewExpertise(e.target.value)}
                      placeholder="Add an expertise area"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddExpertise();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={handleAddExpertise}
                      variant="secondary"
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {expertise.map((skill, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => handleRemoveExpertise(skill)}
                      >
                        {skill} ✕
                      </Badge>
                    ))}
                  </div>
                  {expertise.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Add at least one area of expertise
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="motivation">Why do you want to become a mentor? *</Label>
                  <Textarea
                    id="motivation"
                    name="motivation"
                    value={formData.motivation}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder="Tell us about your motivation to mentor students..."
                    required
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_volunteer"
                    name="is_volunteer"
                    checked={formData.is_volunteer}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, is_volunteer: checked as boolean }))
                    }
                  />
                  <Label htmlFor="is_volunteer" className="cursor-pointer">
                    I want to be a volunteer mentor (unpaid)
                  </Label>
                </div>

                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-lg">What happens next?</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start">
                      <Award className="mr-3 h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium">Application Review</p>
                        <p className="text-sm text-muted-foreground">
                          Our team will review your application within 3-5 business days
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <Users className="mr-3 h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium">Onboarding Session</p>
                        <p className="text-sm text-muted-foreground">
                          Approved mentors will be invited to an onboarding session
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <Clock className="mr-3 h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium">Start Mentoring</p>
                        <p className="text-sm text-muted-foreground">
                          Set your availability and begin making a difference
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={loading || expertise.length === 0}
                >
                  {loading ? "Submitting..." : "Submit Application"}
                </Button>
              </form>
            </CardContent>
          </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}