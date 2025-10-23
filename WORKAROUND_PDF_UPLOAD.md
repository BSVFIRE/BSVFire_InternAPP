# Workaround: PDF Upload uten pdf-parse

## Problem
`pdf-parse` biblioteket fungerer ikke stabilt i Supabase Edge Functions (Deno runtime).

## Løsning 1: Manuell Tekstekstraksjon (Raskest)

### Steg 1: Ekstraher tekst fra PDF
1. Åpne PDF-en i Preview/Adobe Reader
2. Velg all tekst (Cmd+A)
3. Kopier (Cmd+C)

### Steg 2: Legg til i Supabase
1. Gå til Supabase Dashboard → Table Editor → `knowledge_base`
2. Klikk "Insert row"
3. Fyll ut:
   - **title**: "NS3960:2019 - [Kapittel/Seksjon]"
   - **content**: [Lim inn kopiert tekst]
   - **category**: "Standard"
   - **source**: "NS3960:2019"
   - **metadata**: `{"standard": "NS3960", "year": "2019"}`

### Steg 3: Generer Embeddings
Kjør dette scriptet:
```bash
npx tsx scripts/generate-embeddings.ts
```

## Løsning 2: Bruk Online PDF til Tekst Konverter

1. Gå til https://www.ilovepdf.com/pdf_to_text
2. Last opp PDF-en
3. Last ned .txt filen
4. Følg Steg 2 og 3 fra Løsning 1

## Løsning 3: Bruk Python Script (Hvis du har Python)

```python
import PyPDF2
import json

def extract_text_from_pdf(pdf_path):
    with open(pdf_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        text = ''
        for page in reader.pages:
            text += page.extract_text()
    return text

# Bruk
text = extract_text_from_pdf('NS3960_2019.pdf')
print(text)
```

## Løsning 4: Alternativ Edge Function (Uten pdf-parse)

Jeg kan lage en Edge Function som:
1. Tar imot **ren tekst** i stedet for PDF
2. Deler opp teksten i chunks
3. Genererer embeddings
4. Lagrer i database

Dette vil fungere 100% stabilt.

## Anbefaling

For nå: **Bruk Løsning 1** (manuell tekstekstraksjon)
- Raskest å komme i gang
- Ingen tekniske problemer
- Du kan alltid automatisere senere

Hvis du har mange PDF-er: **Bruk Løsning 3** (Python script)
- Kan prosessere mange PDF-er automatisk
- Mer pålitelig enn pdf-parse i Deno
