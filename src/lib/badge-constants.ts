
// src/lib/badge-constants.ts
import type { LucideIcon } from 'lucide-react';

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  iconName: string; // Corresponds to a key in lucide-react icon set
}

export const ALL_BADGES: BadgeDefinition[] = [
  {
    id: 'chat_starter',
    name: 'Chat Starter',
    description: 'Engaged with the AI Tutor for the first time.',
    iconName: 'MessageSquareText',
  },
  {
    id: 'streak_3_days',
    name: '3-Day Streak',
    description: 'Maintained a 3-day activity streak.',
    iconName: 'Flame',
  },
  {
    id: 'streak_100_days',
    name: 'Century Streak',
    description: 'Maintained an impressive 100-day activity streak!',
    iconName: 'Award',
  },
  {
    id: 'streak_200_days',
    name: 'Double Century Streak',
    description: 'Incredible! A 200-day activity streak.',
    iconName: 'Gem',
  },
  {
    id: 'streak_365_days',
    name: 'Annual Achiever',
    description: 'Wow! A full year of consistent activity!',
    iconName: 'Crown',
  },
  {
    id: 'quiz_ace',
    name: 'Quiz Ace',
    description: 'Scored over 80% on any quiz.',
    iconName: 'Target',
  },
  {
    id: 'leaderboard_topper',
    name: 'Leaderboard Topper',
    description: 'Achieved the #1 spot on a quiz leaderboard!',
    iconName: 'Trophy',
  },
  {
    id: 'flashcard_fan',
    name: 'Flashcard Fan',
    description: 'Generated a set of flashcards.',
    iconName: 'Layers',
  },
  {
    id: 'class_joiner',
    name: 'Class Joiner',
    description: 'Successfully joined a class.',
    iconName: 'Users',
  },
  {
    id: 'forum_contributor',
    name: 'Forum Contributor',
    description: 'Created a post or topic in the forum.',
    iconName: 'MessagesSquare',
  },
  {
    id: 'early_adopter_103',
    name: 'Early Adopter',
    description: 'One of the first 100 users to join EduCore AI!',
    iconName: 'Rocket',
  },
  {
    id: 'puzzle_pro',
    name: 'Puzzle Pro',
    description: 'Successfully solved an AI-generated puzzle!',
    iconName: 'Brain',
  },
];
