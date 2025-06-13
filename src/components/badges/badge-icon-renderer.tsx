
"use client";

import * as LucideIcons from 'lucide-react';
import type { LucideProps } from 'lucide-react';

interface BadgeIconRendererProps extends LucideProps {
  iconName: string;
}

const IconNotFound = LucideIcons.HelpCircle; // Default icon if not found

// Explicitly import icons used in ALL_BADGES to help with bundling
const {
  MessageSquareText, // chat_starter
  Flame,             // streak_3_days
  Award,             // streak_100_days
  Gem,               // streak_200_days
  Crown,             // streak_365_days
  Target,            // quiz_ace
  Trophy,            // leaderboard_topper
  Layers,            // flashcard_fan
  Users,             // class_joiner
  MessagesSquare,    // forum_contributor
  Rocket,            // early_adopter_103
  Brain,             // puzzle_pro
  // Add any new icons here if new badges are defined
} = LucideIcons;

const iconMap: Record<string, React.ComponentType<LucideProps>> = {
  MessageSquareText,
  Flame,
  Award,
  Gem,
  Crown,
  Target,
  Trophy,
  Layers,
  Users,
  MessagesSquare,
  Rocket,
  Brain,
  // Ensure mapping matches the imported icon component name
};


export default function BadgeIconRenderer({ iconName, className, ...props }: BadgeIconRendererProps) {
  const IconComponent = iconMap[iconName] || IconNotFound;
  return <IconComponent className={className} {...props} />;
}
