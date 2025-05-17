
"use client";
import { useState, useEffect } from 'react';

export default function CopyrightYear() {
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    // This effect runs only on the client after hydration
    setYear(new Date().getFullYear());
  }, []); // Empty dependency array ensures this runs once on mount (client-side)

  return <>{year}</>;
}
