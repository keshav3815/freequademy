import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DonationForm from "@/components/donations/DonationForm";
import DonationHistory from "@/components/donations/DonationHistory";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart } from "lucide-react";

const Donations = () => {
  const [refreshHistory, setRefreshHistory] = useState(0);

  const handleDonationSuccess = () => {
    setRefreshHistory(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-12 mt-16">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Heart className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold">Support Our Mission</h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Your donations help us provide quality education and mentorship to students across India. 
              Every contribution makes a difference in shaping young minds.
            </p>
          </div>

          {/* Impact Stats */}
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
            <CardHeader>
              <CardTitle>Our Impact</CardTitle>
              <CardDescription>
                Together, we're building a brighter future for students
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-3xl font-bold text-primary">10,000+</div>
                  <div className="text-sm text-muted-foreground">Students Reached</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary">500+</div>
                  <div className="text-sm text-muted-foreground">Mentors Onboarded</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary">50+</div>
                  <div className="text-sm text-muted-foreground">Programs Launched</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Donation Form */}
            <DonationForm onSuccess={handleDonationSuccess} />

            {/* Donation History */}
            <DonationHistory key={refreshHistory} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Donations;