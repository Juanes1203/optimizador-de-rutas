import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Get Supabase environment variables (automatically provided by Supabase)
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || Deno.env.get("SUPABASE_PROJECT_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Nextmv API Configuration
const NEXTMV_APPLICATION_ID = "workspace-dgxjzzgctd";
const NEXTMV_API_BASE_URL = "https://api.cloud.nextmv.io/v1";
const NEXTMV_API_ENDPOINT = `${NEXTMV_API_BASE_URL}/applications/${NEXTMV_APPLICATION_ID}/runs`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check environment variables, fallback to hardcoded key
    const NEXTMV_API_KEY = Deno.env.get("NEXTMV_API_KEY") || "nxmvv1_lhcoj3zDR:f5d1c365105ef511b4c47d67c6c13a729c2faecd36231d37dcdd2fcfffd03a6813235230";
    
    if (!NEXTMV_API_KEY) {
      console.error("NEXTMV_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "NEXTMV_API_KEY is not configured. Please set it in your Supabase project settings." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Use the Supabase URL and key (try multiple possible env var names)
    const supabaseUrl = SUPABASE_URL || Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = SUPABASE_SERVICE_ROLE_KEY || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Supabase environment variables not configured", {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
        envVars: Object.keys(Deno.env.toObject())
      });
      // Continue anyway - we'll try to create client without them or use request headers
    }

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { pickupPoints, vehicles } = requestBody;
    
    if (!pickupPoints || !Array.isArray(pickupPoints) || pickupPoints.length < 2) {
      return new Response(
        JSON.stringify({ error: "Se necesitan al menos 2 puntos de recogida" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!vehicles || !Array.isArray(vehicles) || vehicles.length === 0) {
      return new Response(
        JSON.stringify({ error: "Se necesita al menos 1 vehículo" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Optimizing routes for:", { pickupPoints: pickupPoints.length, vehicles: vehicles.length });

    // Format data for Nextmv API
    const nextmvRequest = {
      defaults: {
        vehicles: {
          speed: 10,
          start_time: "2025-01-01T08:00:00Z",
          end_time: "2025-01-01T18:00:00Z"
        }
      },
      stops: pickupPoints.map((point: any, index: number) => {
        const lon = parseFloat(point.longitude);
        const lat = parseFloat(point.latitude);
        
        if (isNaN(lon) || isNaN(lat)) {
          console.error(`Invalid coordinates for point ${point.id}:`, { longitude: point.longitude, latitude: point.latitude });
          throw new Error(`Invalid coordinates for point ${point.name || point.id}: longitude=${point.longitude}, latitude=${point.latitude}`);
        }
        
        return {
          id: point.id || `stop-${index}`,
          location: {
            lon: lon,
            lat: lat
          },
          quantity: [1]
        };
      }),
      vehicles: vehicles.map((vehicle: any, index: number) => {
        let startLocation;
        if (vehicle.start_location && vehicle.start_location.longitude && vehicle.start_location.latitude) {
          startLocation = {
            lon: parseFloat(vehicle.start_location.longitude),
            lat: parseFloat(vehicle.start_location.latitude)
          };
        } else if (pickupPoints[0] && pickupPoints[0].longitude && pickupPoints[0].latitude) {
          startLocation = {
            lon: parseFloat(pickupPoints[0].longitude),
            lat: parseFloat(pickupPoints[0].latitude)
          };
        } else {
          throw new Error("No valid start location available for vehicles");
        }
        
        if (isNaN(startLocation.lon) || isNaN(startLocation.lat)) {
          throw new Error(`Invalid start location coordinates: lon=${startLocation.lon}, lat=${startLocation.lat}`);
        }
        
        return {
          id: vehicle.id || `vehicle-${index}`,
          start_location: startLocation,
          capacity: [parseInt(String(vehicle.capacity)) || 100],
          max_distance: parseFloat(String(vehicle.max_distance)) || 1000000
        };
      })
    };

    console.log("Sending request to Nextmv:", JSON.stringify(nextmvRequest, null, 2));

    // Call Nextmv API
    // Note: application_id "cvrp" is now in the URL path, not in the payload
    const nextmvPayload = {
      input: nextmvRequest,
      options: {
        solve: {
          duration: "10s"
        }
      }
    };
    
    console.log("Nextmv payload:", JSON.stringify(nextmvPayload, null, 2));
    console.log("Using API key:", NEXTMV_API_KEY ? `${NEXTMV_API_KEY.substring(0, 20)}...` : "NOT SET");
    
    // IMPORTANT: Using the correct Nextmv API endpoint
    console.log("Nextmv API Configuration:", {
      applicationId: NEXTMV_APPLICATION_ID,
      endpoint: NEXTMV_API_ENDPOINT,
      baseUrl: NEXTMV_API_BASE_URL
    });
    
    let response: Response;
    try {
      // Add timeout to prevent hanging (30 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 30000);
      
      try {
        console.log("Making request to:", NEXTMV_API_ENDPOINT);
        response = await fetch(NEXTMV_API_ENDPOINT, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${NEXTMV_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(nextmvPayload),
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (fetchError: any) {
      console.error("Error fetching Nextmv API:", fetchError);
      
      // Check for DNS/network errors
      const errorMessage = fetchError?.message || String(fetchError);
      
      if (errorMessage.includes("dns error") || 
          errorMessage.includes("failed to lookup") || 
          errorMessage.includes("Name or service not known") ||
          errorMessage.includes("getaddrinfo")) {
        
        // Check if we're in a local environment
        const isLocal = Deno.env.get("DENO_ENV") === "development" || 
                       !Deno.env.get("SUPABASE_URL") ||
                       Deno.env.get("SUPABASE_URL")?.includes("localhost") ||
                       Deno.env.get("SUPABASE_URL")?.includes("127.0.0.1");
        
        if (isLocal) {
          throw new Error(
            "Error DNS: No se puede resolver api.cloud.nextmv.io. " +
            "Las funciones de Supabase necesitan estar desplegadas en la nube para acceder a APIs externas. " +
            "Ejecuta: supabase functions deploy optimize-routes"
          );
        } else {
          throw new Error(
            "Error DNS: No se puede conectar a la API de Nextmv (api.cloud.nextmv.io). " +
            "Verifica: 1) Que la función esté desplegada, 2) Que no haya restricciones de red, " +
            "3) Que el dominio api.cloud.nextmv.io sea accesible desde el servidor de Supabase."
          );
        }
      } else if (errorMessage.includes("aborted") || errorMessage.includes("timeout")) {
        throw new Error(
          "Timeout: La conexión con la API de Nextmv tardó demasiado. " +
          "Intenta nuevamente o verifica tu conexión a internet."
        );
      } else if (errorMessage.includes("Connect") || errorMessage.includes("connection")) {
        throw new Error(
          "Error de conexión con la API de Nextmv. " +
          "Verifica tu conexión a internet y que la función esté desplegada correctamente."
        );
      } else {
        throw new Error(`Error al conectar con Nextmv API: ${errorMessage}`);
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Nextmv API error:", response.status, errorText);
      throw new Error(`Nextmv API error: ${response.status} ${errorText}`);
    }

    let result;
    try {
      result = await response.json();
      console.log("Nextmv response:", JSON.stringify(result, null, 2));
    } catch (jsonError) {
      console.error("Error parsing Nextmv response:", jsonError);
      const errorText = await response.text();
      throw new Error(`Failed to parse Nextmv response: ${errorText}`);
    }

    // Store routes in database (optional - function will work even if this fails)
    let supabase: ReturnType<typeof createClient> | null = null;
    try {
      if (supabaseUrl && supabaseKey) {
        supabase = createClient(supabaseUrl, supabaseKey);
        console.log("Supabase client created successfully");
      } else {
        // Try to get from request headers
        const authHeader = req.headers.get("authorization");
        const apiKey = req.headers.get("apikey");
        const urlFromHeader = req.headers.get("x-supabase-url");
        
        if (urlFromHeader && (authHeader || apiKey)) {
          supabase = createClient(urlFromHeader, authHeader?.replace("Bearer ", "") || apiKey || "");
          console.log("Supabase client created from headers");
        } else {
          console.warn("Cannot create Supabase client - will skip database operations but return result");
        }
      }
    } catch (clientError) {
      console.error("Error creating Supabase client:", clientError);
      // Continue without database - we'll still return the optimization result
    }

    // Parse and store routes (only if we have a Supabase client)
    if (supabase && result.solutions && result.solutions.length > 0) {
      try {
        const solution = result.solutions[0];
        
        // Clear old routes before inserting new ones
        const { error: deleteError } = await supabase
          .from("routes")
          .delete()
          .gte("created_at", "1970-01-01");
        
        if (deleteError) {
          console.warn("Error clearing old routes:", deleteError);
          // Continue anyway - we'll just add new routes
        }
        
        const routeInserts: Promise<any>[] = [];
        for (const vehicle of solution.vehicles || []) {
          // Find the original vehicle by matching the id
          const originalVehicle = vehicles.find((v: any) => v.id === vehicle.id || `vehicle-${vehicles.indexOf(v)}` === vehicle.id);
          
          const routeData = {
            vehicle_id: originalVehicle?.id || null,
            route_data: vehicle,
            total_distance: parseFloat(vehicle.route_distance) || 0,
            total_duration: parseInt(vehicle.route_duration) || 0
          };

          if (supabase) {
            routeInserts.push(supabase.from("routes").insert(routeData));
          }
        }

        const insertResults = await Promise.all(routeInserts);
        const insertErrors = insertResults.filter((r: any) => r.error);
        if (insertErrors.length > 0) {
          console.error("Error inserting routes:", insertErrors);
          // Don't throw, just log - we still want to return the solution
        } else {
          console.log("Routes saved to database successfully");
        }
      } catch (dbError) {
        console.error("Error saving routes to database:", dbError);
        // Don't throw - we still want to return the optimization result
      }
    } else if (!supabase) {
      console.warn("No Supabase client available - skipping database save");
    } else {
      console.warn("No solutions found in Nextmv response");
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in optimize-routes:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error("Error details:", {
      message: errorMessage,
      stack: errorStack,
      name: error instanceof Error ? error.name : undefined,
      errorType: typeof error,
      errorString: String(error)
    });
    
    // Ensure error message is always a string and not empty
    const finalErrorMessage = errorMessage || "Unknown error occurred";
    
    return new Response(
      JSON.stringify({ 
        error: finalErrorMessage,
        message: finalErrorMessage, // Also include as 'message' for compatibility
        details: Deno.env.get("DENO_ENV") === "development" ? errorStack : undefined
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
