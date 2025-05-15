
// src/app/buy-credits/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { addUserCreditsAction } from "@/lib/actions";
import { CreditCard, ShoppingCart, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

export default function BuyCreditsPage() {
  const { user, updateLocalUserCredits, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [purchaseStatus, setPurchaseStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const handleBuyCredits = async (creditsToAdd: number, packageName: string) => {
    if (!user) {
      toast({ title: "Authentication Error", description: "Please log in to buy credits.", variant: "destructive" });
      router.push("/login");
      return;
    }
    setIsLoading(true);
    setPurchaseStatus(null);

    // In a real app, this is where you'd integrate with a payment gateway.
    // For this placeholder, we'll directly call the action to add credits.
    
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

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <p className="text-muted-foreground">Loading or redirecting...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
      <Card className="w-full max-w-3xl shadow-xl mb-8">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center mb-4">
            <CreditCard className="h-12 w-12 text-accent" />
          </div>
          <CardTitle className="text-3xl font-bold">Buy Credits</CardTitle>
          <CardDescription>
            Choose a package below to add credits to your EduCore AI account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {purchaseStatus && (
            <Alert variant={purchaseStatus.type === 'error' ? 'destructive' : 'default'} className="mb-6">
              {purchaseStatus.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertTitle>{purchaseStatus.type === 'success' ? 'Success!' : 'Error'}</AlertTitle>
              <AlertDescription>{purchaseStatus.message}</AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {creditPackages.map((pkg) => {
              const IconComponent = pkg.icon;
              return (
                <Card key={pkg.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardHeader className="items-center text-center">
                    <IconComponent className="h-10 w-10 text-accent mb-3" />
                    <CardTitle className="text-xl">{pkg.name}</CardTitle>
                    <CardDescription className="text-sm">{pkg.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow flex flex-col items-center justify-center">
                    <p className="text-3xl font-bold text-accent mb-1">{pkg.credits} Credits</p>
                    <p className="text-lg text-muted-foreground">${pkg.price.toFixed(2)}</p>
                  </CardContent>
                  <CardFooter>
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
        </CardContent>
        <CardFooter className="flex-col items-center text-sm mt-4">
            <p>
                Go back to <Link href="/" className="font-medium text-accent hover:underline">Chat</Link>.
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
