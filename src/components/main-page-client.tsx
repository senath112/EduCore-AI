
"use client";

import ChatInterface from "@/components/tutor/chat-interface";
import SubjectSelector from "@/components/shared/subject-selector";

export default function MainPageClient() {
  return (
    <div className="flex flex-col flex-grow w-full p-4 md:p-6 lg:p-8">
      <SubjectSelector />

      <div className="mt-6 flex-grow flex flex-col">
        <ChatInterface />
      </div>
    </div>
  );
}
