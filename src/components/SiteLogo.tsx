"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { DEFAULT_SITE_LOGO } from "@/lib/site-logo";

const logoClass =
  "h-12 sm:h-14 w-auto max-w-[min(280px,46vw)] object-contain drop-shadow-sm";

export function SiteLogo({
  src,
  priority = false,
  className,
}: {
  src: string;
  priority?: boolean;
  className?: string;
}) {
  const [currentSrc, setCurrentSrc] = useState(src);
  useEffect(() => {
    setCurrentSrc(src);
  }, [src]);
  const remote = currentSrc.startsWith("http");

  return (
    <Image
      src={currentSrc}
      alt="BB SERVICES CHARTER"
      width={247}
      height={82}
      priority={priority}
      unoptimized={remote}
      className={className ?? logoClass}
      onError={() => {
        if (currentSrc !== DEFAULT_SITE_LOGO) setCurrentSrc(DEFAULT_SITE_LOGO);
      }}
    />
  );
}
