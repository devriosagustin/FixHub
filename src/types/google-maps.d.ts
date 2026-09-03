/* eslint-disable */
// Tipos de Google Maps API para el componente de mapa

declare namespace google {
  namespace maps {
    class Map {
      constructor(el: HTMLElement, opts?: MapOptions);
    }

    class Marker {
      constructor(opts?: MarkerOptions);
      setMap(map: Map | null): void;
      addListener(eventName: string, handler: () => void): void;
    }

    class InfoWindow {
      constructor(opts?: InfoWindowOptions);
      open(map?: Map | null, marker?: Marker): void;
    }

    interface MapOptions {
      center?: LatLngLiteral;
      zoom?: number;
      styles?: MapStyle[];
    }

    interface MarkerOptions {
      position?: LatLngLiteral;
      map?: Map;
      title?: string;
      icon?: string | Icon;
    }

    interface InfoWindowOptions {
      content?: string;
    }

    interface LatLngLiteral {
      lat: number;
      lng: number;
    }

    interface Icon {
      url: string;
    }

    interface MapStyle {
      featureType?: string;
      stylers?: Array<{ visibility?: string }>;
    }
  }
}
