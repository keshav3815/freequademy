import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, Lock, User, GraduationCap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const SignupMentor = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [subject, setSubject] = useState("");
  const { isAuthenticated, loading: authLoading } = useAuth();
  const submittingRef = useRef(false);

  // Someone who is already signed in applies through the application form.
  useEffect(() => {
    if (!authLoading && isAuthenticated && !submittingRef.current) {
      navigate("/mentor-application", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please ensure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    submittingRef.current = true;

    // Mentor status is never self-assigned: every account starts as a student
    // and an administrator approves the mentor application (the database
    // ignores any role sent from here).
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/mentor-application`,
        data: { full_name: fullName },
      },
    });

    if (error) {
      submittingRef.current = false;
      setIsLoading(false);
      toast({
        title: "Could not create account",
        description: "Please check your details and try again. If you already have an account, log in and apply from your dashboard.",
        variant: "destructive",
      });
      return;
    }

    if (data.session && data.user) {
      const { error: applicationError } = await supabase.from("mentor_applications").insert({
        user_id: data.user.id,
        full_name: fullName,
        email,
        expertise: subject
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        status: "pending",
      });

      setIsLoading(false);
      if (applicationError) {
        toast({
          title: "Account created",
          description: "Please complete your mentor application.",
        });
        navigate("/mentor-application", { replace: true });
        return;
      }

      toast({
        title: "Application submitted",
        description: "Your account is ready. An administrator will review your mentor application.",
      });
      navigate("/dashboard", { replace: true });
      return;
    }

    // Email confirmation is required before the application can be saved.
    setIsLoading(false);
    toast({
      title: "Check your email",
      description: "Confirm your email address, then log in to complete your mentor application.",
    });
    navigate("/login", { replace: true, state: { from: "/mentor-application" } });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between mb-2">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Apply to be a Mentor</CardTitle>
          <CardDescription>
            Create your account and apply to mentor on freequademy. Applications are reviewed by our team before mentor access is granted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="mentor@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject/Expertise</Label>
              <Input
                id="subject"
                type="text"
                placeholder="Mathematics, Physics, etc."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Submitting..." : "Create account & apply"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Login
              </Link>
            </p>
            
            <p className="text-center text-sm text-muted-foreground">
              Want to join as a student?{" "}
              <Link to="/signup-student" className="text-primary hover:underline">
                Sign up as Student
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>

    </div>
  );
};

export default SignupMentor;