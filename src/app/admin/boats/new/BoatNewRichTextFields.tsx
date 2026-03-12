"use client";

import { useState } from "react";
import RichTextEditor from "@/components/RichTextEditor";

export default function BoatNewRichTextFields({ locale }: { locale: "fr" | "en" }) {
  const [avantagesFr, setAvantagesFr] = useState("");
  const [avantagesEn, setAvantagesEn] = useState("");
  const [optionsInclusesFr, setOptionsInclusesFr] = useState("");
  const [optionsInclusesEn, setOptionsInclusesEn] = useState("");

  return (
    <>
      <input type="hidden" name="avantagesFr" value={avantagesFr} readOnly />
      <input type="hidden" name="avantagesEn" value={avantagesEn} readOnly />
      <input type="hidden" name="optionsInclusesFr" value={optionsInclusesFr} readOnly />
      <input type="hidden" name="optionsInclusesEn" value={optionsInclusesEn} readOnly />
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-black/70 border-b border-black/10 pb-2">
          {locale === "fr" ? "Avantages du bateau" : "Boat Advantages"}
        </h2>
        <RichTextEditor
          label={locale === "fr" ? "Avantages (FR)" : "Advantages (FR)"}
          value={avantagesFr}
          onChange={setAvantagesFr}
          placeholder={locale === "fr" ? "Équipements, confort, espace disponible…" : "Equipment, comfort, available space…"}
          minHeight="120px"
        />
        <RichTextEditor
          label={locale === "fr" ? "Avantages (EN)" : "Advantages (EN)"}
          value={avantagesEn}
          onChange={setAvantagesEn}
          placeholder={locale === "fr" ? "Equipment, comfort, available space…" : "Equipment, comfort, available space…"}
          minHeight="120px"
        />
      </div>
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-black/70 border-b border-black/10 pb-2">
          {locale === "fr" ? "Options incluses" : "Included Options"}
        </h2>
        <RichTextEditor
          label={locale === "fr" ? "Options incluses (FR)" : "Included Options (FR)"}
          value={optionsInclusesFr}
          onChange={setOptionsInclusesFr}
          placeholder={locale === "fr" ? "Prêt de serviettes, boissons offertes, etc." : "Towel rental, drinks included, etc."}
          minHeight="120px"
        />
        <RichTextEditor
          label={locale === "fr" ? "Options incluses (EN)" : "Included Options (EN)"}
          value={optionsInclusesEn}
          onChange={setOptionsInclusesEn}
          placeholder={locale === "fr" ? "Towel rental, drinks included, etc." : "Towel rental, drinks included, etc."}
          minHeight="120px"
        />
      </div>
    </>
  );
}
