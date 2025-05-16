"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ChatInterface from "@/components/tutor/chat-interface";
import ConceptExplainer from "@/components/explain/concept-explainer";
import SubjectSelector from "@/components/shared/subject-selector";
import { Brain, MessageCircle } from "lucide-react";

export default function MainPageClient() {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Welcome to EduCore AI</h2>
        <p className="text-muted-foreground mt-2">Your personal AI learning assistant for A-Level subjects.</p>
      </div>
      
      <SubjectSelector />

      <Tabs defaultValue="tutor" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="tutor" className="py-3">
            <MessageCircle className="mr-2 h-5 w-5" />
            AI Tutor
          </TabsTrigger>
          <TabsTrigger value="explain" className="py-3">
            <Brain className="mr-2 h-5 w-5" />
            Concept Explainer
          </TabsTrigger>
        </TabsList>
        <TabsContent value="tutor">
          <ChatInterface />
        </TabsContent>
        <TabsContent value="explain">
          <ConceptExplainer />
        </TabsContent>
      </Tabs>
    </div>
  );
}
