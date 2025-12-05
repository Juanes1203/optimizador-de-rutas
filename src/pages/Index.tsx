import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Map from "@/components/Map";
import PickupPointForm from "@/components/PickupPointForm";
import VehicleConfig from "@/components/VehicleConfig";
import PickupPointsList from "@/components/PickupPointsList";
import { Play, MapPin, Truck, Route, MousePointerClick, ChevronDown, ChevronUp, Code, ArrowLeft, Plus, History, X, Upload, Trash2 } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PickupPoint {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  quantity?: number;
}

interface Vehicle {
  id?: string;
  name: string;
  capacity: number;
  max_distance: number;
  start_location?: {
    lon: number;
    lat: number;
  };
  end_location?: {
    lon: number;
    lat: number;
  };
}

const Index = () => {
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [clickMode, setClickMode] = useState(false);
  const [focusedPoint, setFocusedPoint] = useState<PickupPoint | null>(null);
  const [editingPickupPoint, setEditingPickupPoint] = useState<PickupPoint | null>(null);
  const [vehicleLocationMode, setVehicleLocationMode] = useState<"start" | "end" | null>(null);
  const [vehicleLocationCallback, setVehicleLocationCallback] = useState<((lon: number, lat: number) => void) | null>(null);
  const [currentVehicleStartLocation, setCurrentVehicleStartLocation] = useState<{ lon: number; lat: number } | null>(null);
  const [currentVehicleEndLocation, setCurrentVehicleEndLocation] = useState<{ lon: number; lat: number } | null>(null);
  const [nextmvJson, setNextmvJson] = useState<any>(null);
  const [nextmvEndpoint, setNextmvEndpoint] = useState<string | null>(null);
  const [showNextmvJson, setShowNextmvJson] = useState(false);
  const [runs, setRuns] = useState<any[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedRunData, setSelectedRunData] = useState<any | null>(null);
  const [isLoadingRuns, setIsLoadingRuns] = useState(false);
  const [isNewRunMode, setIsNewRunMode] = useState(false);
  const [isPickupPointDialogOpen, setIsPickupPointDialogOpen] = useState(false);
  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);
  const [isPreviousRunsDialogOpen, setIsPreviousRunsDialogOpen] = useState(false);
  const [visibleRoutes, setVisibleRoutes] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    loadPickupPoints();
    loadVehicles();
    loadRuns();
  }, []);

  const loadRuns = async () => {
    setIsLoadingRuns(true);
    try {
      const NEXTMV_APPLICATION_ID = "workspace-dgxjzzgctd";
      const NEXTMV_API_KEY = import.meta.env.VITE_NEXTMV_API_KEY || "nxmvv1_lhcoj3zDR:f5d1c365105ef511b4c47d67c6c13a729c2faecd36231d37dcdd2fcfffd03a6813235230";
      
      const runsUrl = `https://api.cloud.nextmv.io/v1/applications/${NEXTMV_APPLICATION_ID}/runs`;
      const runsApiUrl = import.meta.env.DEV ? `/api/nextmv/v1/applications/${NEXTMV_APPLICATION_ID}/runs` : runsUrl;
      
      const response = await fetch(runsApiUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${NEXTMV_API_KEY}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load runs: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      // Handle both array and object with runs property
      const runsList = Array.isArray(data) ? data : (data.runs || data.items || []);
      
      // Sort by created_at descending (newest first)
      const sortedRuns = runsList.sort((a: any, b: any) => {
        const dateA = new Date(a.metadata?.created_at || a.created_at || 0).getTime();
        const dateB = new Date(b.metadata?.created_at || b.created_at || 0).getTime();
        return dateB - dateA;
      });
      
      setRuns(sortedRuns);
      console.log("Loaded runs:", sortedRuns);
    } catch (error) {
      console.error("Error loading runs:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las ejecuciones anteriores",
        variant: "destructive",
      });
    } finally {
      setIsLoadingRuns(false);
    }
  };

  const handleRunSelect = async (runId: string) => {
    setSelectedRunId(runId);
    setIsNewRunMode(false);
    setIsOptimizing(true);
    
    try {
      const NEXTMV_APPLICATION_ID = "workspace-dgxjzzgctd";
      const NEXTMV_API_KEY = import.meta.env.VITE_NEXTMV_API_KEY || "nxmvv1_lhcoj3zDR:f5d1c365105ef511b4c47d67c6c13a729c2faecd36231d37dcdd2fcfffd03a6813235230";
      
      const runUrl = `https://api.cloud.nextmv.io/v1/applications/${NEXTMV_APPLICATION_ID}/runs/${runId}`;
      const runApiUrl = import.meta.env.DEV ? `/api/nextmv/v1/applications/${NEXTMV_APPLICATION_ID}/runs/${runId}` : runUrl;
      
      const response = await fetch(runApiUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${NEXTMV_API_KEY}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load run: ${response.status} ${response.statusText}`);
      }
      
      const runData = await response.json();
      console.log("Loaded run data:", runData);
      
      // Store the run data for display
      setSelectedRunData(runData);
      
      // Check if run has solutions
      const solutions = runData.output?.solutions || runData.solutions;
      if (!solutions || solutions.length === 0) {
        throw new Error("Esta ejecución no tiene soluciones disponibles");
      }
      
      // Process and save routes to database
      const solution = solutions[0];
      
      // Clear old routes
      await supabase
        .from("routes")
        .delete()
        .gte("created_at", "1970-01-01");
      
      // Insert new routes
      const routeInserts = [];
      for (const vehicle of solution.vehicles || []) {
        const originalVehicle = vehicles.find((v) => v.id === vehicle.id || `vehicle-${vehicles.indexOf(v)}` === vehicle.id);
        
        const routeData = {
          vehicle_id: originalVehicle?.id || null,
          route_data: vehicle,
          total_distance: vehicle.route_travel_distance || 0,
          total_duration: vehicle.route_travel_duration || vehicle.route_duration || 0
        };

        routeInserts.push(
          supabase.from("routes").insert(routeData)
        );
      }

      await Promise.all(routeInserts);
      
      // Reload routes from database
      const { data: routesData, error: routesError } = await supabase
        .from("routes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(vehicles.length || 10);

      if (routesError) {
        console.error("Error loading routes:", routesError);
      } else {
        const loadedRoutes = routesData || [];
        setRoutes(loadedRoutes);
        // Initialize all routes as visible
        setVisibleRoutes(new Set(loadedRoutes.map((_, index) => index)));
      }
      
      toast({
        title: "Ejecución cargada",
        description: "Las rutas de la ejecución seleccionada se han cargado exitosamente",
      });
    } catch (error) {
      console.error("Error loading run:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo cargar la ejecución",
        variant: "destructive",
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleNewRun = () => {
    setIsNewRunMode(true);
    setSelectedRunId(null);
    setSelectedRunData(null);
    setRoutes([]);
    setVisibleRoutes(new Set());
    // Clear routes from database
    supabase
      .from("routes")
      .delete()
      .gte("created_at", "1970-01-01")
      .then(() => {
        console.log("Cleared routes for new run");
      });
  };

  const loadPickupPoints = async () => {
    // Try localStorage first (works without Supabase)
    try {
      const stored = localStorage.getItem('pickup_points');
      if (stored) {
        const data = JSON.parse(stored);
        const normalizedData = (data || []).map((point: any) => ({
          ...point,
          quantity: point.quantity != null && !isNaN(point.quantity) ? Number(point.quantity) : 1,
        }));
        console.log("=== PUNTOS CARGADOS DESDE LOCALSTORAGE ===");
        console.log(`Total puntos cargados: ${normalizedData.length}`);
        const pointsWithQty = normalizedData.filter(p => p.quantity > 1);
        console.log(`Puntos con cantidad > 1: ${pointsWithQty.length}`);
        
        if (pointsWithQty.length > 0) {
          console.log("Ejemplos de puntos con cantidad > 1:", pointsWithQty.slice(0, 5).map(p => ({
            name: p.name,
            lat: p.latitude,
            lon: p.longitude,
            quantity: p.quantity
          })));
        }
        
        setPickupPoints(normalizedData);
        return;
      }
    } catch (error) {
      console.warn("Error loading from localStorage, trying Supabase:", error);
    }

    // Fallback to Supabase if available
    try {
    const { data, error } = await supabase.from("pickup_points").select("*");
    if (error) {
      console.error("Error loading pickup points:", error);
      return;
    }
      
      // Check if quantity column exists by checking if any point has the quantity property
      const hasQuantityColumn = data && data.length > 0 && data.some((p: any) => 'quantity' in p);
      
      if (!hasQuantityColumn && data && data.length > 0) {
        console.warn("⚠️ ADVERTENCIA: La columna 'quantity' no existe en la base de datos");
        console.warn("Los puntos se mostrarán con cantidad = 1 por defecto");
        console.warn("Ejecuta este SQL en Supabase para agregar la columna:");
        console.warn(`
ALTER TABLE public.pickup_points
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
        `);
      }
      
      // Normalize quantity field - preserve the actual quantity value from database
      // Only default to 1 if truly null/undefined, but keep the actual consolidated count
    const normalizedData = (data || []).map((point: any) => ({
      ...point,
        quantity: point.quantity != null && !isNaN(point.quantity) ? Number(point.quantity) : 1,
      }));
      
      console.log("=== PUNTOS CARGADOS DESDE BD ===");
      console.log(`Total puntos cargados: ${normalizedData.length}`);
      const pointsWithQty = normalizedData.filter(p => p.quantity > 1);
      console.log(`Puntos con cantidad > 1: ${pointsWithQty.length}`);
      
      // Check specifically for the point the user mentioned
      const userPoint = normalizedData.find(p => 
        String(p.latitude) === '4.723551' && String(p.longitude) === '-74.092143'
      );
      if (userPoint) {
        console.log("🔍 PUNTO ESPECÍFICO DEL USUARIO EN CARGADOS:", {
          id: userPoint.id,
          name: userPoint.name,
          lat: userPoint.latitude,
          lon: userPoint.longitude,
          quantity: userPoint.quantity,
          quantityType: typeof userPoint.quantity
        });
      } else {
        console.warn("⚠️ PUNTO ESPECÍFICO DEL USUARIO NO ENCONTRADO EN CARGADOS");
      }
      
      if (pointsWithQty.length > 0) {
        console.log("Ejemplos de puntos con cantidad > 1:", pointsWithQty.slice(0, 5).map(p => ({
          name: p.name,
          lat: p.latitude,
          lon: p.longitude,
          quantity: p.quantity
        })));
      } else {
        console.warn("⚠️ ADVERTENCIA: Ningún punto cargado tiene cantidad > 1");
        console.log("Muestra de primeros 5 puntos:", normalizedData.slice(0, 5).map(p => ({
          name: p.name,
          quantity: p.quantity
        })));
      }
      
    setPickupPoints(normalizedData);
    } catch (supabaseError) {
      console.warn("Supabase not available, using localStorage only:", supabaseError);
    }
  };

  const loadVehicles = async () => {
    const { data, error } = await supabase.from("vehicles").select("*");
    if (error) {
      console.error("Error loading vehicles:", error);
      return;
    }
    setVehicles(data || []);
  };

  // Helper function to save points to localStorage
  const savePointsToLocalStorage = (points: PickupPoint[]) => {
    try {
      localStorage.setItem('pickup_points', JSON.stringify(points));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  };

  const handleAddPickupPoint = async (point: Omit<PickupPoint, "id"> & { id?: string }) => {
    if (editingPickupPoint) {
      // Update existing point
      const { id, ...updateData } = point;
      const quantity = updateData.quantity != null && !isNaN(updateData.quantity) 
        ? Math.max(1, Math.floor(updateData.quantity)) 
        : 1;
      
      const updatedPoint: PickupPoint = {
        ...editingPickupPoint,
        name: updateData.name,
        address: updateData.address,
        latitude: updateData.latitude,
        longitude: updateData.longitude,
        quantity: quantity,
      };

      // Update in localStorage
      const updatedPoints = pickupPoints.map((p) => (p.id === editingPickupPoint.id ? updatedPoint : p));
      setPickupPoints(updatedPoints);
      savePointsToLocalStorage(updatedPoints);
      
      // Try Supabase if available (optional)
      try {
        await supabase
          .from("pickup_points")
          .update({
            name: updateData.name,
            address: updateData.address,
            latitude: updateData.latitude,
            longitude: updateData.longitude,
            quantity: quantity,
          })
          .eq("id", editingPickupPoint.id);
      } catch (error) {
        console.warn("Supabase update failed (using localStorage):", error);
      }

        setEditingPickupPoint(null);
        setIsPickupPointDialogOpen(false);
    } else {
      // Insert new point
      const { id, ...insertData } = point;
      const quantity = insertData.quantity !== undefined && insertData.quantity !== null 
        ? Math.max(1, Math.floor(insertData.quantity)) 
        : 1;
      
      const newPoint: PickupPoint = {
        id: `local-${Date.now()}-${Math.random()}`,
        name: insertData.name,
        address: insertData.address || `${insertData.latitude}, ${insertData.longitude}`,
        latitude: insertData.latitude,
        longitude: insertData.longitude,
        quantity: quantity,
      };

      // Add to localStorage
      const updatedPoints = [...pickupPoints, newPoint];
      setPickupPoints(updatedPoints);
      savePointsToLocalStorage(updatedPoints);
      
      // Try Supabase if available (optional)
      try {
        await supabase
          .from("pickup_points")
          .insert([{
            name: insertData.name,
            address: insertData.address || `${insertData.latitude}, ${insertData.longitude}`,
            latitude: insertData.latitude,
            longitude: insertData.longitude,
            quantity: quantity,
          }]);
      } catch (error) {
        console.warn("Supabase insert failed (using localStorage):", error);
      }

        setIsPickupPointDialogOpen(false);
    }
  };

  const handleEditPickupPoint = (point: PickupPoint) => {
    setEditingPickupPoint(point);
    setIsPickupPointDialogOpen(true);
  };

  const handleCancelEditPickupPoint = () => {
    setEditingPickupPoint(null);
    setIsPickupPointDialogOpen(false);
  };

  const handleDeleteAllPickupPoints = async () => {
    if (pickupPoints.length === 0) {
      toast({
        title: "Info",
        description: "No hay puntos para eliminar",
      });
      return;
    }

    // Confirm deletion
    if (!confirm(`¿Estás seguro de que deseas eliminar todos los ${pickupPoints.length} puntos de recogida? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      // Delete from localStorage first
      localStorage.removeItem('pickup_points');
      
      // Try Supabase if available
      try {
        const { error } = await supabase
          .from("pickup_points")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

        if (error) {
          console.warn("Error deleting from Supabase (may not be available):", error);
        }

        // Also clear routes since they depend on pickup points
        await supabase
          .from("routes")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000");
      } catch (supabaseError) {
        console.warn("Supabase not available, using localStorage only:", supabaseError);
      }

      // Clear the state
      setPickupPoints([]);
      setRoutes([]);
      setVisibleRoutes(new Set());

      toast({
        title: "Puntos eliminados",
        description: `Se eliminaron ${pickupPoints.length} puntos de recogida exitosamente`,
      });
    } catch (error) {
      console.error("Error deleting all pickup points:", error);
      toast({
        title: "Error",
        description: `No se pudieron eliminar los puntos: ${error instanceof Error ? error.message : "Error desconocido"}`,
        variant: "destructive",
      });
    }
  };

  const handleExcelUpload = async (file: File) => {
    try {
      // First, delete all existing pickup points
      const { error: deleteError } = await supabase
        .from("pickup_points")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all (using a condition that always matches)
      
      if (deleteError) {
        console.error("Error deleting existing points:", deleteError);
        // Continue anyway, might be empty table
      } else {
        console.log("Puntos existentes eliminados");
        // Clear the state
        setPickupPoints([]);
      }

      // Dynamically import xlsx library
      // @ts-ignore - xlsx types may not be available until package is installed
      const XLSX = await import("xlsx").catch(() => {
        throw new Error("xlsx module not found. Please install it: npm install xlsx");
      });
      
      // Read the file
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      
      // Get the first sheet
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      if (!Array.isArray(jsonData) || jsonData.length === 0) {
        toast({
          title: "Error",
          description: "El archivo Excel está vacío o no tiene formato válido",
          variant: "destructive",
        });
        return;
      }

      // Group points by latitude and longitude, summing quantities
      interface PointData {
        latitude: number;
        longitude: number;
        quantity: number;
      }
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pointMap: any = {};
      
      // First, try to detect column names from the first row
      const firstRow = jsonData[0] as Record<string, any>;
      const allKeys = Object.keys(firstRow);
      
      // More flexible column name detection (case-insensitive, handles variations and Spanish)
      const latitudeKey = allKeys.find(
        key => {
          const normalized = key.toLowerCase().trim();
          return normalized === "latitude" || normalized === "lat" || 
                 normalized === "latitud" || normalized.includes("lat");
        }
      );
      const longitudeKey = allKeys.find(
        key => {
          const normalized = key.toLowerCase().trim();
          return normalized === "longitude" || normalized === "lon" || 
                 normalized === "lng" || normalized === "longitud" || 
                 normalized.includes("lon") || normalized.includes("lng");
        }
      );
      const quantityKey = allKeys.find(
        key => {
          const normalized = key.toLowerCase().trim();
          return normalized === "quantity" || normalized === "cantidad" || 
                 normalized === "qty" || normalized === "q" ||
                 normalized.includes("cantidad") || normalized.includes("quantity");
        }
        );
        
        if (!latitudeKey || !longitudeKey) {
        toast({
          title: "Error",
          description: `No se encontraron columnas de coordenadas. Buscando: "latitud/latitude" y "longitud/longitude". Columnas encontradas: ${allKeys.join(", ")}`,
          variant: "destructive",
        });
        return;
      }

      console.log("Columnas detectadas:", { latitudeKey, longitudeKey, quantityKey: quantityKey || "no encontrada" });
      console.log(`Total de filas en Excel: ${jsonData.length}`);

      // STEP 1: Read and process ALL rows first, counting occurrences
      let processedRows = 0;
      let skippedRows = 0;
      
      // Map to track occurrences: key -> { lat, lon, count, occurrences }
      const occurrenceMap: Record<string, {
        latitude: number;
        longitude: number;
        count: number; // Number of times this coordinate appears
        occurrences: number[]; // Track each occurrence for debugging
      }> = {};
      
      for (const row of jsonData) {
        const rowData = row as Record<string, any>;
        
        const lat = parseFloat(rowData[latitudeKey]);
        const lon = parseFloat(rowData[longitudeKey]);
        
        // Validate coordinates
        if (isNaN(lat) || isNaN(lon)) {
          console.warn("Invalid coordinates in row:", rowData);
          skippedRows++;
          continue;
        }
        
        // Validate latitude range (-90 to 90)
        if (lat < -90 || lat > 90) {
          console.warn(`Latitude out of range: ${lat}, skipping row:`, rowData);
          skippedRows++;
          continue;
        }
        
        // Validate longitude range (-180 to 180)
        if (lon < -180 || lon > 180) {
          console.warn(`Longitude out of range: ${lon}, skipping row:`, rowData);
          skippedRows++;
          continue;
        }
        
        // Filter points outside Colombia
        // Colombia coordinates: Latitude: ~4°N to ~12°N, Longitude: ~-79°W to ~-66°W
        const COLOMBIA_LAT_MIN = 4.0;
        const COLOMBIA_LAT_MAX = 12.5;
        const COLOMBIA_LON_MIN = -79.0;
        const COLOMBIA_LON_MAX = -66.0;
        
        if (lat < COLOMBIA_LAT_MIN || lat > COLOMBIA_LAT_MAX || 
            lon < COLOMBIA_LON_MIN || lon > COLOMBIA_LON_MAX) {
          console.warn(`Punto fuera de Colombia (lat: ${lat}, lon: ${lon}), omitiendo fila:`, rowData);
          skippedRows++;
          continue;
        }
        
        // Use coordinates as key for grouping - use EXACT coordinates as string
        // Convert to string with full precision to match exact duplicates
        const key = `${lat},${lon}`;
        
        if (occurrenceMap[key]) {
          // Increment count for duplicate coordinates
          const oldCount = occurrenceMap[key].count;
          occurrenceMap[key].count += 1;
          occurrenceMap[key].occurrences.push(occurrenceMap[key].count);
          processedRows++;
          console.log(`[DUPLICADO ENCONTRADO] Clave: ${key}, Cantidad anterior: ${oldCount}, Cantidad nueva: ${occurrenceMap[key].count}`);
        } else {
          // First time seeing these coordinates
          occurrenceMap[key] = {
            latitude: lat, // Store original value
            longitude: lon, // Store original value
            count: 1, // Start with 1 occurrence
            occurrences: [1], // Track first occurrence
          };
          processedRows++;
          if (processedRows <= 5 || processedRows % 100 === 0) {
            console.log(`[NUEVO PUNTO ${processedRows}] Clave: ${key}, Cantidad inicial: 1`);
          }
        }
      }
      
      console.log(`Resumen de procesamiento de filas: ${processedRows} procesadas, ${skippedRows} omitidas`);
      if (skippedRows > 0) {
        console.log(`⚠️ ${skippedRows} filas fueron omitidas (coordenadas inválidas o fuera de Colombia)`);
      }
      console.log(`Total de coordenadas únicas encontradas (solo Colombia): ${Object.keys(occurrenceMap).length}`);
      
      // Check for points with count > 1 BEFORE converting
      const pointsWithCountGreaterThanOne = Object.entries(occurrenceMap).filter(([key, item]) => item.count > 1);
      console.log(`=== PUNTOS CON MÚLTIPLES APARICIONES: ${pointsWithCountGreaterThanOne.length} ===`);
      if (pointsWithCountGreaterThanOne.length > 0) {
        console.log("Primeros 10 puntos con cantidad > 1:");
        pointsWithCountGreaterThanOne.slice(0, 10).forEach(([key, item]) => {
          console.log(`  - ${key}: cantidad=${item.count}`);
        });
      } else {
        console.warn("⚠️ NO SE ENCONTRARON PUNTOS DUPLICADOS - Todas las coordenadas son únicas");
        console.log("Muestra de primeras 10 coordenadas procesadas:");
        Object.entries(occurrenceMap).slice(0, 10).forEach(([key, item]) => {
          console.log(`  - ${key}: cantidad=${item.count}`);
        });
      }
      
      // STEP 2: Convert occurrence map to consolidated points with quantities
      const uniquePoints: PointData[] = Object.values(occurrenceMap).map((item) => ({
        latitude: item.latitude,
        longitude: item.longitude,
        quantity: item.count, // Quantity = number of times this coordinate appeared
      }));
      
      // Verify quantities are being set correctly
      const pointsWithQtyGreaterThanOne = uniquePoints.filter(p => p.quantity > 1);
      console.log(`Puntos únicos con quantity > 1: ${pointsWithQtyGreaterThanOne.length}`);
      if (pointsWithQtyGreaterThanOne.length > 0) {
        console.log("Ejemplos de puntos con quantity > 1:", pointsWithQtyGreaterThanOne.slice(0, 5).map(p => ({
          lat: p.latitude,
          lon: p.longitude,
          quantity: p.quantity
        })));
      }
      
      // Log detailed consolidation info
      console.log("=== CONSOLIDACIÓN DE PUNTOS ===");
      const consolidatedPointsList: Array<{key: string, item: any}> = [];
      Object.entries(occurrenceMap).forEach(([key, item]) => {
        if (item.count > 1) {
          consolidatedPointsList.push({key, item});
          console.log(`✓ Coordenadas ${key}:`);
          console.log(`  - Lat: ${item.latitude}, Lon: ${item.longitude}`);
          console.log(`  - Apariciones: ${item.count}`);
          console.log(`  - Cantidad consolidada: ${item.count}`);
        }
      });
      
      if (consolidatedPointsList.length === 0) {
        console.warn("⚠️ ADVERTENCIA: No se encontraron puntos duplicados. Verificando todas las coordenadas...");
        console.log("Todas las coordenadas procesadas:", Object.entries(occurrenceMap).map(([key, item]) => ({
          key,
          lat: item.latitude,
          lon: item.longitude,
          count: item.count
        })));
      }
      
      console.log("=== RESUMEN FINAL ===");
      console.log(`Total filas en Excel: ${jsonData.length}`);
      console.log(`Puntos únicos después de consolidar: ${uniquePoints.length}`);
      console.log(`Puntos consolidados (con cantidad > 1): ${uniquePoints.filter(p => p.quantity > 1).length}`);
      console.log(`Detalle de TODAS las cantidades:`, uniquePoints.map(p => ({
        coords: `${p.latitude}, ${p.longitude}`,
        quantity: p.quantity
      })));
      
      // Show sample of first few points to verify
      console.log("=== MUESTRA DE PRIMEROS PUNTOS ===");
      uniquePoints.slice(0, 10).forEach((p, idx) => {
        console.log(`Punto ${idx + 1}: Lat=${p.latitude}, Lon=${p.longitude}, Cantidad=${p.quantity}`);
      });
      
      if (uniquePoints.length === 0) {
        toast({
          title: "Error",
          description: "No se encontraron coordenadas válidas en el archivo",
          variant: "destructive",
        });
        return;
      }

      // STEP 3: Convert consolidated points to insert format
      const pointsToInsert = uniquePoints.map((point, index) => {
        // Quantity is the number of times this coordinate appeared (already consolidated)
        const quantity = Math.max(1, Math.floor(point.quantity || 1));
        
        // Keep original coordinates without rounding
        const lat = point.latitude;
        const lon = point.longitude;
        
        return {
          name: `Punto ${index + 1}`,
          address: `${lat}, ${lon}`,
          latitude: lat,
          longitude: lon,
          quantity: quantity, // This is the consolidated count
        };
      });

      // Calculate consolidation stats
      const totalRows = jsonData.length;
      const uniquePointsCount = uniquePoints.length;
      const consolidatedCount = totalRows - uniquePointsCount;
      const pointsWithMultipleOccurrences = uniquePoints.filter(p => p.quantity > 1).length;
      
      // Show detailed summary in console
      console.log("=== PUNTOS A INSERTAR ===");
      pointsToInsert.forEach((p, idx) => {
        if (p.quantity > 1) {
          console.log(`Punto ${idx + 1}: ${p.latitude}, ${p.longitude} - Cantidad: ${p.quantity} (consolidado)`);
        }
      });
      
      console.log("=== ESTADÍSTICAS FINALES ===");
      console.log(`Total filas procesadas: ${processedRows}`);
      console.log(`Puntos únicos: ${uniquePointsCount}`);
      console.log(`Puntos con múltiples apariciones: ${pointsWithMultipleOccurrences}`);
      console.log(`Total consolidaciones: ${consolidatedCount}`);

      // Batch insert ALL points at once
      if (pointsToInsert.length === 0) {
        toast({
          title: "Error",
          description: "No se encontraron puntos válidos para insertar",
          variant: "destructive",
        });
        return;
      }

      // Prepare all data for batch insert
      // ALWAYS include quantity - it's the consolidated count from occurrences
      const allDataToInsert = pointsToInsert.map((pointData) => {
        // Keep original coordinates without modification
        const lat = pointData.latitude;
        const lon = pointData.longitude;
        
        // Validate final values are within range
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
          console.error(`Invalid coordinates: lat=${lat}, lon=${lon}`);
          throw new Error(`Coordenadas inválidas: latitud ${lat}, longitud ${lon}`);
        }
        
        // Quantity is the consolidated count (number of times this coordinate appeared)
          const quantity = Math.max(1, Math.floor(pointData.quantity || 1));
        
        const baseData: any = {
            name: pointData.name,
            address: pointData.address,
          latitude: lat,
          longitude: lon,
          quantity: quantity, // ALWAYS include quantity - it's the consolidated count
        };
        
        if (quantity > 1) {
          console.log(`🔵 PUNTO CON CANTIDAD > 1: ${pointData.name} - Lat: ${lat}, Lon: ${lon}, Cantidad: ${quantity}`);
        }
        
        return baseData;
      });

      // Log what we're about to insert
      console.log("=== ANTES DE INSERTAR ===");
      console.log(`Total puntos a insertar: ${allDataToInsert.length}`);
      const pointsWithQty = allDataToInsert.filter(p => p.quantity > 1);
      console.log(`Puntos con cantidad > 1: ${pointsWithQty.length}`);
      if (pointsWithQty.length > 0) {
        console.log("Ejemplos de puntos con cantidad > 1:", pointsWithQty.slice(0, 5).map(p => ({
          name: p.name,
          lat: p.latitude,
          lon: p.longitude,
          quantity: p.quantity
        })));
      } else {
        console.warn("⚠️ ADVERTENCIA: No hay puntos con cantidad > 1 para insertar");
      }
      
      // Save to localStorage (works without Supabase)
      const pointsWithIds = allDataToInsert.map((point, index) => ({
        ...point,
        id: `local-${Date.now()}-${index}`, // Generate unique ID
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      
      // Save to localStorage
      localStorage.setItem('pickup_points', JSON.stringify(pointsWithIds));
      console.log("=== PUNTOS GUARDADOS EN LOCALSTORAGE ===");
      console.log(`Total puntos guardados: ${pointsWithIds.length}`);
      const pointsWithQtySaved = pointsWithIds.filter(p => p.quantity > 1);
      console.log(`Puntos con cantidad > 1: ${pointsWithQtySaved.length}`);
      
      if (pointsWithQtySaved.length > 0) {
        console.log("✅ Puntos guardados con cantidad > 1:", pointsWithQtySaved.slice(0, 5).map(p => ({
          name: p.name,
          quantity: p.quantity
        })));
      }
      
      // Try Supabase if available (optional)
      let insertedData: any[] | null = null;
      let insertError: any = null;
      
      try {
        const firstAttempt = await supabase
          .from("pickup_points")
          .insert(allDataToInsert)
          .select();
        
        insertedData = firstAttempt.data;
        insertError = firstAttempt.error;
        
        if (insertedData) {
          console.log("=== TAMBIÉN GUARDADO EN SUPABASE ===");
          console.log(`Total insertados en Supabase: ${insertedData.length}`);
        }
      } catch (error) {
        console.warn("Supabase no disponible, usando solo localStorage:", error);
      }

      // If error about quantity column in Supabase, that's OK - we have it in localStorage
      if (insertError && (insertError.code === "PGRST204" || insertError.message?.includes("quantity"))) {
        console.warn("⚠️ Supabase no tiene columna 'quantity', pero los datos están guardados en localStorage con cantidad");
      } else if (insertError) {
        console.warn("Error en Supabase (pero datos guardados en localStorage):", insertError);
      }

      const insertedCount = pointsWithIds.length;

      // Verify what was actually saved to localStorage
      console.log("=== VERIFICACIÓN FINAL DE INSERCIÓN ===");
      const sampleInserted = pointsWithIds.slice(0, 10);
      console.log("Muestra de puntos guardados (primeros 10):", sampleInserted.map((p: any) => ({
        id: p.id,
        name: p.name,
        lat: p.latitude,
        lon: p.longitude,
        quantity: p.quantity,
        quantityType: typeof p.quantity,
        hasQuantity: 'quantity' in p
      })));
      
      // Check specifically for the point the user mentioned
      const userPoint = pointsWithIds.find((p: any) => 
        String(p.latitude) === '4.723551' && String(p.longitude) === '-74.092143'
      );
      if (userPoint) {
        console.log("🔍 PUNTO ESPECÍFICO DEL USUARIO ENCONTRADO:", {
          id: userPoint.id,
          name: userPoint.name,
          lat: userPoint.latitude,
          lon: userPoint.longitude,
          quantity: userPoint.quantity,
          quantityType: typeof userPoint.quantity
        });
      } else {
        console.warn("⚠️ PUNTO ESPECÍFICO DEL USUARIO NO ENCONTRADO EN INSERTADOS");
      }

      // Reload pickup points to get updated list (from localStorage)
      await loadPickupPoints();
      
      // Verify points were saved correctly
      const savedPoints = JSON.parse(localStorage.getItem('pickup_points') || '[]');
      const savedWithQty = savedPoints.filter((p: any) => p.quantity > 1);
      console.log(`✅ Puntos guardados en localStorage: ${savedPoints.length}, con cantidad > 1: ${savedWithQty.length}`);

      // Show success message with detailed consolidation info
      const consolidationDetails = [];
      if (pointsWithMultipleOccurrences > 0) {
        consolidationDetails.push(`${pointsWithMultipleOccurrences} puntos con cantidad > 1`);
      }
      if (consolidatedCount > 0) {
        consolidationDetails.push(`${consolidatedCount} duplicados consolidados`);
      }
      
      const consolidationMessage = consolidationDetails.length > 0
        ? ` (${totalRows} filas → ${insertedCount} puntos únicos. ${consolidationDetails.join(", ")})`
        : ` (${totalRows} filas procesadas)`;
      
        toast({
          title: "Archivo cargado exitosamente",
        description: `Se agregaron ${insertedCount} puntos de recogida${consolidationMessage}`,
      });
      
      // Log final summary
      console.log("=== INSERCIÓN COMPLETADA ===");
      console.log(`Puntos insertados: ${insertedCount}`);
      const pointsWithQuantity = pointsToInsert.filter(p => p.quantity > 1);
      if (pointsWithQuantity.length > 0) {
        console.log(`Puntos con cantidad consolidada (quantity > 1):`, pointsWithQuantity.map(p => ({
          coords: `${p.latitude}, ${p.longitude}`,
          quantity: p.quantity
        })));
      } else {
        console.log("No se encontraron puntos con cantidad > 1 (todos los puntos aparecieron solo una vez)");
      }
    } catch (error) {
      console.error("Error processing Excel file:", error);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      
      if (errorMessage.includes("xlsx") || errorMessage.includes("Cannot find module")) {
        toast({
          title: "Error",
          description: "La librería xlsx no está instalada. Por favor ejecuta: npm install xlsx",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: `No se pudo procesar el archivo Excel: ${errorMessage}`,
          variant: "destructive",
        });
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check if it's an Excel file
      const validExtensions = [".xlsx", ".xls", ".xlsm"];
      const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
      
      if (!validExtensions.includes(fileExtension)) {
        toast({
          title: "Error",
          description: "Por favor selecciona un archivo Excel (.xlsx, .xls, .xlsm)",
          variant: "destructive",
        });
        return;
      }
      
      handleExcelUpload(file);
      // Reset input
      e.target.value = "";
    }
  };

  const handleMapClick = async (lng: number, lat: number) => {
    // Handle vehicle location selection
    if (vehicleLocationMode && vehicleLocationCallback) {
      vehicleLocationCallback(lng, lat);
      setVehicleLocationMode(null);
      setVehicleLocationCallback(null);
      return;
    }

    // Handle pickup point addition
    if (!clickMode) return;

    try {
      // Generate a temporary name based on coordinates
      const pointName = `Point ${pickupPoints.length + 1}`;
      const address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

      await handleAddPickupPoint({
        name: pointName,
        address: address,
        latitude: lat,
        longitude: lng,
        quantity: 1,
      });

      toast({
        title: "Point added",
        description: `Added pickup point at ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      });
    } catch (error) {
      console.error("Error adding point from map click:", error);
      // Error toast is already shown in handleAddPickupPoint
    }
  };

  const handleVehicleLocationMapClick = (mode: "start" | "end" | "start-selected" | "end-selected" | null, callback: (lon: number, lat: number) => void) => {
    // Ignore selected modes - they're just notifications
    if (mode === "start-selected" || mode === "end-selected") {
      return;
    }
    
    setVehicleLocationMode(mode);
    setVehicleLocationCallback(() => callback);
    if (mode) {
      toast({
        title: "Modo de selección activado",
        description: `Haz clic en el mapa para seleccionar la ubicación ${mode === "start" ? "de inicio" : "de fin"}`,
      });
    } else {
      setVehicleLocationMode(null);
      setVehicleLocationCallback(null);
    }
  };

  const handleVehicleLocationUpdate = (type: "start" | "end", location: { lon: number; lat: number } | null) => {
    if (type === "start") {
      setCurrentVehicleStartLocation(location);
    } else {
      setCurrentVehicleEndLocation(location);
    }
  };

  const handleRemovePickupPoint = async (pointId: string) => {
    try {
      // Remove from localStorage
      const updatedPoints = pickupPoints.filter((p) => p.id !== pointId);
      setPickupPoints(updatedPoints);
      savePointsToLocalStorage(updatedPoints);
      
      // Try Supabase if available (optional)
      try {
        await supabase
      .from("pickup_points")
      .delete()
      .eq("id", pointId);
      } catch (error) {
        console.warn("Supabase delete failed (using localStorage):", error);
      }

      toast({
        title: "Point removed",
        description: "El punto de recogida ha sido eliminado exitosamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el punto de recogida",
        variant: "destructive",
      });
    }
  };

  const handleAddVehicle = async (vehicle: Vehicle) => {
    const { data, error } = await supabase
      .from("vehicles")
      .insert([vehicle])
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo agregar el vehículo",
        variant: "destructive",
      });
      return;
    }

    setVehicles([...vehicles, data]);
    setIsVehicleDialogOpen(false);
    
    // Update markers if vehicle has locations
    if (vehicle.start_location) {
      setCurrentVehicleStartLocation(vehicle.start_location);
    }
    if (vehicle.end_location) {
      setCurrentVehicleEndLocation(vehicle.end_location);
    }
  };

  const handleUpdateVehicle = async (vehicleId: string, vehicle: Vehicle) => {
    const { error } = await supabase
      .from("vehicles")
      .update(vehicle)
      .eq("id", vehicleId);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el vehículo",
        variant: "destructive",
      });
      return;
    }

    const { data } = await supabase
      .from("vehicles")
      .select("*")
      .eq("id", vehicleId)
      .single();

    if (data) {
      setVehicles(vehicles.map((v) => (v.id === vehicleId ? data : v)));
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    const { error } = await supabase
      .from("vehicles")
      .delete()
      .eq("id", vehicleId);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el vehículo",
        variant: "destructive",
      });
      return;
    }

    setVehicles(vehicles.filter((v) => v.id !== vehicleId));
    toast({
      title: "Vehículo eliminado",
      description: "El vehículo ha sido eliminado exitosamente",
    });
  };

  const handleOptimizeRoutes = async () => {
    if (pickupPoints.length < 2) {
      toast({
        title: "Error",
        description: "Necesitas al menos 2 puntos de recogida",
        variant: "destructive",
      });
      return;
    }

    if (vehicles.length === 0) {
      toast({
        title: "Error",
        description: "Necesitas configurar al menos 1 vehículo",
        variant: "destructive",
      });
      return;
    }

    setIsOptimizing(true);
    setIsNewRunMode(true);
    setSelectedRunId(null);
    setSelectedRunData(null);
    try {
      // Build the JSON payload that will be sent to Nextmv
      // Ensure all numeric values are explicitly numbers
      const nextmvRequest = {
        defaults: {
          vehicles: {
            speed: Number(10), // Speed in m/s (10 m/s = 36 km/h)
            capacity: Number(20),
            start_time: "2025-01-01T08:00:00Z",
            end_time: "2025-01-01T18:00:00Z"
          }
        },
        stops: pickupPoints.map((point, index) => {
          // Ensure coordinates are numbers, not strings
          const lon = Number(parseFloat(String(point.longitude)));
          const lat = Number(parseFloat(String(point.latitude)));
          
          if (isNaN(lon) || isNaN(lat) || !isFinite(lon) || !isFinite(lat)) {
            throw new Error(`Invalid coordinates for point ${point.name || point.id}: longitude=${point.longitude}, latitude=${point.latitude}`);
          }
          
          // Convert positive quantity from frontend to negative for Nextmv API
          const frontendQuantity = point.quantity !== undefined ? point.quantity : 1;
          const nextmvQuantity = -Math.abs(Number(frontendQuantity)); // Always negative for Nextmv
          
          return {
            id: String(point.id || `stop-${index}`),
            location: {
              lon: Number(lon),
              lat: Number(lat)
            },
            quantity: nextmvQuantity // Negative value for Nextmv API
          };
        }),
        vehicles: vehicles.map((vehicle, index) => {
          // Get start location from vehicle config, first pickup point, or default
          let startLocation: { lon: number; lat: number };
          if (vehicle.start_location) {
            startLocation = vehicle.start_location;
          } else if (pickupPoints[0] && pickupPoints[0].longitude && pickupPoints[0].latitude) {
            startLocation = {
              lon: Number(parseFloat(String(pickupPoints[0].longitude))),
              lat: Number(parseFloat(String(pickupPoints[0].latitude)))
            };
          } else {
            throw new Error("No valid start location available for vehicles");
          }
          
          // Get end location from vehicle config or null
          let endLocation: { lon: number; lat: number } | undefined;
          if (vehicle.end_location) {
            endLocation = vehicle.end_location;
          }
          
          // Ensure capacity and max_distance are proper numbers
          // max_distance is stored in km in the UI, convert to meters for Nextmv API
          const capacity = Number(parseInt(String(vehicle.capacity), 10)) || 100;
          const maxDistanceKm = Number(parseFloat(String(vehicle.max_distance))) || 100;
          const maxDistance = maxDistanceKm * 1000; // Convert km to meters
          
          if (isNaN(capacity) || capacity <= 0 || !Number.isInteger(capacity)) {
            throw new Error(`Invalid capacity for vehicle ${vehicle.name || vehicle.id}: ${vehicle.capacity}`);
          }
          
          if (isNaN(maxDistance) || maxDistance <= 0 || !isFinite(maxDistance)) {
            throw new Error(`Invalid max_distance for vehicle ${vehicle.name || vehicle.id}: ${vehicle.max_distance}`);
          }
          
          const vehiclePayload: any = {
            id: String(vehicle.id || `vehicle-${index}`),
            start_location: {
              lon: Number(startLocation.lon),
              lat: Number(startLocation.lat)
            },
            capacity: Number(capacity), // Capacity should be an integer
            max_distance: Number(maxDistance),
            speed: Number(10) // Speed in m/s (10 m/s = 36 km/h)
          };
          
          // Add end location if specified
          if (endLocation) {
            vehiclePayload.end_location = {
              lon: Number(endLocation.lon),
              lat: Number(endLocation.lat)
            };
          }
          
          return vehiclePayload;
        })
      };

      // Note: application_id is in the URL path, not in the payload
      const nextmvPayload = {
        input: nextmvRequest,
        options: {
          "solve.duration": "10s"
        }
      };

      // Deep validation: Ensure all numeric values are actually numbers (not strings)
      // This is critical for Nextmv API which is strict about types
      const validateAndFixTypes = (obj: any): any => {
        if (obj === null || obj === undefined) return obj;
        if (Array.isArray(obj)) {
          return obj.map(validateAndFixTypes).filter(v => v !== undefined && v !== null);
        }
        if (typeof obj === 'object') {
          const result: any = {};
          for (const [key, value] of Object.entries(obj)) {
            // Skip undefined values
            if (value === undefined) continue;
            
            // Check if this should be a number based on common numeric field names
            if (['lon', 'lat', 'speed', 'max_distance', 'duration'].includes(key)) {
              const numValue = typeof value === 'string' ? Number(value) : (typeof value === 'number' ? value : Number(value));
              if (!isNaN(numValue) && isFinite(numValue)) {
                result[key] = numValue;
              }
            } else if (key === 'quantity') {
              // Quantity should be an integer, preserve negative values (for Nextmv API)
              if (Array.isArray(value)) {
                // If it's an array, take the first value
                const firstValue = value[0];
                const numValue = typeof firstValue === 'string' ? parseInt(firstValue, 10) : (typeof firstValue === 'number' ? firstValue : parseInt(String(firstValue), 10));
                // Preserve the sign of the value (should be negative for Nextmv)
                result[key] = !isNaN(numValue) && isFinite(numValue) && Number.isInteger(numValue) ? Number(numValue) : -1;
              } else {
                const numValue = typeof value === 'string' ? parseInt(value, 10) : (typeof value === 'number' ? value : parseInt(String(value), 10));
                // Preserve the sign of the value (should be negative for Nextmv)
                result[key] = !isNaN(numValue) && isFinite(numValue) && Number.isInteger(numValue) ? Number(numValue) : -1;
              }
            } else if (key === 'capacity') {
              // Capacity should be an integer
              if (Array.isArray(value)) {
                // If it's an array, take the first value
                const firstValue = value[0];
                const numValue = typeof firstValue === 'string' ? parseInt(firstValue, 10) : (typeof firstValue === 'number' ? firstValue : parseInt(String(firstValue), 10));
                result[key] = !isNaN(numValue) && isFinite(numValue) && Number.isInteger(numValue) ? Number(numValue) : 20;
              } else {
                const numValue = typeof value === 'string' ? parseInt(value, 10) : (typeof value === 'number' ? value : parseInt(String(value), 10));
                result[key] = !isNaN(numValue) && isFinite(numValue) && Number.isInteger(numValue) ? Number(numValue) : 20;
              }
            } else if (key === 'start_location' || key === 'location') {
              result[key] = validateAndFixTypes(value);
            } else {
              result[key] = validateAndFixTypes(value);
            }
          }
          return result;
        }
        return obj;
      };

      // Apply type validation and fixing
      const validatedPayload = validateAndFixTypes(nextmvPayload);

      // Validate the payload structure
      console.log("Nextmv payload structure (before validation):", JSON.stringify(nextmvPayload, null, 2));
      console.log("Nextmv payload structure (after validation):", JSON.stringify(validatedPayload, null, 2));
      console.log("Payload validation:", {
        hasInput: !!validatedPayload.input,
        hasStops: !!validatedPayload.input.stops,
        stopsCount: validatedPayload.input.stops?.length,
        hasVehicles: !!validatedPayload.input.vehicles,
        vehiclesCount: validatedPayload.input.vehicles?.length,
        hasDefaults: !!validatedPayload.input.defaults,
      });

      // Final validation: Ensure JSON is valid and doesn't contain undefined/null values
      const cleanPayload = JSON.parse(JSON.stringify(validatedPayload, (key, value) => {
        // Remove undefined values
        if (value === undefined) return undefined;
        // Keep null values as they might be intentional
        return value;
      }));

      // Verify the cleaned payload
      console.log("Cleaned payload (no undefined values):", JSON.stringify(cleanPayload, null, 2));

      // Store the JSON and endpoint to display (use cleaned version)
      setNextmvJson(cleanPayload);
      const nextmvPath = "/v1/applications/workspace-dgxjzzgctd/runs";
      const nextmvEndpoint = "/api/nextmv" + nextmvPath; // Use proxy in development
      const nextmvFullUrl = "https://api.cloud.nextmv.io" + nextmvPath; // Full URL for display
      setNextmvEndpoint(nextmvFullUrl);
      
      console.log("Calling Nextmv API:", {
        endpoint: nextmvEndpoint,
        fullUrl: nextmvFullUrl,
        pickupPointsCount: pickupPoints.length,
        vehiclesCount: vehicles.length,
      });
      
      // Get Nextmv API key from environment or use fallback
      const NEXTMV_API_KEY = import.meta.env.VITE_NEXTMV_API_KEY || "nxmvv1_lhcoj3zDR:f5d1c365105ef511b4c47d67c6c13a729c2faecd36231d37dcdd2fcfffd03a6813235230";
      
      if (!NEXTMV_API_KEY) {
        throw new Error("VITE_NEXTMV_API_KEY no está configurado. Por favor, configura tu API key de Nextmv.");
      }
      
      // Call Nextmv API through proxy (to avoid CORS issues)
      let response: Response;
      let responseData: any;
      
      try {
        // Add timeout to prevent hanging (30 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, 30000);
        
        try {
          // Use proxy endpoint in development, direct URL in production (if CORS allows)
          const apiUrl = import.meta.env.DEV ? nextmvEndpoint : nextmvFullUrl;
          
          // Convert to JSON string for the request
          const requestBodyString = JSON.stringify(cleanPayload);
          
          // Verify JSON is valid
          try {
            JSON.parse(requestBodyString);
          } catch (e) {
            throw new Error(`Invalid JSON payload: ${e}`);
          }
          
          console.log("Sending JSON request to Nextmv:", {
            url: apiUrl,
            method: "POST",
            contentType: "application/json",
            bodyLength: requestBodyString.length,
            bodyPreview: requestBodyString.substring(0, 500),
            fullBody: requestBodyString
          });
          
          response = await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${NEXTMV_API_KEY}`,
              "Content-Type": "application/json",
              "Accept": "application/json",
            },
            body: requestBodyString,
            signal: controller.signal
          });
        } finally {
          clearTimeout(timeoutId);
        }
        
        // Try to parse response body regardless of status
        const responseText = await response.text();
        try {
          responseData = JSON.parse(responseText);
        } catch (parseError) {
          // If parsing fails, use the raw text
          responseData = { raw: responseText };
        }
        
        console.log("Nextmv API response:", {
          status: response.status,
          statusText: response.statusText,
          data: responseData,
          ok: response.ok
        });
        
        // If response is not ok, treat it as an error
        if (!response.ok) {
          // Special handling for 400 Bad Request - show detailed error information
          if (response.status === 400) {
            let errorMessage = "Error de validación en la solicitud";
            let errorDetails: any = null;
            const errorParts: string[] = [];
            
            if (responseData) {
              // Extract error message from various possible formats
              if (typeof responseData === 'string') {
                errorMessage = responseData;
                errorParts.push(`Mensaje: ${responseData}`);
              } else if (responseData.error) {
                const errorObj = responseData.error;
                if (typeof errorObj === 'string') {
                  errorMessage = errorObj;
                  errorParts.push(`Error: ${errorObj}`);
                } else {
                  errorMessage = errorObj.message || errorObj.error || JSON.stringify(errorObj);
                  errorParts.push(`Error: ${errorMessage}`);
                  
                  // Add all error object properties
                  Object.keys(errorObj).forEach(key => {
                    if (key !== 'message' && key !== 'error') {
                      const value = errorObj[key];
                      if (value !== null && value !== undefined) {
                        errorParts.push(`${key}: ${typeof value === 'object' ? JSON.stringify(value, null, 2) : value}`);
                      }
                    }
                  });
                }
                errorDetails = errorObj;
              } else if (responseData.message) {
                errorMessage = responseData.message;
                errorParts.push(`Mensaje: ${responseData.message}`);
                errorDetails = responseData;
              } else if (responseData.status && responseData.error) {
                errorMessage = responseData.error;
                errorParts.push(`Error: ${responseData.error}`);
                errorDetails = responseData;
              } else {
                // If it's an object, extract all meaningful fields
                errorMessage = "Error en la solicitud";
                errorDetails = responseData;
                
                Object.keys(responseData).forEach(key => {
                  const value = responseData[key];
                  if (value !== null && value !== undefined && value !== '') {
                    if (typeof value === 'object' && !Array.isArray(value)) {
                      errorParts.push(`${key}:\n${JSON.stringify(value, null, 2)}`);
                    } else if (Array.isArray(value) && value.length > 0) {
                      errorParts.push(`${key}:\n${JSON.stringify(value, null, 2)}`);
                    } else {
                      errorParts.push(`${key}: ${value}`);
                    }
                  }
                });
              }
              
              // Add specific error details if available
              if (responseData.details) {
                const details = typeof responseData.details === 'string' 
                  ? responseData.details 
                  : JSON.stringify(responseData.details, null, 2);
                errorParts.push(`\nDetalles:\n${details}`);
              }
              
              if (responseData.validation_errors) {
                const validationErrors = typeof responseData.validation_errors === 'string'
                  ? responseData.validation_errors
                  : JSON.stringify(responseData.validation_errors, null, 2);
                errorParts.push(`\nErrores de validación:\n${validationErrors}`);
              }
              
              if (responseData.field_errors) {
                const fieldErrors = typeof responseData.field_errors === 'string'
                  ? responseData.field_errors
                  : JSON.stringify(responseData.field_errors, null, 2);
                errorParts.push(`\nErrores de campos:\n${fieldErrors}`);
              }
              
              // Log full error details for debugging
              console.error("Nextmv API returned 400 Bad Request (FULL DETAILS):", {
                status: response.status,
                statusText: response.statusText,
                errorMessage,
                fullResponse: responseData,
                errorDetails: errorDetails,
                responseHeaders: Object.fromEntries(response.headers.entries()),
                parsedErrorParts: errorParts
              });
              
              // Build a detailed, user-friendly error message
              const detailedErrorMessage = errorParts.length > 0 
                ? errorParts.join('\n\n')
                : `Error 400: ${errorMessage}\n\nRespuesta completa:\n${JSON.stringify(responseData, null, 2)}`;
              
              throw new Error(detailedErrorMessage);
            } else {
              // No response data, use status text
              throw new Error(`Error 400: ${response.statusText || 'Bad Request'}\n\nNo se recibieron detalles adicionales del servidor.`);
            }
          } else {
            // Handle other error status codes
            let errorMessage = "Error al llamar a la API de Nextmv";
            let errorDetails: any = null;
            
            // Try to extract detailed error information
            if (responseData?.error) {
              if (typeof responseData.error === 'string') {
                errorMessage = responseData.error;
              } else if (responseData.error.message) {
                errorMessage = responseData.error.message;
                errorDetails = responseData.error;
              } else {
                errorMessage = JSON.stringify(responseData.error);
                errorDetails = responseData.error;
              }
            } else if (responseData?.message) {
              errorMessage = typeof responseData.message === 'string' 
                ? responseData.message 
                : String(responseData.message);
              errorDetails = responseData;
            } else if (responseData?.raw) {
              errorMessage = responseData.raw;
            } else if (responseData) {
              // If we have any response data, show it
              errorMessage = JSON.stringify(responseData);
              errorDetails = responseData;
            } else if (response.statusText) {
              errorMessage = `${response.status} ${response.statusText}`;
            } else {
              errorMessage = `Error ${response.status}: La API de Nextmv retornó un código de error`;
            }
            
            // Log full error details for debugging
            console.error("Nextmv API returned error (FULL DETAILS):", {
              status: response.status,
              statusText: response.statusText,
              errorMessage,
              fullResponse: responseData,
              errorDetails: errorDetails,
              responseHeaders: Object.fromEntries(response.headers.entries())
            });
            
            // Build a detailed error message
            let detailedErrorMessage = `Error ${response.status}: ${errorMessage}`;
            
            if (errorDetails) {
              // Add specific error details if available
              if (errorDetails.details) {
                detailedErrorMessage += `\n\nDetalles: ${JSON.stringify(errorDetails.details, null, 2)}`;
              }
              if (errorDetails.validation_errors) {
                detailedErrorMessage += `\n\nErrores de validación: ${JSON.stringify(errorDetails.validation_errors, null, 2)}`;
              }
              if (errorDetails.field_errors) {
                detailedErrorMessage += `\n\nErrores de campos: ${JSON.stringify(errorDetails.field_errors, null, 2)}`;
              }
              // Show full error object if it has useful info
              if (Object.keys(errorDetails).length > 1) {
                detailedErrorMessage += `\n\nRespuesta completa: ${JSON.stringify(errorDetails, null, 2)}`;
              }
            }
            
            throw new Error(detailedErrorMessage);
          }
        }
        
        // Check if response data contains an error (even with 200 status)
        if (responseData && responseData.error) {
          console.error("Nextmv API returned error in data:", responseData.error);
          const errorMessage = typeof responseData.error === 'string' 
            ? responseData.error 
            : responseData.error.message || JSON.stringify(responseData.error);
          throw new Error(errorMessage);
        }
        
      } catch (fetchError: any) {
        // Handle abort/timeout
        if (fetchError.name === 'AbortError') {
          throw new Error("Timeout: La conexión con la API de Nextmv tardó demasiado. Intenta nuevamente.");
        }
        
        // If it's already an Error we threw, re-throw it
        if (fetchError instanceof Error) {
          throw fetchError;
        }
        
        // Otherwise, it's a network or other error
        console.error("Error calling Nextmv API:", fetchError);
        const errorMessage = fetchError?.message || String(fetchError);
        
        if (errorMessage.includes("dns error") || errorMessage.includes("failed to lookup")) {
          throw new Error("Error de red: No se puede conectar a la API de Nextmv. Verifica tu conexión a internet.");
        } else if (errorMessage.includes("CORS")) {
          throw new Error("Error CORS: La API de Nextmv no permite solicitudes desde el navegador. Contacta al soporte.");
        } else {
          throw new Error(`Error al conectar con Nextmv API: ${errorMessage}`);
        }
      }
      
      // Check if the response contains a run ID (async job pattern)
      let runId: string | null = null;
      if (responseData && responseData.id) {
        runId = responseData.id;
        console.log("Received run ID from Nextmv:", runId);
      } else if (responseData && responseData.run_id) {
        runId = responseData.run_id;
        console.log("Received run ID from Nextmv:", runId);
      }

      // If we have a run ID, fetch the run result
      let data: any = null;
      if (runId) {
        console.log("Fetching run result for ID:", runId);
        
        // Build the GET URL for the run
        const NEXTMV_APPLICATION_ID = "workspace-dgxjzzgctd";
        const runUrl = `https://api.cloud.nextmv.io/v1/applications/${NEXTMV_APPLICATION_ID}/runs/${runId}`;
        const runApiUrl = import.meta.env.DEV ? `/api/nextmv/v1/applications/${NEXTMV_APPLICATION_ID}/runs/${runId}` : runUrl;
        
        // Poll for the result every 10 seconds until solution is available
        const pollInterval = 10000; // Poll every 10 seconds
        const maxAttempts = 60; // Maximum 10 minutes (60 attempts * 10 seconds)
        let attempts = 0;
        let solutionAvailable = false;
        
        while (!solutionAvailable && attempts < maxAttempts) {
          attempts++;
          
          try {
            const runResponse = await fetch(runApiUrl, {
              method: "GET",
              headers: {
                "Authorization": `Bearer ${NEXTMV_API_KEY}`,
                "Content-Type": "application/json",
                "Accept": "application/json",
              },
            });
            
            if (!runResponse.ok) {
              const errorText = await runResponse.text();
              throw new Error(`Error fetching run: ${runResponse.status} ${runResponse.statusText} - ${errorText}`);
            }
            
            const runData = await runResponse.json();
            console.log(`Run status (attempt ${attempts}):`, runData);
            
            // Check metadata.status to determine if run is complete
            const status = runData.metadata?.status || runData.status;
            
            if (status === "succeeded") {
              data = runData;
              solutionAvailable = true;
              console.log("Run succeeded, proceeding to display routes");
            } else if (status === "failed" || status === "error") {
              throw new Error(`Run failed: ${runData.error || runData.message || runData.metadata?.error || "Unknown error"}`);
            } else {
              // Still processing, wait 10 seconds and try again
              console.log(`Run still processing (status: ${status || "unknown"}), waiting 10 seconds...`);
              await new Promise(resolve => setTimeout(resolve, pollInterval));
            }
          } catch (pollError: any) {
            if (attempts >= maxAttempts) {
              throw new Error(`Timeout waiting for solution: ${pollError.message || "Maximum polling attempts reached"}`);
            }
            // Wait 10 seconds before retrying
            console.log(`Error polling run, retrying in 10 seconds... (attempt ${attempts}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, pollInterval));
          }
        }
        
        if (!solutionAvailable) {
          throw new Error("Timeout: El proceso de optimización tardó demasiado. Intenta nuevamente.");
        }
      } else {
        // No run ID, assume direct response with solution
        data = responseData;
      }

      // Check if we got a valid solution
      // Solutions are in output.solutions, not directly in data.solutions
      const solutions = data.output?.solutions || data.solutions;
      if (!solutions || solutions.length === 0) {
        throw new Error("No se encontraron soluciones para las rutas");
      }

      // Save routes to Supabase database
      try {
        const solution = solutions[0];
        
        // Clear old routes before inserting new ones
        await supabase
          .from("routes")
          .delete()
          .gte("created_at", "1970-01-01");
        
        // Insert new routes
        const routeInserts = [];
        for (const vehicle of solution.vehicles || []) {
          // Find the original vehicle by matching the id
          const originalVehicle = vehicles.find((v) => v.id === vehicle.id || `vehicle-${vehicles.indexOf(v)}` === vehicle.id);
          
          // Extract route information from the vehicle object
          const routeData = {
            vehicle_id: originalVehicle?.id || null,
            route_data: vehicle,
            total_distance: vehicle.route_travel_distance || 0,
            total_duration: vehicle.route_travel_duration || vehicle.route_duration || 0
          };

          routeInserts.push(
            supabase.from("routes").insert(routeData)
          );
        }

        const insertResults = await Promise.all(routeInserts);
        const insertErrors = insertResults.filter((r: any) => r.error);
        if (insertErrors.length > 0) {
          console.error("Error inserting routes:", insertErrors);
        } else {
          console.log("Routes saved to database successfully");
        }
      } catch (dbError) {
        console.error("Error saving routes to database:", dbError);
        // Don't throw - we still want to show the results even if saving fails
      }

      toast({
        title: "Rutas optimizadas",
        description: "Las rutas han sido calculadas exitosamente",
      });

      // Reload routes from database
      const { data: routesData, error: routesError } = await supabase
        .from("routes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(vehicles.length || 10);

      if (routesError) {
        console.error("Error loading routes:", routesError);
      } else {
        const loadedRoutes = routesData || [];
        setRoutes(loadedRoutes);
        // Initialize all routes as visible
        setVisibleRoutes(new Set(loadedRoutes.map((_, index) => index)));
      }
      
      // Reload runs list to include the new run
      await loadRuns();
    } catch (error) {
      console.error("Error optimizing routes:", error);
      console.error("Error details:", {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      const errorMessage = error instanceof Error ? error.message : "No se pudieron optimizar las rutas";
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground p-4 shadow-md">
        <div className="container mx-auto flex items-center gap-2">
          <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain" />
        </div>
      </header>

      <main className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm opacity-90">Puntos de Recogida</p>
                  <p className="text-4xl font-bold">{pickupPoints.length}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                <MapPin className="w-12 h-12 opacity-80" />
                  {pickupPoints.length > 0 && (
                    <Button
                      onClick={handleDeleteAllPickupPoints}
                      variant="destructive"
                      size="sm"
                      className="bg-destructive/20 hover:bg-destructive/30 text-destructive-foreground border border-destructive/50"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Eliminar Todos
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-secondary text-secondary-foreground">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Vehículos</p>
                  <p className="text-4xl font-bold">{vehicles.length}</p>
                </div>
                <Truck className="w-12 h-12 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-accent text-accent-foreground">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Rutas Generadas</p>
                  <p className="text-4xl font-bold">{routes.length}</p>
                </div>
                <Route className="w-12 h-12 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Excel Upload Section - Prominent at the top */}
        <Card className="mb-6 border-2 border-dashed border-primary/50 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">Cargar Puntos desde Excel</h3>
                <p className="text-sm text-muted-foreground">
                  Sube un archivo Excel (.xlsx) con columnas de latitud y longitud. 
                  Los puntos con las mismas coordenadas se consolidarán sumando sus cantidades.
                </p>
              </div>
              <div className="ml-4 flex gap-2">
                {pickupPoints.length > 0 && (
                  <Button
                    onClick={handleDeleteAllPickupPoints}
                    variant="destructive"
                    size="lg"
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    <Trash2 className="w-5 h-5 mr-2" />
                    Eliminar Todos ({pickupPoints.length})
                  </Button>
                )}
                <Button
                  onClick={() => document.getElementById("excel-upload-main")?.click()}
                  size="lg"
                  className="bg-primary hover:bg-primary/90"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Subir Archivo Excel
                </Button>
                <input
                  id="excel-upload-main"
                  type="file"
                  accept=".xlsx,.xls,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Optimization Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Optimización de Rutas</span>
              <div className="flex gap-2">
                <Button
                  onClick={() => setIsPreviousRunsDialogOpen(true)}
                  variant="outline"
                  size="sm"
                  disabled={isLoadingRuns}
                >
                  <History className="w-4 h-4 mr-2" />
                  Ejecuciones Anteriores
                </Button>
                <Button
                  onClick={handleOptimizeRoutes}
                  disabled={isOptimizing || pickupPoints.length < 2 || vehicles.length === 0}
                  className="bg-primary hover:bg-primary/90"
                  size="sm"
                >
                  {isOptimizing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Optimizando...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Optimizar Rutas
                    </>
                  )}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(pickupPoints.length < 2 || vehicles.length === 0) && (
              <p className="text-sm text-muted-foreground text-center">
                {pickupPoints.length < 2 && "Necesitas al menos 2 puntos de recogida. "}
                {vehicles.length === 0 && "Necesitas configurar al menos 1 vehículo."}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Nextmv JSON Section */}
        {nextmvJson && (
          <Card className="mb-6">
            <CardHeader 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setShowNextmvJson(!showNextmvJson)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  JSON enviado a Nextmv
                </CardTitle>
                {showNextmvJson ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </div>
            </CardHeader>
            {showNextmvJson && (
              <CardContent className="space-y-4">
                {nextmvEndpoint && (
                  <div>
                    <p className="text-sm font-semibold mb-2">Endpoint:</p>
                    <div className="bg-muted p-3 rounded-lg">
                      <code className="text-sm text-primary font-mono break-all">
                        {nextmvEndpoint}
                      </code>
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold mb-2">Payload JSON:</p>
                  <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm max-h-96">
                    <code>{JSON.stringify(nextmvJson, null, 2)}</code>
                  </pre>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <Tabs defaultValue="pickup-points" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="pickup-points" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Pickup Points
                </TabsTrigger>
                <TabsTrigger value="vehicles" className="flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  Vehicles
                </TabsTrigger>
              </TabsList>
              <TabsContent value="pickup-points" className="space-y-6 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        Pickup Points
                      </span>
                      <div className="flex gap-2">
                        <label htmlFor="excel-upload" className="cursor-pointer">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="cursor-pointer"
                            onClick={() => document.getElementById("excel-upload")?.click()}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Subir Excel
                          </Button>
                          <input
                            id="excel-upload"
                            type="file"
                            accept=".xlsx,.xls,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                            onChange={handleFileInputChange}
                            className="hidden"
                          />
                        </label>
                        <Button
                          onClick={() => {
                            setEditingPickupPoint(null);
                            setIsPickupPointDialogOpen(true);
                          }}
                          size="sm"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Agregar Punto
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PickupPointsList 
                      points={pickupPoints} 
                      onRemove={handleRemovePickupPoint}
                      onPointClick={(point) => setFocusedPoint(point)}
                      onEdit={handleEditPickupPoint}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="vehicles" className="mt-0">
                <VehicleConfig 
                  onAdd={handleAddVehicle}
                  onUpdate={handleUpdateVehicle}
                  onDelete={handleDeleteVehicle} 
                  vehicles={vehicles}
                  onMapClickMode={handleVehicleLocationMapClick}
                  onLocationUpdate={handleVehicleLocationUpdate}
                  isDialogOpen={isVehicleDialogOpen}
                  setIsDialogOpen={setIsVehicleDialogOpen}
                />
              </TabsContent>
            </Tabs>
          </div>

          <div className="lg:col-span-2 relative">
            <Card className="h-[calc(100vh-240px)]">
              <CardContent className="p-0 h-full">
                <Map 
                  pickupPoints={pickupPoints} 
                  routes={routes} 
                  vehicles={vehicles}
                  visibleRoutes={visibleRoutes}
                  onRouteVisibilityChange={(routeIndex, visible) => {
                    setVisibleRoutes(prev => {
                      const newSet = new Set(prev);
                      if (visible) {
                        newSet.add(routeIndex);
                      } else {
                        newSet.delete(routeIndex);
                      }
                      return newSet;
                    });
                  }}
                  onMapClick={handleMapClick}
                  clickMode={clickMode || vehicleLocationMode !== null}
                  focusedPoint={focusedPoint}
                  vehicleLocationMode={vehicleLocationMode}
                  vehicleStartLocation={currentVehicleStartLocation}
                  vehicleEndLocation={currentVehicleEndLocation}
                />
              </CardContent>
            </Card>
            
            {/* Selected Optimization Info Overlay */}
            {selectedRunId && selectedRunData && (
              <Card className="absolute top-4 left-4 z-20 shadow-lg max-w-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <History className="w-4 h-4" />
                      Optimización Seleccionada
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        setSelectedRunId(null);
                        setSelectedRunData(null);
                        setRoutes([]);
                        setVisibleRoutes(new Set());
                        supabase
                          .from("routes")
                          .delete()
                          .gte("created_at", "1970-01-01");
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">ID de Ejecución</p>
                    <p className="font-mono text-xs">{selectedRunId}</p>
                  </div>
                  {(selectedRunData.metadata?.created_at || selectedRunData.created_at) && (
                    <div>
                      <p className="text-muted-foreground text-xs">Fecha</p>
                      <p className="text-xs">
                        {new Date(selectedRunData.metadata?.created_at || selectedRunData.created_at).toLocaleString('es-ES', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                    <div>
                      <p className="text-muted-foreground text-xs">Vehículos</p>
                      <p className="text-lg font-bold">
                        {selectedRunData.output?.solutions?.[0]?.vehicles?.length || 
                         selectedRunData.solutions?.[0]?.vehicles?.length || 
                         routes.length || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Rutas</p>
                      <p className="text-lg font-bold">{routes.length}</p>
                    </div>
                  </div>
                  {(selectedRunData.metadata?.status || selectedRunData.status) && (
                    <div className="pt-2 border-t">
                      <p className="text-muted-foreground text-xs">Estado</p>
                      <p className="text-xs">
                        {(() => {
                          const status = selectedRunData.metadata?.status || selectedRunData.status;
                          return status === "succeeded" ? "✓ Completado" :
                                 status === "failed" ? "✗ Fallido" :
                                 status === "error" ? "✗ Error" :
                                 status === "running" ? "⟳ Ejecutando" :
                                 status === "queued" ? "⏳ En cola" :
                                 status;
                        })()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            
            <Button
              onClick={() => setClickMode(!clickMode)}
              variant={clickMode ? "default" : "outline"}
              className="absolute top-4 right-4 z-20 shadow-lg"
              size="lg"
            >
              <MousePointerClick className="w-4 h-4 mr-2" />
              {clickMode ? "Exit Click Mode" : "Click to Add Points"}
            </Button>
          </div>
        </div>
      </main>

      {/* Pickup Point Form Dialog */}
      <Dialog open={isPickupPointDialogOpen} onOpenChange={setIsPickupPointDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPickupPoint ? "Editar Punto de Recogida" : "Agregar Punto de Recogida"}
            </DialogTitle>
          </DialogHeader>
          <PickupPointForm 
            onAdd={handleAddPickupPoint} 
            editingPoint={editingPickupPoint}
            onCancelEdit={handleCancelEditPickupPoint}
          />
        </DialogContent>
      </Dialog>

      {/* Previous Optimizations Dialog */}
      <Dialog open={isPreviousRunsDialogOpen} onOpenChange={setIsPreviousRunsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Ejecuciones Anteriores
              </span>
              <div className="flex gap-2">
                <Button
                  onClick={loadRuns}
                  variant="outline"
                  size="sm"
                  disabled={isLoadingRuns}
                >
                  {isLoadingRuns ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Actualizar"
                  )}
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {isLoadingRuns ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : runs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay ejecuciones disponibles
              </p>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {runs.map((run) => {
                  const runId = run.id || run.run_id;
                  const status = run.metadata?.status || run.status || "unknown";
                  const createdAt = run.metadata?.created_at || run.created_at || "";
                  const isSelected = selectedRunId === runId;
                  
                  // Format status for display
                  const statusDisplay = status === "succeeded" ? "✓ Completado" :
                                       status === "failed" ? "✗ Fallido" :
                                       status === "error" ? "✗ Error" :
                                       status === "running" ? "⟳ Ejecutando" :
                                       status === "queued" ? "⏳ En cola" :
                                       status;
                  
                  return (
                    <Card
                      key={runId}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => {
                        handleRunSelect(runId);
                        setIsPreviousRunsDialogOpen(false);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-sm">ID: {runId}</p>
                            <p className="text-xs opacity-80 mt-1">
                              {statusDisplay} | {createdAt ? new Date(createdAt).toLocaleString('es-ES', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : "Fecha desconocida"}
                            </p>
                          </div>
                          {isSelected && isOptimizing && (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          )}
                          {isSelected && !isOptimizing && (
                            <span className="text-xs">✓ Seleccionado</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
