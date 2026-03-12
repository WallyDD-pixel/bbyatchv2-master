"use client";

import { useState } from "react";
import RichTextEditor from "@/components/RichTextEditor";

interface UsedBoatRichTextFieldsProps {
  locale: "fr" | "en";
  summaryFr?: string;
  descriptionFr?: string;
}

export default function UsedBoatRichTextFields({
  locale,
  summaryFr = "",
  descriptionFr = "",
}: UsedBoatRichTextFieldsProps) {
  const [summary, setSummary] = useState(summaryFr);
  const [description, setDescription] = useState(descriptionFr);

  return (
    <>
      <input type="hidden" name="summaryFr" value={summary} readOnly />
      <input type="hidden" name="summaryEn" value="" readOnly />
      <input type="hidden" name="descriptionFr" value={description} readOnly />
      <input type="hidden" name="descriptionEn" value="" readOnly />
      <RichTextEditor
        label={locale === "fr" ? "Résumé" : "Summary"}
        value={summary}
        onChange={setSummary}
        placeholder={locale === "fr" ? "Courte accroche pour la liste…" : "Short summary for listing…"}
        minHeight="80px"
      />
      <RichTextEditor
        label={locale === "fr" ? "Description" : "Description"}
        value={description}
        onChange={setDescription}
        placeholder={locale === "fr" ? "Description détaillée du bateau…" : "Detailed boat description…"}
        minHeight="180px"
      />
    </>
  );
}
