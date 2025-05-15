
"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { addUserCreditsAction } from "@/lib/actions";
import { CreditCard, ShoppingCart, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number; // Placeholder price
  description: string;
  icon: React.ElementType;
}

const creditPackages: CreditPackage[] = [
  { id: "pkg_10", name: "Starter Pack", credits: 10, price: 5, description: "Get 10 credits to explore.", icon: Sparkles },
  { id: "pkg_50", name: "Value Pack", credits: 50, price: 20, description: "Best value for regular users.", icon: ShoppingCart },
  { id: "pkg_100", name: "Pro Pack", credits: 100, price: 35, description: "For heavy users and long sessions.", icon: CreditCard },
];

export function BuyCreditsDialog() {
  const { user, updateLocalUserCredits } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [purchaseStatus, setPurchaseStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const { toast } = useToast();

  const handleBuyCredits = async (creditsToAdd: number, packageName: string) => {
    if (!user) {
      toast({ title: "Authentication Error", description: "User not found. Please re-login.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setPurchaseStatus(null);

    const result = await addUserCreditsAction(user.uid, creditsToAdd);

    if (result.success && result.newCredits !== undefined) {
      updateLocalUserCredits(result.newCredits);
      setPurchaseStatus({ type: 'success', message: `Successfully added ${creditsToAdd} credits for ${packageName}! Your new balance is ${result.newCredits}.` });
      toast({
        title: "Purchase Successful!",
        description: `${creditsToAdd} credits added to your account.`,
      });
    } else {
      setPurchaseStatus({ type: 'error', message: result.error || "An unknown error occurred during purchase." });
      toast({
        title: "Purchase Failed",
        description: result.error || "Could not add credits. Please try again.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  return (
    <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-6 rounded-lg shadow-xl">
      <DialogHeader className="mb-4">
        <div className="flex items-center gap-3 mb-2 justify-center">
            <CreditCard className="h-10 w-10 text-accent" />
            <DialogTitle className="text-3xl font-bold text-center">Buy Credits</DialogTitle>
        </div>
        <DialogDescription className="text-center text-muted-foreground">
          Choose a package below to add credits to your EduCore AI account.
          Payment processing is simulated for this demo.
        </DialogDescription>
      </DialogHeader>
      <div className="py-2">
        {purchaseStatus && (
          <Alert variant={purchaseStatus.type === 'error' ? 'destructive' : 'default'} className="mb-6">
            {purchaseStatus.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertTitle>{purchaseStatus.type === 'success' ? 'Success!' : 'Error'}</AlertTitle>
            <AlertDescription>{purchaseStatus.message}</AlertDescription>
          </Alert>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {creditPackages.map((pkg) => {
            const IconComponent = pkg.icon;
            return (
              <Card key={pkg.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300 bg-card">
                <CardHeader className="items-center text-center pt-5 pb-2">
                  <IconComponent className="h-10 w-10 text-accent mb-3" />
                  <CardTitle className="text-xl font-semibold">{pkg.name}</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground h-12">{pkg.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col items-center justify-center py-3">
                  <p className="text-3xl font-bold text-accent mb-1">{pkg.credits} Credits</p>
                  <p className="text-lg text-muted-foreground">${pkg.price.toFixed(2)}</p>
                </CardContent>
                <CardFooter className="p-4 mt-auto">
                  <Button
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={() => handleBuyCredits(pkg.credits, pkg.name)}
                    disabled={isLoading}
                  >
                    {isLoading ? "Processing..." : "Buy Now"}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
      <DialogFooter className="sm:justify-center mt-6 pt-4 border-t">
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Close
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
}
