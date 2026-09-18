-- Create alarmorganisering table
CREATE TABLE IF NOT EXISTS public.alarmorganisering (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    kunde_id UUID REFERENCES public.customer(id),
    anlegg_id UUID REFERENCES public.anlegg(id),
    dato DATE NOT NULL DEFAULT CURRENT_DATE,
    revisjon TEXT DEFAULT '1.0',
    service_ingeniør TEXT,
    
    -- Customer info fields
    kundeadresse TEXT,
    kontakt_person TEXT,
    mobil TEXT,
    e_post TEXT,
    annet TEXT,
    
    -- Specific alarm organization fields
    samspill_teknisk_organisatorisk TEXT,
    styringsmatrise TEXT,
    type_overforing TEXT,
    overvakingstid TEXT,
    innstallasjon TEXT,
    gjeldende_teknisk_forskrift TEXT,
    
    -- Overview and control fields
    antall_styringer TEXT,
    brannklokker_aktivering TEXT,
    visuell_varsling_aktivering TEXT,
    alarm_aktivering TEXT,
    seksjoneringsoppsett TEXT,
    styringer_data JSONB,
    
    -- 1. DETEKSJON (Detection) fields
    detektortyper TEXT,
    detektorplassering TEXT,
    alarmnivaa_forvarsel TEXT,
    alarmnivaa_stille TEXT,
    alarmnivaa_stor TEXT,
    tekniske_tiltak_unodige_alarmer TEXT,
    
    -- 2. MELDING (Notification) fields  
    hvem_faar_melding TEXT,
    hvordan_melding_mottas TEXT,
    verifikasjonsmetoder TEXT,
    kommunikasjonskanaler TEXT,
    meldingsrutiner TEXT,
    
    -- 3. OPPKOBLING (Connection/Integration) fields
    integrasjon_andre_systemer TEXT,
    forriglinger TEXT,
    automatiske_funksjoner TEXT,
    
    -- 4. TILTAK (Measures) fields
    organisatoriske_prosesser TEXT,
    evakueringsprosedyrer TEXT,
    beredskapsplaner TEXT,
    ansvarlige_personer TEXT,
    opplaering_rutiner TEXT,
    
    -- Status and metadata
    status TEXT DEFAULT 'Utkast' CHECK (status IN ('Utkast', 'Ferdig', 'Arkivert')),
    opprettet_dato TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    oppdatert_dato TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    opprettet_av UUID REFERENCES auth.users(id),
    
    CONSTRAINT alarmorganisering_kunde_anlegg_check 
        CHECK (kunde_id IS NOT NULL OR anlegg_id IS NOT NULL)
);

-- Enable RLS
ALTER TABLE public.alarmorganisering ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view all alarmorganisering" ON public.alarmorganisering
    FOR SELECT USING (true);

CREATE POLICY "Users can insert alarmorganisering" ON public.alarmorganisering
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update alarmorganisering" ON public.alarmorganisering
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete alarmorganisering" ON public.alarmorganisering
    FOR DELETE USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_alarmorganisering_kunde_id ON public.alarmorganisering(kunde_id);
CREATE INDEX IF NOT EXISTS idx_alarmorganisering_anlegg_id ON public.alarmorganisering(anlegg_id);
CREATE INDEX IF NOT EXISTS idx_alarmorganisering_dato ON public.alarmorganisering(dato);
CREATE INDEX IF NOT EXISTS idx_alarmorganisering_status ON public.alarmorganisering(status);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_alarmorganisering_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.oppdatert_dato = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_alarmorganisering_updated_at
    BEFORE UPDATE ON public.alarmorganisering
    FOR EACH ROW
    EXECUTE FUNCTION update_alarmorganisering_updated_at();
