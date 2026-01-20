"use client";
import { useEffect, useRef, useMemo, useCallback } from "react";

interface Message {
  id: number;
  message: string;
  name: string;
  email: string;
  phone?: string;
  boat?: string;
  slug?: string;
  createdAt?: string | Date;
  sourcePage?: string;
}

interface MessageViewClientProps {
  messages: Message[];
  locale: "fr" | "en";
}

export default function MessageViewClient({ messages, locale }: MessageViewClientProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const metaRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const mailRef = useRef<HTMLAnchorElement>(null);
  const phoneRef = useRef<HTMLAnchorElement>(null);
  const emailRef = useRef<HTMLAnchorElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);
  const boatRef = useRef<HTMLAnchorElement>(null);

  const messageMap = useMemo(() => {
    return messages.reduce((acc, m) => {
      acc[m.id] = {
        message: m.message,
        name: m.name,
        email: m.email,
        phone: (m.phone && m.phone.trim()) ? m.phone.trim() : "",
        boat: m.boat || "",
        slug: m.slug || "",
        createdAt: m.createdAt,
        sourcePage: m.sourcePage || "",
      };
      return acc;
    }, {} as Record<number, { message: string; name: string; email: string; phone: string; boat: string; slug: string; createdAt?: string | Date; sourcePage: string }>);
  }, [messages]);

  const openModal = useCallback((id: number) => {
    const data = messageMap[id];
    if (!data || !modalRef.current || !bodyRef.current || !metaRef.current || !titleRef.current || !mailRef.current) return;

    bodyRef.current.textContent = data.message;
    titleRef.current.textContent = data.name;
    metaRef.current.textContent = (data.email || "") + (data.boat ? " • " + data.boat : "");
    mailRef.current.href = `mailto:${data.email}?subject=${encodeURIComponent((locale === "fr" ? "Réponse: " : "Reply: ") + (data.boat || (locale === "fr" ? "Demande" : "Request")))}`;

    modalRef.current.classList.remove("hidden");
    modalRef.current.classList.add("flex");
    document.body.style.overflow = "hidden";
  }, [messageMap, locale]);

  const closeModal = useCallback(() => {
    if (!modalRef.current) return;
    modalRef.current.classList.add("hidden");
    modalRef.current.classList.remove("flex");
    document.body.style.overflow = "";
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.hasAttribute("data-close")) {
        if (!modalRef.current) return;
        modalRef.current.classList.add("hidden");
        modalRef.current.classList.remove("flex");
        document.body.style.overflow = "";
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (!modalRef.current) return;
        modalRef.current.classList.add("hidden");
        modalRef.current.classList.remove("flex");
        document.body.style.overflow = "";
      }
    };

    const handleViewButtonClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.hasAttribute("data-view")) {
        const id = target.getAttribute("data-id");
        if (id) {
          const data = messageMap[Number(id)];
          if (!data || !modalRef.current || !bodyRef.current || !metaRef.current || !titleRef.current || !mailRef.current) return;

          bodyRef.current.textContent = data.message;
          titleRef.current.textContent = data.name;
          
          // Mettre à jour les liens
          if (emailRef.current) {
            emailRef.current.href = `mailto:${data.email}`;
            const emailSpan = emailRef.current.querySelector('span:last-child');
            if (emailSpan) emailSpan.textContent = data.email;
          }
          
          if (phoneRef.current) {
            if (data.phone && data.phone.trim()) {
              const phoneNumber = data.phone.trim();
              phoneRef.current.href = `tel:${phoneNumber.replace(/\s/g, '')}`;
              const phoneSpan = phoneRef.current.querySelector('span:last-child');
              if (phoneSpan) {
                phoneSpan.textContent = phoneNumber;
              } else {
                // Si le span n'existe pas, créer le contenu directement
                phoneRef.current.innerHTML = `<span>📞</span> <span>${phoneNumber}</span>`;
              }
              phoneRef.current.style.display = 'inline-flex';
            } else {
              phoneRef.current.style.display = 'none';
            }
          }
          
          // Construire les métadonnées avec toutes les informations
          const metaParts: string[] = [];
          if (data.boat) metaParts.push(data.boat);
          if (data.sourcePage && data.sourcePage !== 'contact') {
            metaParts.push(locale === "fr" ? `Page: ${data.sourcePage}` : `Page: ${data.sourcePage}`);
          }
          metaRef.current.textContent = metaParts.length > 0 ? metaParts.join(" • ") : "";
          
          if (dateRef.current && data.createdAt) {
            const date = new Date(data.createdAt);
            dateRef.current.textContent = locale === "fr" 
              ? `Reçu le ${date.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}`
              : `Received on ${date.toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}`;
          }
          
          if (boatRef.current && data.boat && data.slug) {
            boatRef.current.href = `/used-sale/${data.slug}`;
            const boatSpan = boatRef.current.querySelector('span:last-child');
            if (boatSpan) boatSpan.textContent = data.boat;
            boatRef.current.style.display = 'inline-flex';
          } else if (boatRef.current) {
            boatRef.current.style.display = 'none';
          }
          
          if (dateRef.current && data.createdAt) {
            const date = new Date(data.createdAt);
            dateRef.current.textContent = date.toLocaleString(locale === "fr" ? "fr-FR" : "en-US", { dateStyle: "short", timeStyle: "short" });
          }
          
          mailRef.current.href = `mailto:${data.email}?subject=${encodeURIComponent((locale === "fr" ? "Réponse: " : "Reply: ") + (data.boat || (locale === "fr" ? "Demande" : "Request")))}`;

          modalRef.current.classList.remove("hidden");
          modalRef.current.classList.add("flex");
          document.body.style.overflow = "hidden";
        }
      }
    };

    const modal = modalRef.current;
    if (modal) {
      modal.addEventListener("click", handleClick);
      document.addEventListener("keydown", handleKeyDown);
      
      // Utiliser la délégation d'événements pour capturer les clics sur les boutons "Voir"
      document.addEventListener("click", handleViewButtonClick);

      return () => {
        modal.removeEventListener("click", handleClick);
        document.removeEventListener("keydown", handleKeyDown);
        document.removeEventListener("click", handleViewButtonClick);
      };
    }
  }, [messageMap, locale]);

  return (
    <div
      ref={modalRef}
      id="message-modal"
      className="hidden fixed inset-0 z-40 items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" data-close></div>
      <div className="relative w-full max-w-2xl mx-auto rounded-2xl bg-white border border-black/10 shadow-xl overflow-hidden">
        {/* Header avec gradient */}
        <div className="bg-gradient-to-r from-[color:var(--primary)]/10 to-[color:var(--primary)]/5 border-b border-black/10 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 ref={titleRef} className="text-xl font-bold text-black/90 mb-3">
                Message
              </h2>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3 text-sm text-black/70">
                  <a ref={emailRef} href="#" className="hover:text-[color:var(--primary)] hover:underline inline-flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-black/5 transition-colors">
                    <span>✉</span> <span></span>
                  </a>
                  <a ref={phoneRef} href="#" className="hover:text-[color:var(--primary)] hover:underline inline-flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-black/5 transition-colors" style={{display: 'none'}}>
                    <span>📞</span> <span></span>
                  </a>
                  <a ref={boatRef} href="#" target="_blank" rel="noopener noreferrer" className="hover:text-[color:var(--primary)] hover:underline inline-flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-black/5 transition-colors" style={{display: 'none'}}>
                    <span>🚤</span> <span></span>
                  </a>
                </div>
                <div ref={metaRef} className="text-xs text-black/50"></div>
                <div ref={dateRef} className="text-xs text-black/40"></div>
              </div>
            </div>
            <button
              className="h-9 w-9 rounded-full border border-black/15 text-black/60 hover:bg-black/5 flex items-center justify-center transition-colors flex-shrink-0"
              data-close
              aria-label="Close"
              onClick={closeModal}
            >
              ✕
            </button>
          </div>
        </div>
        
        {/* Body avec message */}
        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-black/70 mb-3">{locale === "fr" ? "Message" : "Message"}</h3>
            <div
              ref={bodyRef}
              className="rounded-lg border border-black/10 bg-black/[0.02] p-4 max-h-[50vh] overflow-auto text-sm leading-relaxed font-sans whitespace-pre-wrap text-black/80"
            ></div>
          </div>
        </div>

        {/* Footer avec actions */}
        <div className="border-t border-black/10 bg-black/[0.02] p-4 flex justify-end gap-3">
          <button
            className="h-10 px-5 rounded-full border border-black/15 text-sm hover:bg-black/5 transition-colors"
            data-close
            onClick={closeModal}
          >
            {locale === "fr" ? "Fermer" : "Close"}
          </button>
          <a
            ref={mailRef}
            id="mm-mail"
            href="#"
            className="h-10 px-5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium inline-flex items-center justify-center transition-colors shadow-sm"
          >
            {locale === "fr" ? "Répondre par email" : "Reply by email"}
          </a>
        </div>
      </div>
    </div>
  );
}

