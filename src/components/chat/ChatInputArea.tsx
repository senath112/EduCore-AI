// src/components/chat/ChatInputArea.tsx
"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Paperclip, Send, FileText, XCircle, ArrowUpCircle, AlertTriangle } from "lucide-react";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(event.target.value);
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
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

  const handleSubmit = (event?: FormEvent) => {
    event?.preventDefault();
    if (inputValue.trim() === "" && !selectedFile) return;
    onSendMessage(inputValue.trim(), selectedFile || undefined);
    setInputValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"; // Reset height
    }
    // Keep file selected for potential summarization or multiple questions on same file
    // setSelectedFile(null); 
    // if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSummarize = () => {
    if (selectedFile) {
      onSummarizeFile(selectedFile);
      // Optionally clear the file after summarization if desired
      // setSelectedFile(null);
      // if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="bg-card p-3 border-t border-border shadow-sm sticky bottom-0">
      <form onSubmit={handleSubmit} className="container mx-auto flex flex-col gap-2">
        {selectedFile && (
          <div className="flex items-center justify-between p-2 border border-border rounded-md bg-background text-sm mb-1">
            <div className="flex items-center gap-2 overflow-hidden">
              <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <span className="truncate" title={selectedFile.name}>{selectedFile.name}</span>
              <span className="text-muted-foreground whitespace-nowrap">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={handleRemoveFile} className="h-6 w-6 flex-shrink-0">
              <XCircle className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Ask EduCore AI a question..."
            className="flex-grow resize-none bg-muted/50 focus:ring-accent py-2 px-3 rounded-lg max-h-32 overflow-y-auto"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            disabled={isLoading}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            aria-label="Attach file"
            className="p-2 rounded-full hover:bg-secondary"
          >
            <Paperclip className="h-5 w-5 text-muted-foreground" />
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.docx" 
          />
          <Button 
            type="submit" 
            disabled={isLoading || (inputValue.trim() === "" && !selectedFile)} 
            variant="default" 
            size="icon"
            className="bg-accent hover:bg-accent/90 text-accent-foreground p-2 rounded-full"
            aria-label="Send message"
          >
            <ArrowUpCircle className="h-5 w-5" />
          </Button>
        </div>
         {selectedFile && (
          <Button
            type="button"
            onClick={handleSummarize}
            disabled={isLoading || !selectedFile}
            variant="secondary"
            className="w-full mt-1 text-sm py-1.5"
          >
            <FileText className="h-4 w-4 mr-2" />
            Summarize Attached File
          </Button>
        )}
      </form>
      <div className="mt-2 px-1 text-xs text-muted-foreground flex items-center justify-center text-center gap-1">
        <AlertTriangle className="h-3 w-3 text-orange-500 flex-shrink-0" />
        <span>EduCore AI can make mistakes. Check important info.</span>
      </div>
    </div>
  );
}
