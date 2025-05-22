
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { useSettings } from '@/hooks/use-settings';
import { useToast } from '@/hooks/use-toast';
import { generateFlashcards, type Flashcard } from '@/ai/flows/generate-flashcards-flow.ts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Layers, ArrowLeft, ArrowRight, RefreshCw, LogIn, Download } from 'lucide-react';
import Link from 'next/link';
import { cn } from "@/lib/utils";
import jsPDF from 'jspdf';
import { format } from 'date-fns';

const GenerateFlashcardsFormSchema = z.object({
  topic: z.string().min(3, "Topic must be at least 3 characters.").max(100, "Topic cannot exceed 100 characters."),
  numberOfFlashcards: z.coerce.number().min(1, "Must generate at least 1 flashcard.").max(10, "Cannot generate more than 10 flashcards at a time."),
});
type GenerateFlashcardsFormValues = z.infer<typeof GenerateFlashcardsFormSchema>;

interface DisplayFlashcard extends Flashcard {
  colorClass: string;
}

const FLASHCARD_BACKGROUND_COLORS = [
  'bg-sky-100 dark:bg-sky-700',
  'bg-emerald-100 dark:bg-emerald-700',
  'bg-amber-100 dark:bg-amber-700',
  'bg-violet-100 dark:bg-violet-700',
  'bg-rose-100 dark:bg-rose-700',
  'bg-teal-100 dark:bg-teal-700',
  'bg-fuchsia-100 dark:bg-fuchsia-700',
  'bg-lime-100 dark:bg-lime-700',
  'bg-cyan-100 dark:bg-cyan-700',
  'bg-orange-100 dark:bg-orange-700',
];

export default function FlashcardGeneratorPage() {
  const { user, loading: authLoading } = useAuth();
  const { subject, language } = useSettings();
  const { toast } = useToast();

  const [generatedFlashcards, setGeneratedFlashcards] = useState<DisplayFlashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [currentTopic, setCurrentTopic] = useState('');


  const form = useForm<GenerateFlashcardsFormValues>({
    resolver: zodResolver(GenerateFlashcardsFormSchema),
    defaultValues: {
      topic: '',
      numberOfFlashcards: 3,
    },
  });

  const onSubmit = async (values: GenerateFlashcardsFormValues) => {
    if (!user) {
      toast({ variant: "destructive", title: "Not Logged In", description: "You must be logged in to generate flashcards." });
      return;
    }
    setIsLoading(true);
    setGeneratedFlashcards([]);
    setCurrentCardIndex(0);
    setIsCardFlipped(false);
    setCurrentTopic(values.topic);


    try {
      const result = await generateFlashcards({
        subject,
        language,
        topic: values.topic,
        numberOfFlashcards: values.numberOfFlashcards,
      });
      if (result.flashcards && result.flashcards.length > 0) {
        const flashcardsWithColors: DisplayFlashcard[] = result.flashcards.map((card, index) => ({
          ...card,
          colorClass: FLASHCARD_BACKGROUND_COLORS[index % FLASHCARD_BACKGROUND_COLORS.length],
        }));
        setGeneratedFlashcards(flashcardsWithColors);
        toast({ title: "Flashcards Generated!", description: `${flashcardsWithColors.length} flashcards created for "${values.topic}".` });
      } else {
        setGeneratedFlashcards([]);
        toast({ variant: "destructive", title: "No Flashcards Generated", description: "The AI couldn't generate flashcards for this topic, or the response was empty. Please try a different topic or adjust the number." });
      }
    } catch (error: any) {
      console.error("Error generating flashcards:", error);
      toast({ variant: "destructive", title: "Generation Failed", description: error.message || "Could not generate flashcards." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFlipCard = () => {
    setIsCardFlipped(!isCardFlipped);
  };

  const handleNextCard = () => {
    if (currentCardIndex < generatedFlashcards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setIsCardFlipped(false);
    }
  };

  const handlePreviousCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setIsCardFlipped(false);
    }
  };

  const handleDownloadFlashcardsPDF = () => {
    if (generatedFlashcards.length === 0 || !currentTopic) {
      toast({ variant: "destructive", title: "No Flashcards", description: "Please generate flashcards first." });
      return;
    }
    setIsDownloadingPdf(true);

    try {
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const cardWidth = (pageWidth - (3 * margin)) / 2; // Two cards per row
      const cardHeight = 60; // Approximate height for a flashcard
      const headerHeight = 25;
      let yPos = margin + headerHeight;
      let xPos = margin;
      let cardsOnPage = 0;
      const maxCardsPerRow = 2;

      // PDF Header
      doc.setFontSize(18);
      doc.text("EduCore AI - Flashcards", pageWidth / 2, margin, { align: 'center' });
      doc.setFontSize(12);
      doc.text(`Topic: ${currentTopic}`, pageWidth / 2, margin + 7, { align: 'center' });
      doc.text(`Generated: ${format(new Date(), 'PPP p')}`, pageWidth / 2, margin + 14, { align: 'center' });


      generatedFlashcards.forEach((flashcard, index) => {
        if (yPos + cardHeight > pageHeight - margin) { // Check for new page
          doc.addPage();
          yPos = margin;
          xPos = margin;
          cardsOnPage = 0;
          // Re-add header on new page if desired
          doc.setFontSize(18);
          doc.text("EduCore AI - Flashcards (Continued)", pageWidth / 2, margin, { align: 'center' });
          doc.setFontSize(12);
          doc.text(`Topic: ${currentTopic}`, pageWidth / 2, margin + 7, { align: 'center' });
          yPos = margin + headerHeight -7; // Adjust yPos after header on new page
        }

        // Draw card outline
        doc.setDrawColor(150); // Light gray border
        doc.setLineWidth(0.3);
        doc.rect(xPos, yPos, cardWidth, cardHeight, 'S'); // 'S' for stroke

        // Card Content
        doc.setFontSize(10);
        doc.setTextColor(0); // Black text

        // Front
        doc.setFont("helvetica", "bold");
        doc.text("Front:", xPos + 5, yPos + 10);
        doc.setFont("helvetica", "normal");
        const frontTextLines = doc.splitTextToSize(flashcard.front, cardWidth - 10);
        doc.text(frontTextLines, xPos + 5, yPos + 15);

        // Separator (optional)
        doc.setLineDashPattern([1, 1], 0);
        doc.line(xPos + 5, yPos + cardHeight / 2 + 3, xPos + cardWidth - 5, yPos + cardHeight / 2 + 3);
        doc.setLineDashPattern([], 0);

        // Back
        doc.setFont("helvetica", "bold");
        doc.text("Back:", xPos + 5, yPos + cardHeight / 2 + 13);
        doc.setFont("helvetica", "normal");
        const backTextLines = doc.splitTextToSize(flashcard.back, cardWidth - 10);
        doc.text(backTextLines, xPos + 5, yPos + cardHeight / 2 + 18);

        cardsOnPage++;
        if (cardsOnPage % maxCardsPerRow === 0) { // New row
          xPos = margin;
          yPos += cardHeight + 5; // Add some space between rows
        } else { // Next card in the same row
          xPos += cardWidth + margin;
        }
      });

      doc.save(`flashcards_${currentTopic.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
      toast({ title: "PDF Downloaded", description: "Flashcards PDF generated successfully." });

    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({ variant: "destructive", title: "PDF Error", description: "Could not generate PDF for flashcards." });
    } finally {
      setIsDownloadingPdf(false);
    }
  };


  if (authLoading) {
    return (
      <div className="flex flex-grow flex-col items-center justify-center p-6">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-grow flex-col items-center justify-center p-6 text-center">
        <LogIn className="h-16 w-16 text-primary mb-4" />
        <h1 className="text-2xl font-semibold">Please Log In</h1>
        <p className="text-muted-foreground mt-2 mb-6">
          You need to be logged in to use the Flashcard Generator.
        </p>
        <Button asChild>
          <Link href="/login">Go to Login</Link>
        </Button>
      </div>
    );
  }
  
  const currentCard = generatedFlashcards[currentCardIndex];

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col flex-grow">
      <Card className="shadow-xl mb-6">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            Flashcard Generator
          </CardTitle>
          <CardDescription>
            Enter a topic for your current subject ({subject}) and language ({language}) to generate study flashcards.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Topic</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Photosynthesis, Newton's Laws" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="numberOfFlashcards"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Flashcards (1-10)</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" max="10" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex-col sm:flex-row gap-2">
              <Button type="submit" className="w-full sm:w-auto" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : "Generate Flashcards"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="w-full sm:w-auto"
                onClick={handleDownloadFlashcardsPDF} 
                disabled={isLoading || isDownloadingPdf || generatedFlashcards.length === 0}
              >
                {isDownloadingPdf ? <Loader2 className="animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Download PDF
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="ml-3 text-muted-foreground">Generating flashcards...</p>
        </div>
      )}

      {generatedFlashcards.length > 0 && !isLoading && (
        <div className="flex flex-col items-center space-y-4 flex-grow">
          <Card 
            className={cn(
              "w-full min-h-[250px] md:min-h-[300px] flex flex-col justify-center items-center p-6 text-center shadow-lg cursor-pointer transition-transform duration-500 ease-in-out hover:shadow-2xl",
              currentCard?.colorClass 
            )}
            onClick={handleFlipCard}
            style={{ perspective: '1000px' }}
          >
            <div 
                className="transition-transform duration-500 ease-in-out w-full h-full flex items-center justify-center"
                style={{ transformStyle: 'preserve-3d', transform: isCardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
            >
                <div className="absolute w-full h-full flex items-center justify-center p-4" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(0deg)' }}>
                    <p className="text-xl md:text-2xl font-semibold">{currentCard?.front}</p>
                </div>
                <div className="absolute w-full h-full flex items-center justify-center p-4" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                    <p className="text-md md:text-lg">{currentCard?.back}</p>
                </div>
            </div>
          </Card>

          <div className="text-sm text-muted-foreground">
            Card {currentCardIndex + 1} of {generatedFlashcards.length}
          </div>

          <div className="flex justify-between w-full items-center space-x-2">
            <Button variant="outline" onClick={handlePreviousCard} disabled={currentCardIndex === 0}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Previous
            </Button>
            <Button variant="outline" onClick={handleFlipCard}>
              <RefreshCw className="mr-2 h-4 w-4" /> Flip Card
            </Button>
            <Button variant="outline" onClick={handleNextCard} disabled={currentCardIndex >= generatedFlashcards.length - 1}>
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
       {!isLoading && generatedFlashcards.length === 0 && form.formState.isSubmitted && (
         <p className="text-center text-muted-foreground py-10">No flashcards generated. Try a different topic or check the AI's response if there was an issue.</p>
       )}
    </div>
  );
}

    
