-- Retting etter 20260918_rls_hardening.sql.
-- Blokk 1 fjernet «Alle kan lese …» på anleggsdata_nodlys og kontaktperson_ekstern, men disse to tabellene
-- hadde – i motsetning til customer/anlegg/kontaktpersoner – ingen annen SELECT-policy. Resultat: tomme
-- nødlyslister og eksterne kontaktpersoner for alle innloggede. Gjenoppretter lesetilgang for innloggede.
create policy "Innloggede kan lese anleggsdata_nodlys"
  on anleggsdata_nodlys for select to authenticated using (true);

create policy "Innloggede kan lese eksterne kontaktpersoner"
  on kontaktperson_ekstern for select to authenticated using (true);
