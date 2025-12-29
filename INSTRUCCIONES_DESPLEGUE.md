# 🚀 Instrucciones para Desplegar nextmv-proxy en Supabase

## ⚠️ IMPORTANTE: Usa Edge Functions, NO Database Functions

Estás creando una **Edge Function**, no una función de base de datos SQL. Sigue estos pasos cuidadosamente:

## 🌐 Método 1: Interfaz Web de Supabase (Más Fácil)

### Paso 1: Ir a Edge Functions
1. Ve a: https://supabase.com/dashboard/project/hfirvmmpemmrubtrznvm
2. En el menú lateral izquierdo, busca **"Edge Functions"** (NO "Database" → "Functions")
3. Si no ves "Edge Functions", busca en el menú o haz clic en "More" para ver más opciones

### Paso 2: Crear Nueva Función Edge
1. Haz clic en **"Create a new function"** o el botón **"+"**
2. Nombre de la función: `nextmv-proxy` (sin espacios, todo en minúsculas)
3. Se abrirá un editor de código

### Paso 3: Pegar el Código
1. Abre el archivo `supabase/functions/nextmv-proxy/index.ts` en tu editor local
2. Copia **TODO** el contenido del archivo
3. Pégalo en el editor de Supabase
4. Haz clic en **"Deploy"** o **"Save"**

### Paso 4: Configurar Variable de Entorno
1. Después de desplegar, haz clic en la función `nextmv-proxy`
2. Ve a la pestaña **"Settings"** o **"Secrets"**
3. Haz clic en **"Add a new secret"**
4. Nombre: `NEXTMV_API_KEY`
5. Valor: `nxmvv1_lhcoj3zDR:f5d1c365105ef511b4c47d67c6c13a729c2faecd36231d37dcdd2fcfffd03a6813235230`
6. Guarda

## 💻 Método 2: Usando Supabase CLI

### Paso 1: Instalar CLI
```bash
npm install -g supabase
```

### Paso 2: Login
```bash
supabase login
```

### Paso 3: Enlazar Proyecto
```bash
supabase link --project-ref hfirvmmpemmrubtrznvm
```

### Paso 4: Desplegar
```bash
supabase functions deploy nextmv-proxy
```

### Paso 5: Configurar Secret (CLI)
```bash
supabase secrets set NEXTMV_API_KEY=nxmvv1_lhcoj3zDR:f5d1c365105ef511b4c47d67c6c13a729c2faecd36231d37dcdd2fcfffd03a6813235230 --project-ref hfirvmmpemmrubtrznvm
```

## ✅ Verificar que Funciona

Después de desplegar, prueba con:
```bash
curl https://hfirvmmpemmrubtrznvm.supabase.co/functions/v1/nextmv-proxy/v1/applications/workspace-dgxjzzgctd/runs
```

Si devuelve datos o un error JSON (no "NOT_FOUND"), significa que está funcionando.

## 🔍 Ubicación Correcta en Supabase Dashboard

```
Dashboard
├── Table Editor
├── SQL Editor
├── Authentication
├── Storage
├── Edge Functions  ← AQUÍ (no Database Functions)
│   └── Create function
├── Database
│   └── Functions  ← NO AQUÍ (estas son SQL functions)
└── Settings
```

Si no encuentras "Edge Functions", puede estar en:
- "Functions" (pero debe decir "Edge Functions" o tener el logo de Deno)
- O en "More" → "Edge Functions"

