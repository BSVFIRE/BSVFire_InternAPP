-- Legg til tegninger-kolonner i prosjekter-tabellen

-- Status: Oppdatere gamle eller Opprette nye
ALTER TABLE prosjekter 
ADD COLUMN IF NOT EXISTS tegninger_status VARCHAR(20) CHECK (tegninger_status IN ('oppdatere_gamle', 'opprette_nye'));

-- Kilde: Hvordan nye tegninger skal lages (kun relevant hvis opprette_nye)
ALTER TABLE prosjekter 
ADD COLUMN IF NOT EXISTS tegninger_kilde VARCHAR(20) CHECK (tegninger_kilde IN ('3d_scanning', 'kladd_for_hand', 'underlag_fra_kunde'));

-- Typer: Array med tegningstyper (o_planer, romningsplaner)
ALTER TABLE prosjekter 
ADD COLUMN IF NOT EXISTS tegninger_typer TEXT[] DEFAULT '{}';
