# Instrucciones para Desplegar Funciones Edge de Supabase

Para que la aplicación funcione en producción, necesitas desplegar la función Edge `nextmv-proxy` en Supabase.

## Opción 1: Usando Supabase CLI (Recomendado)

1. **Instalar Supabase CLI** (si no lo tienes):
   ```bash
   npm install -g supabase
   ```

2. **Iniciar sesión en Supabase**:
   ```bash
   supabase login
   ```

3. **Enlazar tu proyecto** (necesitas el project ID y el access token):
   ```bash
   supabase link --project-ref hfirvmmpemmrubtrznvm
   ```
   (Usa el project_ref de tu proyecto de Supabase)

4. **Desplegar la función**:
   ```bash
   supabase functions deploy nextmv-proxy
   ```

## Opción 2: Usando la interfaz web de Supabase

1. Ve a tu proyecto en https://supabase.com/dashboard
2. Navega a "Edge Functions" en el menú lateral
3. Haz clic en "Create a new function"
4. Nombre: `nextmv-proxy`
5. Copia el contenido de `supabase/functions/nextmv-proxy/index.ts`
6. Pega el código en el editor
7. Haz clic en "Deploy"

## Opción 3: Configurar variables de entorno en Supabase

Después de desplegar, asegúrate de configurar la variable de entorno `NEXTMV_API_KEY`:

1. Ve a tu proyecto en Supabase Dashboard
2. Navega a "Edge Functions" → "nextmv-proxy"
3. Haz clic en "Settings" → "Secrets"
4. Agrega: `NEXTMV_API_KEY` con el valor de tu API key de NextMV

## Verificar que funciona

Puedes probar la función con:
```bash
curl -X GET "https://hfirvmmpemmrubtrznvm.supabase.co/functions/v1/nextmv-proxy/v1/applications/workspace-dgxjzzgctd/runs" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

