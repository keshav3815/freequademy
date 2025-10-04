import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Heart, TrendingUp } from "lucide-react";
import { format } from "date-fns";

interface Donation {
  id: string;
  donor_name: string;
  amount: number;
  created_at: string;
}

const DonationHistory = () => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDonations();
  }, []);

  const fetchDonations = async () => {
    try {
      const { data, error } = await supabase
        .from('donations')
        .select('id, donor_name, amount, created_at')
        .eq('status', 'successful')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setDonations(data || []);
      
      // Calculate total
      const total = (data || []).reduce((sum, donation) => sum + Number(donation.amount), 0);
      setTotalAmount(total);
    } catch (error) {
      console.error('Error fetching donations:', error);
      toast({
        title: "Error",
        description: "Failed to load donation history",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Donation History
        </CardTitle>
        <CardDescription>
          Recent contributions from our generous supporters
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Amount Card */}
        <div className="bg-primary/10 rounded-lg p-4 text-center">
          <div className="text-sm text-muted-foreground mb-1">Total Amount Raised</div>
          <div className="text-3xl font-bold text-primary">
            ₹{totalAmount.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Donations List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">
              Loading donations...
            </div>
          ) : donations.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Heart className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No donations yet. Be the first to contribute!</p>
            </div>
          ) : (
            donations.map((donation) => (
              <div 
                key={donation.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Heart className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">{donation.donor_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(donation.created_at), 'MMM dd, yyyy')}
                    </div>
                  </div>
                </div>
                <div className="font-bold text-primary">
                  ₹{Number(donation.amount).toLocaleString('en-IN')}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DonationHistory;