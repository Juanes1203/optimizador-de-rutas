import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";

interface PickupPoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  quantity?: number;
}

interface MapProps {
  pickupPoints: PickupPoint[];
  routes: any[];
  onMapClick?: (lng: number, lat: number) => void;
  clickMode?: boolean;
  focusedPoint?: PickupPoint | null;
  vehicleLocationMode?: "start" | "end" | null;
  vehicleStartLocation?: { lon: number; lat: number } | null;
  vehicleEndLocation?: { lon: number; lat: number } | null;
}

const MAPBOX_TOKEN = "pk.eyJ1Ijoicm9kcmlnb2l2YW5mIiwiYSI6ImNtaHhoOHk4azAxNjcyanExb2E2dHl6OTMifQ.VO6hcKB-pIDvb8ZFFpLdfw";

const Map = ({ pickupPoints, routes, onMapClick, clickMode = false, focusedPoint, vehicleLocationMode, vehicleStartLocation, vehicleEndLocation }: MapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-99.1332, 19.4326], // Mexico City default
      zoom: 11,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.current.on("load", () => {
      setMapLoaded(true);
    });

    return () => {
      // Clean up markers
      markersRef.current.forEach((marker) => {
        marker.remove();
      });
      markersRef.current = [];
      map.current?.remove();
    };
  }, []);

  // Add click handler separately to handle clickMode changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const clickHandler = (e: mapboxgl.MapMouseEvent) => {
      // Only call onMapClick if clickMode is enabled or vehicle location mode is active
      if (onMapClick && (clickMode || vehicleLocationMode !== null)) {
        onMapClick(e.lngLat.lng, e.lngLat.lat);
      }
    };

    map.current.on("click", clickHandler);

    return () => {
      map.current?.off("click", clickHandler);
    };
  }, [onMapClick, clickMode, mapLoaded, vehicleLocationMode]);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove existing markers properly
    markersRef.current.forEach((marker) => {
      marker.remove();
    });
    markersRef.current = [];

    // Remove all existing route layers
    try {
      const style = map.current.getStyle();
      if (style && style.layers) {
        const layersToRemove: string[] = [];
        const sourcesToRemove: string[] = [];
        
        style.layers.forEach((layer) => {
          if (layer.id.startsWith("route-")) {
            layersToRemove.push(layer.id);
          }
        });
        
        layersToRemove.forEach((layerId) => {
          try {
            if (map.current!.getLayer(layerId)) {
              map.current!.removeLayer(layerId);
            }
          } catch (e) {
            // Layer might already be removed, ignore
          }
        });
        
        // Remove sources
        if (style.sources) {
          Object.keys(style.sources).forEach((sourceId) => {
            if (sourceId.startsWith("route-")) {
              sourcesToRemove.push(sourceId);
            }
          });
        }
        
        sourcesToRemove.forEach((sourceId) => {
          try {
            if (map.current!.getSource(sourceId)) {
              map.current!.removeSource(sourceId);
            }
          } catch (e) {
            // Source might already be removed, ignore
          }
        });
      }
    } catch (e) {
      // Style might not be loaded yet, continue anyway
      console.warn("Could not clean up layers:", e);
    }

    // Build a map of stop IDs to their order in routes (starting from 1, excluding start/end)
    // Use Object.create(null) to avoid Map constructor conflict with component name
    const stopOrderMap: Record<string, number> = {};
    if (routes.length > 0) {
      routes.forEach((route: any) => {
        const vehicleRoute = route.route_data?.route || [];
        let orderNumber = 1; // Start counting from 1 for actual stops
        
        vehicleRoute.forEach((routeStop: any) => {
          const stopId = routeStop.stop?.id;
          // Skip start/end location markers, only count actual pickup points
          if (stopId && !stopId.includes("-start") && !stopId.includes("-end")) {
            // Use the minimum order if stop appears in multiple routes
            if (!(stopId in stopOrderMap) || stopOrderMap[stopId] > orderNumber) {
              stopOrderMap[stopId] = orderNumber;
            }
            orderNumber++; // Increment for next stop
          }
        });
      });
    }

    // Add vehicle start location marker
    if (vehicleStartLocation) {
      const startEl = document.createElement("div");
      startEl.className = "w-12 h-12 bg-green-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs";
      startEl.textContent = "S";
      
      const startMarker = new mapboxgl.Marker(startEl)
        .setLngLat([vehicleStartLocation.lon, vehicleStartLocation.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div class="p-2">
              <h3 class="font-bold text-green-600">Ubicación de Inicio</h3>
              <p class="text-sm">${vehicleStartLocation.lat.toFixed(6)}, ${vehicleStartLocation.lon.toFixed(6)}</p>
            </div>`
          )
        )
        .addTo(map.current!);
      markersRef.current.push(startMarker);
    }

    // Add vehicle end location marker
    if (vehicleEndLocation) {
      const endEl = document.createElement("div");
      endEl.className = "w-12 h-12 bg-red-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs";
      endEl.textContent = "E";
      
      const endMarker = new mapboxgl.Marker(endEl)
        .setLngLat([vehicleEndLocation.lon, vehicleEndLocation.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div class="p-2">
              <h3 class="font-bold text-red-600">Ubicación de Fin</h3>
              <p class="text-sm">${vehicleEndLocation.lat.toFixed(6)}, ${vehicleEndLocation.lon.toFixed(6)}</p>
            </div>`
          )
        )
        .addTo(map.current!);
      markersRef.current.push(endMarker);
    }

    // Add pickup point markers with order numbers
    pickupPoints.forEach((point) => {
      const orderNumber = stopOrderMap[point.id];
      const el = document.createElement("div");
      el.className = "w-10 h-10 bg-primary rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white font-bold text-sm";
      
      if (orderNumber !== undefined) {
        el.textContent = String(orderNumber);
      } else {
        el.textContent = "📍";
      }

      const marker = new mapboxgl.Marker(el)
        .setLngLat([point.longitude, point.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div class="p-2">
              <h3 class="font-bold">${point.name}</h3>
              ${orderNumber !== undefined ? `<p class="text-sm font-semibold">Orden: ${orderNumber}</p>` : ''}
              <p class="text-sm">${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}</p>
              ${point.quantity !== undefined ? `<p class="text-sm">Cantidad: ${point.quantity}</p>` : ''}
            </div>`
          )
        )
        .addTo(map.current!);
      markersRef.current.push(marker);
    });

    // Draw routes
    // Routes structure: route_data.route[] where each item has stop.location.{lon, lat}
    if (routes.length > 0) {
      // Color palette for different vehicles
      const routeColors = [
        "#26bc30", // Green
        "#3b82f6", // Blue
        "#f59e0b", // Amber
        "#ef4444", // Red
        "#8b5cf6", // Purple
        "#ec4899", // Pink
        "#06b6d4", // Cyan
        "#84cc16", // Lime
      ];
      
      // Collect route coordinates per vehicle for separate lines
      const vehicleRoutes: number[][][] = [];
      
      routes.forEach((route: any) => {
        const vehicleRoute = route.route_data?.route || [];
        const coordinates: number[][] = [];
        
        vehicleRoute.forEach((routeStop: any) => {
          if (routeStop.stop?.location) {
            coordinates.push([
              routeStop.stop.location.lon,
              routeStop.stop.location.lat,
            ]);
          }
        });
        
        if (coordinates.length > 0) {
          vehicleRoutes.push(coordinates);
        }
      });

      // Draw route lines using Mapbox Directions API to get actual street routes
      // Use async function to handle API calls
      (async () => {
        await Promise.all(vehicleRoutes.map(async (coordinates, vehicleIndex) => {
        const sourceId = `route-${vehicleIndex}`;
        const layerId = `route-${vehicleIndex}`;
        const routeColor = routeColors[vehicleIndex % routeColors.length]; // Cycle through colors
        
        try {
          // Build waypoints for Directions API (format: lon,lat;lon,lat;...)
          const waypoints = coordinates.map(coord => `${coord[0]},${coord[1]}`).join(';');
          
          // Fetch route from Mapbox Directions API
          const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${waypoints}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;
          
          const response = await fetch(directionsUrl);
          const data = await response.json();
          
          if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
            // Get the route geometry (actual street path)
            const routeGeometry = data.routes[0].geometry;
            
            // Add or update route line with actual street geometry
            if (map.current!.getSource(sourceId)) {
              (map.current!.getSource(sourceId) as mapboxgl.GeoJSONSource).setData({
                type: "Feature",
                properties: {},
                geometry: routeGeometry,
              });
            } else {
              map.current!.addSource(sourceId, {
                type: "geojson",
                data: {
                  type: "Feature",
                  properties: {},
                  geometry: routeGeometry,
                },
              });

              map.current!.addLayer({
                id: layerId,
                type: "line",
                source: sourceId,
                layout: {
                  "line-join": "round",
                  "line-cap": "round",
                },
                paint: {
                  "line-color": routeColor,
                  "line-width": 4,
                },
              });
            }
          } else {
            // Fallback to straight line if Directions API fails
            console.warn(`Failed to get route for vehicle ${vehicleIndex}, using straight line`);
            if (map.current!.getSource(sourceId)) {
              (map.current!.getSource(sourceId) as mapboxgl.GeoJSONSource).setData({
                type: "Feature",
                properties: {},
                geometry: {
                  type: "LineString",
                  coordinates: coordinates,
                },
              });
            } else {
              map.current!.addSource(sourceId, {
                type: "geojson",
                data: {
                  type: "Feature",
                  properties: {},
                  geometry: {
                    type: "LineString",
                    coordinates: coordinates,
                  },
                },
              });

              map.current!.addLayer({
                id: layerId,
                type: "line",
                source: sourceId,
                layout: {
                  "line-join": "round",
                  "line-cap": "round",
                },
                paint: {
                  "line-color": routeColor,
                  "line-width": 4,
                },
              });
            }
          }
        } catch (error) {
          console.error(`Error fetching route for vehicle ${vehicleIndex}:`, error);
          // Fallback to straight line on error
          if (map.current!.getSource(sourceId)) {
            (map.current!.getSource(sourceId) as mapboxgl.GeoJSONSource).setData({
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: coordinates,
              },
            });
          } else {
            map.current!.addSource(sourceId, {
              type: "geojson",
              data: {
                type: "Feature",
                properties: {},
                geometry: {
                  type: "LineString",
                  coordinates: coordinates,
                },
              },
            });

            map.current!.addLayer({
              id: layerId,
              type: "line",
              source: sourceId,
              layout: {
                "line-join": "round",
                "line-cap": "round",
              },
              paint: {
                "line-color": routeColor,
                "line-width": 4,
              },
            });
          }
        }
        }));
      })();

    }

    // Fit map to show all points (only if no point is focused)
    if (pickupPoints.length > 0 && !focusedPoint) {
      const bounds = new mapboxgl.LngLatBounds();
      pickupPoints.forEach((point) => {
        bounds.extend([point.longitude, point.latitude]);
      });
      map.current!.fitBounds(bounds, { padding: 50 });
    }
  }, [pickupPoints, routes, mapLoaded, focusedPoint, vehicleStartLocation, vehicleEndLocation]);

  // Focus on specific point when focusedPoint changes
  useEffect(() => {
    if (!map.current || !mapLoaded || !focusedPoint) return;

    map.current.flyTo({
      center: [focusedPoint.longitude, focusedPoint.latitude],
      zoom: 15,
      duration: 1000,
    });
  }, [focusedPoint, mapLoaded]);

  // Update cursor when clickMode changes
  useEffect(() => {
    if (map.current && mapLoaded) {
      if (clickMode) {
        map.current.getCanvas().style.cursor = "crosshair";
      } else {
        map.current.getCanvas().style.cursor = "";
      }
    }
  }, [clickMode, mapLoaded]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full rounded-lg shadow-lg" />
      {clickMode && (
        <div className="absolute top-4 left-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg z-10">
          <p className="text-sm font-semibold">Click on the map to add a pickup point</p>
        </div>
      )}
    </div>
  );
};

export default Map;
