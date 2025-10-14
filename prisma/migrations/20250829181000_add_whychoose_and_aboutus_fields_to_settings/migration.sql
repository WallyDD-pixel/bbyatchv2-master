-- Ajout des champs pour 'Pourquoi choisir BB Services Charter' et 'Qui sommes-nous'
ALTER TABLE Settings ADD COLUMN whyChooseExpertise TEXT;
ALTER TABLE Settings ADD COLUMN whyChooseService TEXT;
ALTER TABLE Settings ADD COLUMN aboutUsTitle TEXT;
