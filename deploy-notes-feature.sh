#!/bin/bash

# Deploy Notes Feature - Automated Script
# This script will deploy the inspection notes feature with Azure OpenAI

echo "🚀 Starting deployment of Notes Feature..."
echo ""

# Check if we're in the right directory
if [ ! -d "supabase/functions" ]; then
    echo "❌ Error: Not in the correct directory"
    echo "Please run this script from the Firebase_BSVFire directory"
    exit 1
fi

# Step 1: Run database migration
echo "📊 Step 1/3: Running database migration..."
supabase db push

if [ $? -ne 0 ]; then
    echo "❌ Database migration failed"
    echo "Please check your Supabase connection and try again"
    exit 1
fi

echo "✅ Database migration completed"
echo ""

# Step 2: Deploy transcribe-audio-azure function
echo "🎤 Step 2/3: Deploying Whisper transcription function..."
supabase functions deploy transcribe-audio-azure

if [ $? -ne 0 ]; then
    echo "❌ Whisper function deployment failed"
    exit 1
fi

echo "✅ Whisper function deployed"
echo ""

# Step 3: Deploy ai-improve-note-azure function
echo "🤖 Step 3/3: Deploying AI note improvement function..."
supabase functions deploy ai-improve-note-azure

if [ $? -ne 0 ]; then
    echo "❌ AI function deployment failed"
    exit 1
fi

echo "✅ AI function deployed"
echo ""

# Success message
echo "🎉 Deployment completed successfully!"
echo ""
echo "Next steps:"
echo "1. Restart your dev server: npm run dev"
echo "2. Go to a fire alarm inspection (FG790 or NS3960)"
echo "3. Look for the floating notes button (💬) in the bottom right"
echo ""
echo "Happy inspecting! 🔥"
