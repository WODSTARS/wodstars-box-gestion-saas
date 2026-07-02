"use client";

import { useEffect, useState } from "react";

export function SplashScreen() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDone(true), 850);
    return () => window.clearTimeout(timer);
  }, []);

  if (done) return null;

  return (
    <div className="fixed inset-0 z-[999] grid place-items-center bg-[#050506]">
      <div className="grid justify-items-center gap-4 text-center">
        <img
          src="/wodstar-logo-transparent.png"
          alt="WODSTARS Gestion"
          className="h-32 w-32 animate-pulse object-contain drop-shadow-[0_0_34px_rgba(244,196,48,.38)]"
        />
        <p className="text-xs font-black uppercase tracking-[.22em] text-wod-gold">WodStars Box OS</p>
      </div>
    </div>
  );
}
