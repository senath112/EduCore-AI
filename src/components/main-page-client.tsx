
"use client";

import ChatInterface from "@/components/tutor/chat-interface";

export default function MainPageClient() {
  return (
    <div className="flex flex-col flex-grow w-full p-4 md:p-6 lg:p-8">
      {/* SubjectSelector was here, now moved to Header */}
      <div className="flex-grow flex flex-col"> {/* Removed mt-6 */}
        <ChatInterface />
      </div>
    </div>
  );
}
