"use client";

import { useState, useRef, type MouseEvent } from 'react';
import Link from 'next/link';
import {
  Home, BookOpen, Layers, Puzzle, ClipboardList, Trophy, CalendarCheck, Calculator
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/use-auth';

const DOCK_ITEMS = [
  { id: 'home', label: 'AI Tutor', icon: Home, href: '/' },
  { id: 'classes', label: 'My Classes', icon: BookOpen, href: '/classes' },
  { id: 'planner', label: 'Study Planner', icon: CalendarCheck, href: '/planner' },
  { id: 'flashcards', label: 'Flashcards', icon: Layers, href: '/tools/flashcards' },
  { id: 'puzzle', label: 'Puzzle Maker', icon: Puzzle, href: '/tools/puzzle-maker' },
  { id: 'marks', label: 'Marks Tracker', icon: ClipboardList, href: '/tools/marks-analyzer' },
  { id: 'limits', label: 'Limits Explainer', icon: Calculator, href: '/tools/limits-explainer' },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy, href: '/leaderboard' },
];

export default function Dock() {
  const dockRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState<number | null>(null);
  const { user } = useAuth();

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (dockRef.current) {
      const rect = dockRef.current.getBoundingClientRect();
      setMousePosition(e.clientX - rect.left);
    }
  };

  const handleMouseLeave = () => {
    setMousePosition(null);
  };
  
  const getDistance = (iconCenter: number) => {
    if (mousePosition === null) return Infinity;
    return Math.abs(mousePosition - iconCenter);
  };

  const getScale = (distance: number) => {
    const maxDistance = 120; // Radius of influence
    if (distance >= maxDistance) return 1;
    // A function to create a smooth curve, starting at 1.6 and ending at 1
    const scale = 1 + 0.6 * (1 - Math.pow(distance / maxDistance, 2));
    return Math.max(1, scale);
  };
  
  const getYOffset = (scale: number) => {
    if (scale <= 1) return 0;
    const maxScale = 1.6;
    const minScale = 1;
    const maxOffset = -12; // Max lift in pixels
    // Calculate progress from min to max scale
    const progress = (scale - minScale) / (maxScale - minScale);
    return maxOffset * progress;
  };

  if (!user) return null;

  return (
    <TooltipProvider>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
        <div
          ref={dockRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="flex h-16 items-end gap-3 rounded-2xl border bg-[var(--glass-bg)] border-[var(--glass-border)] p-2 shadow-[var(--glass-shadow)] backdrop-blur-lg"
        >
          {DOCK_ITEMS.map((item) => {
            const elRef = useRef<HTMLAnchorElement>(null);
            const iconCenter = elRef.current ? elRef.current.offsetLeft + elRef.current.offsetWidth / 2 : 0;
            const distance = getDistance(iconCenter);
            const scale = mousePosition !== null ? getScale(distance) : 1;
            const yOffset = mousePosition !== null ? getYOffset(scale) : 0;

            return (
              <div key={item.id} className="grid place-items-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      ref={elRef}
                      href={item.href}
                      className={cn(
                        'grid h-12 w-12 transform-gpu cursor-pointer place-items-center rounded-full bg-background/50 text-foreground transition-transform duration-75 ease-in-out will-change-transform hover:bg-accent hover:text-accent-foreground'
                      )}
                      style={{ transform: `translateY(${yOffset}px) scale(${scale})` }}
                    >
                      <item.icon className="h-6 w-6" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>{item.label}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
