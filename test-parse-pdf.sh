#!/bin/bash

# Test parse-pdf Edge Function med en minimal PDF

# Opprett en minimal test PDF (base64)
# Dette er en veldig enkel PDF med teksten "Test"
TEST_PDF_BASE64="JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDIgMCBSL1Jlc291cmNlczw8L0ZvbnQ8PC9GMSA1IDAgUj4+Pj4vTWVkaWFCb3hbMCAwIDYxMiA3OTJdL0NvbnRlbnRzIDQgMCBSPj4KZW5kb2JqCjQgMCBvYmoKPDwvTGVuZ3RoIDQ0Pj4Kc3RyZWFtCkJUCi9GMSA0OCBUZgoxMCA3MDAgVGQKKFRlc3QpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PgplbmRvYmoKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKNSAwIG9iago8PC9UeXBlL0ZvbnQvU3VidHlwZS9UeXBlMS9CYXNlRm9udC9IZWx2ZXRpY2E+PgplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmDQowMDAwMDAwMjczIDAwMDAwIG4NCjAwMDAwMDAyMjQgMDAwMDAgbg0KMDAwMDAwMDAxNSAwMDAwMCBuDQowMDAwMDAwMTI0IDAwMDAwIG4NCjAwMDAwMDAzMjIgMDAwMDAgbg0KdHJhaWxlcgo8PC9TaXplIDYvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZgo0MDIKJSVFT0Y="

echo "Testing parse-pdf Edge Function..."
echo ""

curl -i --location --request POST 'https://snyzduzqyjsllzvwuahh.supabase.co/functions/v1/parse-pdf' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNueXpkdXpxeWpzbGx6dnd1YWhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3ODk0NzEsImV4cCI6MjA2MDM2NTQ3MX0.WLOcnCSiNHTsFIf0S_2hM-y3QyEnM6lzGn4vcIXMLuc' \
  --header 'Content-Type: application/json' \
  --data '{
    "pdfBase64": "'"$TEST_PDF_BASE64"'",
    "fileName": "test.pdf"
  }'
