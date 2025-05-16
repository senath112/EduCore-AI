"use client";

import { useState } from 'react';
import { useSettings } from '@/hooks/use-settings';
import { explainConcept } from '@/ai/flows/explain-concept';
import type { ExplainConceptInput, ExplainConceptOutput } from '@/ai/flows/explain-concept';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, HelpCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from '../ui/scroll-area';

export default function ConceptExplainer() {
  const { subject, language } = useSettings();
  const { toast } = useToast();
  const [topic, setTopic] = useState('');
  const [explanation, setExplanation] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleExplainConcept = async () => {
    if (!topic.trim()) {
      toast({
        variant: "destructive",
        title: "Missing Topic",
        description: "Please enter a topic or question to explain.",
      });
      return;
    }

    setIsLoading(true);
    setExplanation(''); // Clear previous explanation

    try {
      const input: ExplainConceptInput = {
        topic,
        subject,
        language,
      };
      const result: ExplainConceptOutput = await explainConcept(input);
      setExplanation(result.explanation);
    } catch (error) {
      console.error("Error with Concept Explainer:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to get explanation. Please try again.",
      });
      setExplanation("Sorry, I couldn't generate an explanation for this topic. Please try again or rephrase your question.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle /> Concept Explainer
        </CardTitle>
        <CardDescription>
          Enter a topic or question about {subject} and get a detailed explanation in {language}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="topic-input" className="text-sm font-medium">
            Topic / Question
          </Label>
          <Textarea
            id="topic-input"
            placeholder={`e.g., "Explain Newton's First Law" or "What is photosynthesis?"`}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="mt-1 min-h-[100px]"
            disabled={isLoading}
          />
        </div>
        <Button
          onClick={handleExplainConcept}
          disabled={isLoading || !topic.trim()}
          className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Explain Concept
        </Button>
      </CardContent>
      {explanation && (
        <CardFooter className="flex-col items-start gap-2 border-t pt-4">
           <h3 className="text-lg font-semibold text-primary">Explanation:</h3>
          <ScrollArea className="h-[250px] w-full rounded-md border p-4 bg-muted/50">
            <p className="text-sm whitespace-pre-wrap">{explanation}</p>
          </ScrollArea>
        </CardFooter>
      )}
    </Card>
  );
}
