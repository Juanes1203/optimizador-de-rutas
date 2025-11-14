import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Trash2, Edit } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PickupPoint {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  quantity?: number;
}

interface PickupPointsListProps {
  points: PickupPoint[];
  onRemove: (pointId: string) => void;
  onPointClick?: (point: PickupPoint) => void;
  onEdit?: (point: PickupPoint) => void;
}

const PickupPointsList = ({ points, onRemove, onPointClick, onEdit }: PickupPointsListProps) => {
  if (points.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Pickup Points ({points.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No pickup points added yet. Click on the map to add points.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Pickup Points ({points.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {points.map((point) => (
            <div
              key={point.id}
              className="p-3 bg-muted rounded-lg flex items-start justify-between gap-2 hover:bg-muted/80 transition-colors cursor-pointer"
              onClick={() => onPointClick?.(point)}
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{point.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {point.address}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
                </p>
                {point.quantity !== undefined && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Cantidad: {point.quantity}
                  </p>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(point);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove pickup point?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to remove "{point.name}"? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onRemove(point.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PickupPointsList;

