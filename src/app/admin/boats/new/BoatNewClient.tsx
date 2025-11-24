"use client";
import { useState } from "react";

interface Option {
  id: string;
  label: string;
  price: string;
}

export default function BoatNewClient({ locale }: { locale: "fr" | "en" }) {
  const [options, setOptions] = useState<Option[]>([]);

  const addOption = () => {
    setOptions([...options, { id: Date.now().toString(), label: "", price: "" }]);
  };

  const removeOption = (id: string) => {
    setOptions(options.filter(opt => opt.id !== id));
  };

  const updateOption = (id: string, field: "label" | "price", value: string) => {
    setOptions(options.map(opt => opt.id === id ? { ...opt, [field]: value } : opt));
  };

  return (
    <>
      <div className="space-y-2">
        {options.map((opt) => (
          <div key={opt.id} className="flex items-center gap-2">
            <input
              name="optionLabel[]"
              placeholder={locale === "fr" ? "Option" : "Option"}
              value={opt.label}
              onChange={(e) => updateOption(opt.id, "label", e.target.value)}
              className="flex-1 h-9 rounded-lg border border-black/15 px-3 text-xs"
            />
            <input
              name="optionPrice[]"
              type="number"
              min="0"
              placeholder="€"
              value={opt.price}
              onChange={(e) => updateOption(opt.id, "price", e.target.value)}
              className="w-24 h-9 rounded-lg border border-black/15 px-2 text-xs"
            />
            <button
              type="button"
              onClick={() => removeOption(opt.id)}
              className="h-9 px-3 rounded-lg bg-red-50 text-red-600 text-xs hover:bg-red-100"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addOption}
        className="mt-2 h-8 px-3 rounded-full bg-black/5 hover:bg-black/10 text-xs font-medium"
      >
        + {locale === "fr" ? "Ajouter une option" : "Add option"}
      </button>
    </>
  );
}

