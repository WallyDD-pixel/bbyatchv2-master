"use client";
import { useRouter } from "next/navigation";
import SearchBar, { type SearchValues } from "./SearchBar";

export default function SearchBarClient({ labels, className }: { labels: Record<string, string>; className?: string }) {
  const router = useRouter();

  const handleSubmit = (values: SearchValues & { part?: string }) => {
    if (values.city === 'Autre') {
      router.push('/autre-ville');
      return;
    }
    const params = new URLSearchParams();
    if (values.city) params.set("city", values.city); // non restrictif mais conservé dans l'URL
    if (values.startDate) params.set("start", values.startDate);
    if (values.endDate) params.set("end", values.endDate);
    if (values.part) params.set("part", values.part);
    if (values.passengers) params.set("pax", String(values.passengers));
    router.push(`/search?${params.toString()}`);
  };

  return <SearchBar labels={labels} onSubmit={handleSubmit} className={className} />;
}
