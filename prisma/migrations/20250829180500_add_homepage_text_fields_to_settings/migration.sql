-- Ajout des champs pour la page d'accueil (hors section "Vivre une expérience")
ALTER TABLE Settings ADD COLUMN bbServiceText TEXT;
ALTER TABLE Settings ADD COLUMN whyChooseTitle TEXT;
ALTER TABLE Settings ADD COLUMN whyChooseList TEXT;
