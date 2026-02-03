"use client";
import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';

export default function BoatSlider({ images }: { images: string[] }) {
  const valid = images.filter(Boolean);
  const [index, setIndex] = useState(0);
  const autoRef = useRef<NodeJS.Timeout | null>(null);

  const go = useCallback((dir: number)=>{
    setIndex(i => ( (i + dir + valid.length) % valid.length ));
  },[valid.length]);

  useEffect(()=>{
    if(valid.length <= 1) return; // pas d'auto si une seule image
    autoRef.current && clearInterval(autoRef.current);
    autoRef.current = setInterval(()=>{ setIndex(i => ( (i + 1) % valid.length )); }, 6000);
    return ()=>{ if(autoRef.current) clearInterval(autoRef.current); };
  },[valid.length]);

  if(valid.length === 0) return (
    <div className="relative aspect-[16/9] w-full rounded-2xl bg-black/5 flex items-center justify-center text-sm text-black/40">Aucune image</div>
  );

  return (
    <div className="relative w-full">
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-black/5">
        {valid.map((src, i)=>(
          <div key={i} className={`absolute inset-0 transition-opacity duration-700 ${i===index? 'opacity-100':'opacity-0 pointer-events-none'}`}>
            <Image 
              src={src} 
              alt={`media-${i+1}`} 
              fill 
              className="object-cover" 
              priority={i===0}
              loading={i===0 ? "eager" : "lazy"}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
            />
          </div>
        ))}
        {valid.length>1 && (
          <>
            <button type="button" onClick={()=>go(-1)} className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/40 backdrop-blur text-white flex items-center justify-center text-lg hover:bg-black/55">‹</button>
            <button type="button" onClick={()=>go(1)} className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/40 backdrop-blur text-white flex items-center justify-center text-lg hover:bg-black/55">›</button>
          </>
        )}
        {valid.length>1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
            {valid.map((_,i)=>(
              <button key={i} onClick={()=>setIndex(i)} className={`h-2.5 w-2.5 rounded-full border border-white/70 transition ${i===index? 'bg-white':'bg-white/30 hover:bg-white/60'}`} aria-label={`Aller à la diapo ${i+1}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
