import React, { type ReactNode } from "react";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const fileToDataUri = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsDataURL(file);
  });
};

export function formatBoldText(text: string): ReactNode[] {
  if (!text) return [];
  const parts = text.split('**');
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      // Use React.createElement to avoid JSX parsing issues in a .ts file
      return React.createElement('strong', { key: index }, part);
    }
    // When index % 2 === 0, part is a string. This is a valid ReactNode.
    return part as ReactNode; 
  });
}

