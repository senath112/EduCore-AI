
"use client";

import Link from 'next/link';
import CopyrightYear from './copyright-year';
import ReCAPTCHA from 'react-google-recaptcha';
import { useAuth } from '@/hooks/use-auth';

export default function Footer() {
  const { recaptchaRef } = useAuth(); // Get the ref from the context
  const isRecaptchaEnabled = process.env.NEXT_PUBLIC_RECAPTCHA_ENABLED === "true";
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  return (
    <footer className="w-full mt-auto p-4 bg-background/50 border-t border-border/50">
      <div className="container mx-auto flex justify-between items-center text-sm text-muted-foreground">
        <div>
          &copy; <CopyrightYear /> EduCore AI. All Rights Reserved.
        </div>
        <div>
          {/* Globally positioned reCAPTCHA, but the component is rendered here in the footer */}
          {isRecaptchaEnabled && recaptchaSiteKey && (
            <ReCAPTCHA
              ref={recaptchaRef}
              size="invisible"
              sitekey={recaptchaSiteKey}
            />
          )}
        </div>
        <div className="flex gap-4">
          <Link href="/privacy-policy" className="hover:text-primary">Privacy Policy</Link>
          <Link href="/terms-of-service" className="hover:text-primary">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}
