import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

const INCLUDED = [
  "Every course lesson",
  "Unlimited practice tests, scored instantly",
  "AI doubt solver",
  "Mentor-answered follow-up on any doubt",
  "Mentorship sessions",
  "Community forums and clubs",
];

export default function Pricing() {
  useDocumentMeta({ title: "Pricing", description: "Freequademy is free — courses, tests, AI doubt solving and mentorship, no cost." });
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-xl">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 text-center">Pricing</h1>
        <p className="text-muted-foreground text-center mb-8">There's only one plan.</p>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-5xl font-extrabold">₹0</CardTitle>
            <p className="text-muted-foreground">forever</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {INCLUDED.map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-success shrink-0" />
                {item}
              </div>
            ))}
            <Button asChild className="w-full mt-4">
              <Link to="/signup-student">Start learning free</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
