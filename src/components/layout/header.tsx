
import Link from 'next/link';
import LogoIcon from '@/components/icons/logo-icon';
import LanguageSelector from '@/components/shared/language-selector';
import SubjectSelector from '@/components/shared/subject-selector';

export default function Header() {
  return (
    <header className="bg-card border-b border-border shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity">
          <LogoIcon className="h-8 w-8" />
          <h1 className="text-2xl font-semibold tracking-tight">EduCore AI</h1>
        </Link>
        <div className="flex items-center gap-4">
          <SubjectSelector />
          <LanguageSelector />
        </div>
      </div>
    </header>
  );
}
