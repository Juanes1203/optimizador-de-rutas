#!/bin/bash

# Script para desplegar la función Edge nextmv-proxy en Supabase
# Asegúrate de tener Supabase CLI instalado: npm install -g supabase

echo "🚀 Desplegando función nextmv-proxy en Supabase..."

# Verificar si supabase CLI está instalado
if ! command -v supabase &> /dev/null
then
    echo "❌ Supabase CLI no está instalado."
    echo "Instálalo con: npm install -g supabase"
    exit 1
fi

# Verificar si estamos logueados
if ! supabase projects list &> /dev/null; then
    echo "⚠️  No estás logueado en Supabase CLI"
    echo "Ejecuta: supabase login"
    exit 1
fi

# Enlazar proyecto (si no está enlazado)
echo "📎 Enlazando proyecto..."
supabase link --project-ref hfirvmmpemmrubtrznvm

# Desplegar función
echo "📦 Desplegando función nextmv-proxy..."
supabase functions deploy nextmv-proxy

echo "✅ ¡Despliegue completado!"
echo ""
echo "📝 No olvides configurar la variable de entorno NEXTMV_API_KEY en Supabase:"
echo "   1. Ve a https://supabase.com/dashboard/project/hfirvmmpemmrubtrznvm"
echo "   2. Edge Functions → nextmv-proxy → Settings → Secrets"
echo "   3. Agrega: NEXTMV_API_KEY = tu_api_key_de_nextmv"

