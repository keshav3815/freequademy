import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Loader2 } from "lucide-react";

interface DonationFormProps {
  onSuccess?: () => void;
}

const QUICK_AMOUNTS = [100, 500, 1000, 2000, 5000];

const DonationForm = ({ onSuccess }: DonationFormProps) => {
  const [donorName, setDonorName] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  const handleDonate = async () => {
    if (!amount || parseFloat(amount) < 1) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid donation amount",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Create order
      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        'create-razorpay-order',
        {
          body: { amount: parseFloat(amount) }
        }
      );

      if (orderError) throw orderError;

      const { orderId } = orderData;

      // TODO: Integrate Razorpay Checkout when RAZORPAY_KEY_ID is available
      // For now, simulate successful payment
      console.log('Order created:', orderId);

      // Verify and save payment
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
        'verify-payment',
        {
          body: {
            razorpay_payment_id: `pay_${Date.now()}`,
            razorpay_order_id: orderId,
            razorpay_signature: 'mock_signature',
            donor_name: donorName || 'Anonymous',
            amount: parseFloat(amount),
          }
        }
      );

      if (verifyError) throw verifyError;

      if (verifyData.success) {
        toast({
          title: "Thank You! 🎉",
          description: "Your donation has been received successfully!",
        });

        // Reset form
        setDonorName("");
        setAmount("");
        
        // Trigger history refresh
        onSuccess?.();
      }
    } catch (error) {
      console.error('Donation error:', error);
      toast({
        title: "Error",
        description: "Failed to process donation. Please try again.",
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
          <Heart className="h-5 w-5 text-primary" />
          Make a Donation
        </CardTitle>
        <CardDescription>
          Support our mission to provide quality education for all
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Your Name (Optional)</Label>
          <Input
            id="name"
            placeholder="Enter your name or stay anonymous"
            value={donorName}
            onChange={(e) => setDonorName(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          <Label htmlFor="amount">Donation Amount (₹)</Label>
          <Input
            id="amount"
            type="number"
            placeholder="Enter amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="1"
          />
          
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Quick select:</div>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_AMOUNTS.map((value) => (
                <Button
                  key={value}
                  variant="outline"
                  onClick={() => handleQuickAmount(value)}
                  className={amount === value.toString() ? "border-primary" : ""}
                >
                  ₹{value}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <Button 
          className="w-full" 
          size="lg"
          onClick={handleDonate}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Heart className="mr-2 h-4 w-4" />
              Donate Now
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Your donation is secure and will be used to support educational programs
        </p>
      </CardContent>
    </Card>
  );
};

export default DonationForm;