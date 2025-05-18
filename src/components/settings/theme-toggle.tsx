
"use client";

import { useSettings } from '@/hooks/use-settings';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, setTheme } = useSettings();

  const isDarkMode = theme === 'dark';

  const toggleTheme = () => {
    setTheme(isDarkMode ? 'light' : 'dark');
  };

  return (
    <div className="flex items-center justify-between space-x-2 py-4">
      <div className="flex items-center space-x-2">
        {isDarkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        <Label htmlFor="theme-toggle" className="text-base">
          Theme
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <span className="text-sm text-muted-foreground">Light</span>
        <Switch
          id="theme-toggle"
          checked={isDarkMode}
          onCheckedChange={toggleTheme}
          aria-label="Toggle theme"
        />
        <span className="text-sm text-muted-foreground">Dark</span>
      </div>
    </div>
  );
}
