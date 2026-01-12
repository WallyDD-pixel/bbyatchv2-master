"use client";
import Image from "next/image";
import { useEffect, useState } from "react";

interface HeroSliderProps {
	title?: string;
	subtitle?: string;
	imageUrl?: string; // image unique personnalisée (depuis settings)
	images?: string[]; // optionnel: liste d’images
}

const defaultSlides = [
	{
		src: "https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?q=80&w=1600&auto=format&fit=crop",
		alt: "Voilier au coucher du soleil",
	},
	{
		src: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1600&auto=format&fit=crop",
		alt: "Bateau à moteur en mer",
	},
	{
		src: "https://images.unsplash.com/photo-1470246973918-29a93221c455?q=80&w=1600&auto=format&fit=crop",
		alt: "Marina avec yachts",
	},
];

export default function HeroSlider({ title, subtitle, imageUrl, images }: HeroSliderProps) {
	const [index, setIndex] = useState(0);

	// Choix des slides: priorité à `images`, puis `imageUrl`, sinon défauts
	const slides = (images && images.length
		? images.map((src) => ({ src, alt: 'Hero image' }))
		: imageUrl
			? [{ src: imageUrl, alt: 'Hero image' }]
			: defaultSlides);

	useEffect(() => {
		if (slides.length <= 1) return; // pas de rotation si une seule image
		const id = setInterval(() => {
			setIndex((i) => (i + 1) % slides.length);
		}, 5000);
		return () => clearInterval(id);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [slides.length]);

	return (
		<div className="relative w-full h-[46vh] sm:h-[56vh] md:h-[64vh] rounded-2xl overflow-hidden border border-black/10">
			{slides.map((s, i) => (
				<div
					key={i}
					className={`absolute inset-0 transition-opacity duration-700 ${
						i === index ? "opacity-100" : "opacity-0"
					}`}
				>
					<Image
						src={s.src}
						alt={s.alt}
						fill
						className="object-cover"
						priority={i === 0}
					/>
					<div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.25),rgba(0,0,0,0.35))]" />
				</div>
			))}

			<div className="absolute inset-0 flex items-end sm:items-center">
				<div className="w-full px-4 sm:px-8 py-6 sm:py-0">
					<div className="max-w-3xl text-left text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">
						<h1 className="text-3xl sm:text-5xl font-display font-extrabold leading-tight">
							{title || "Explorez la Riviera en toute élégance"}
						</h1>
						<p className="hidden sm:block mt-3 text-sm sm:text-base text-white/90 font-montserrat">
							{subtitle ||
								"Réservez votre yacht pour une journée d'exception ou une soirée au coucher de soleil."}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
