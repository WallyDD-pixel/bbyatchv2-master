"use client";
import { createContext, useContext, useEffect, useRef } from "react";

export type BoatNewMediaSnapshot = {
  imageFiles: File[];
  videoFiles: File[];
};

type MediaGetter = () => BoatNewMediaSnapshot;

const BoatNewMediaContext = createContext<React.MutableRefObject<MediaGetter | null> | null>(null);

export function BoatNewMediaProvider({ children }: { children: React.ReactNode }) {
  const getterRef = useRef<MediaGetter | null>(null);
  return <BoatNewMediaContext.Provider value={getterRef}>{children}</BoatNewMediaContext.Provider>;
}

export function useRegisterBoatNewMedia(getter: MediaGetter) {
  const getterRef = useContext(BoatNewMediaContext);
  useEffect(() => {
    if (!getterRef) return;
    getterRef.current = getter;
    return () => {
      if (getterRef.current === getter) getterRef.current = null;
    };
  }, [getterRef, getter]);
}

export function useBoatNewMediaGetterRef() {
  return useContext(BoatNewMediaContext);
}
