// src/components/chat/ChatInputArea.tsx
"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Paperclip, Send, FileText, XCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputAreaProps {
  onSendMessage: (message: string, file?: File) => void;
  onSummarizeFile: (file: File) => void;
  isLoading: boolean;
}

export function ChatInputArea({ onSendMessage, onSummarizeFile, isLoading }: ChatInputAreaProps) {
  const [inputValue, setInputValue] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(event.target.value);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Reset file input
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (inputValue.trim() === "" && !selectedFile) return;
    onSendMessage(inputValue.trim(), selectedFile || undefined);
    setInputValue("");
    // Keep file selected for potential summarization or multiple questions on same file
    // setSelectedFile(null); 
    // if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSummarize = () => {
    if (selectedFile) {
      onSummarizeFile(selectedFile);
    }
  };

  return (
    <div className="bg-card p-4 border-t border-border shadow-md">
      <form onSubmit={handleSubmit} className="container mx-auto flex flex-col gap-2">
        {selectedFile && (
          <div className="flex items-center justify-between p-2 border border-border rounded-md bg-background text-sm">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)</span>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={handleRemoveFile} className="h-6 w-6">
              <XCircle className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <Textarea
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Ask EduAI a question..."
            className="flex-grow resize-none bg-background focus:ring-accent"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as any);
              }
            }}
            disabled={isLoading}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            aria-label="Attach file"
            className="bg-background hover:bg-secondary"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.docx" 
          />
          <Button type="submit" disabled={isLoading || (inputValue.trim() === "" && !selectedFile)} variant="default" className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Send className="h-5 w-5" />
            <span className="sr-only">Send</span>
          </Button>
        </div>
         {selectedFile && (
          <Button
            type="button"
            onClick={handleSummarize}
            disabled={isLoading || !selectedFile}
            variant="secondary"
            className="w-full mt-2"
          >
            Summarize Attached File
          </Button>
        )}
      </form>
    </div>
  );
}
