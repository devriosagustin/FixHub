"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, MapPin, Star, SlidersHorizontal, Map, List, X, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

interface Oficio {
  slug: string;
  nombre: string;
  icono: string;
}

interface ResultadoBusqueda {
  id: string;
  titulo: string;
  descripcion: string;
  ciudad: string;
  barrio: string;
  latitud: number | null;
  longitud: number | null;
  tipoPrecio: string;
  precioPorHora: number | null;
  verificado: boolean;
  destacado: boolean;
  usuario: { nombre: string; imagen: string | null };
  oficios: { oficio: { nombre: string; icono: string } }[];
  promedioEstrellas: number;
  totalResenas: number;
  plan: string;
  distancia: number | null;
}

function BusquedaContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [oficios, setOficios] = useState<Oficio[]>([]);
  const [resultados, setResultados] = useState<ResultadoBusqueda[]>([]);
  const [cargando, setCargando] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filtros
  const [direccion, setDireccion] = useState(searchParams.get("direccion") || "");
  const [latitud, setLatitud] = useState<number | null>(null);
  const [longitud, setLongitud] = useState<number | null>(null);
  const [oficioSeleccionado, setOficioSeleccionado] = useState(searchParams.get("oficio") || "");
  const [puntuacionMin, setPuntuacionMin] = useState(searchParams.get("puntuacion") || "");
  const [precioMin, setPrecioMin] = useState(searchParams.get("precioMin") || "");
  const [precioMax, setPrecioMax] = useState(searchParams.get("precioMax") || "");
  const [radio, setRadio] = useState(searchParams.get("radio") || "");
  const [orden, setOrden] = useState(searchParams.get("orden") || "relevancia");
  const [pagina, setPagina] = useState(parseInt(searchParams.get("page") || "1"));
  const [vista, setVista] = useState<"lista" | "mapa">("lista");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // Autocompletado
  const [sugerencias, setSugerencias] = useState<Array<{ description: string; place_id: string }>>([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cargar oficios
  useEffect(() => {
    fetch("/api/oficios")
      .then((res) => res.json())
      .then((data) => setOficios(data))
      .catch(() => {});
  }, []);

  // Autocompletado con Google Places
  const buscarSugerencias = async (query: string) => {
    if (query.length < 3) {
      setSugerencias([]);
      return;
    }
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&components=country:ar&language=es`
      );
      const data = await res.json();
      if (data.predictions) {
        setSugerencias(data.predictions);
        setMostrarSugerencias(true);
      }
    } catch {
      // Silently fail
    }
  };

  const seleccionarSugerencia = async (sugerencia: { description: string; place_id: string }) => {
    setDireccion(sugerencia.description);
    setMostrarSugerencias(false);

    // Obtener coordenadas del lugar
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${sugerencia.place_id}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&fields=geometry`
      );
      const data = await res.json();
      if (data.result?.geometry?.location) {
        setLatitud(data.result.geometry.location.lat);
        setLongitud(data.result.geometry.location.lng);
      }
    } catch {
      // Silently fail
    }
  };

  // Ejecutar búsqueda
  const ejecutarBusqueda = useCallback(async () => {
    setCargando(true);
    const params = new URLSearchParams();

    if (oficioSeleccionado) params.set("oficio", oficioSeleccionado);
    if (puntuacionMin) params.set("puntuacion", puntuacionMin);
    if (precioMin) params.set("precioMin", precioMin);
    if (precioMax) params.set("precioMax", precioMax);
    if (radio) params.set("radio", radio);
    if (orden) params.set("orden", orden);
    if (pagina) params.set("page", pagina.toString());
    if (latitud != null) params.set("lat", latitud.toString());
    if (longitud != null) params.set("lng", longitud.toString());
    if (direccion) params.set("ciudad", direccion.split(",")[0].trim());

    try {
      const res = await fetch(`/api/busqueda?${params}`);
      const data = await res.json();
      setResultados(data.resultados || []);
      setTotal(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch {
      setResultados([]);
    } finally {
      setCargando(false);
    }
  }, [oficioSeleccionado, puntuacionMin, precioMin, precioMax, radio, orden, pagina, latitud, longitud, direccion]);

  useEffect(() => {
    ejecutarBusqueda();
  }, [ejecutarBusqueda]);

  // Geolocalización automática al cargar
  useEffect(() => {
    if (!latitud && !longitud && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitud(pos.coords.latitude);
          setLongitud(pos.coords.longitude);
        },
        () => {
          // Usuario no permitió ubicación, buscar sin geolocalización
        }
      );
    }
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* =============================================
          BARRA DE BÚSQUEDA
          ============================================= */}
      <div className="mb-6 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row">
          {/* Dirección */}
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-light" />
            <input
              ref={inputRef}
              type="text"
              value={direccion}
              onChange={(e) => {
                setDireccion(e.target.value);
                buscarSugerencias(e.target.value);
              }}
              onFocus={() => sugerencias.length > 0 && setMostrarSugerencias(true)}
              onBlur={() => setTimeout(() => setMostrarSugerencias(false), 200)}
              placeholder="Tu dirección o ubicación"
              className="w-full rounded-lg border border-border bg-white py-2.5 pl-10 pr-4 text-sm text-text outline-none focus:border-orange focus:ring-2 focus:ring-orange/20"
            />

            {/* Dropdown de sugerencias */}
            {mostrarSugerencias && sugerencias.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-border bg-card shadow-lg">
                {sugerencias.map((s) => (
                  <button
                    key={s.place_id}
                    onMouseDown={() => seleccionarSugerencia(s)}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-text hover:bg-surface"
                  >
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-text-light" />
                    {s.description}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Oficio */}
          <select
            value={oficioSeleccionado}
            onChange={(e) => {
              setOficioSeleccionado(e.target.value);
              setPagina(1);
            }}
            className="rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-text outline-none focus:border-orange sm:w-48"
          >
            <option value="">Todos los oficios</option>
            {oficios.map((o) => (
              <option key={o.slug} value={o.slug}>
                {o.icono} {o.nombre}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setPagina(1);
              ejecutarBusqueda();
            }}
            className="rounded-lg bg-orange px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-dark"
          >
            <Search className="mr-1 inline h-4 w-4" />
            Buscar
          </button>
        </div>

        {/* Filtros avanzados */}
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="flex items-center gap-1 text-sm text-text-light hover:text-navy"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtros avanzados
          </button>

          <select
            value={orden}
            onChange={(e) => { setOrden(e.target.value); setPagina(1); }}
            className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs text-text outline-none"
          >
            <option value="relevancia">Relevancia</option>
            <option value="cercania">Más cercanos</option>
            <option value="puntuacion">Mejor puntuados</option>
            <option value="resenas">Más reseñas</option>
            <option value="recientes">Más recientes</option>
          </select>

          <div className="ml-auto flex gap-1">
            <button
              onClick={() => setVista("lista")}
              className={`rounded p-1.5 ${vista === "lista" ? "bg-navy text-white" : "text-text-light hover:bg-surface"}`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setVista("mapa")}
              className={`rounded p-1.5 ${vista === "mapa" ? "bg-navy text-white" : "text-text-light hover:bg-surface"}`}
            >
              <Map className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filtros expandidos */}
        {mostrarFiltros && (
          <div className="mt-4 border-t border-border pt-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-light">Puntuación mínima</label>
                <div className="flex gap-1">
                  {[0, 3, 4, 5].map((p) => (
                    <button
                      key={p}
                      onClick={() => { setPuntuacionMin(p === 0 ? "" : p.toString()); setPagina(1); }}
                      className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs ${
                        (p === 0 && !puntuacionMin) || puntuacionMin === p.toString()
                          ? "border-orange bg-orange/5 text-orange"
                          : "border-border text-text-light hover:border-navy/30"
                      }`}
                    >
                      {p === 0 ? "Todas" : <><Star className="h-3 w-3" /> {p}+</>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-text-light">Precio por hora (ARS)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={precioMin}
                    onChange={(e) => { setPrecioMin(e.target.value); setPagina(1); }}
                    placeholder="Mín"
                    className="w-full rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-text outline-none focus:border-orange"
                  />
                  <span className="text-text-light">-</span>
                  <input
                    type="number"
                    min="0"
                    value={precioMax}
                    onChange={(e) => { setPrecioMax(e.target.value); setPagina(1); }}
                    placeholder="Máx"
                    className="w-full rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-text outline-none focus:border-orange"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-text-light">
                  Radio de búsqueda {radio ? `(${radio} km)` : ""}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={radio || "50"}
                    onChange={(e) => { setRadio(e.target.value); setPagina(1); }}
                    className="w-full accent-orange"
                  />
                  <span className="w-10 text-right text-sm font-medium text-text">
                    {radio || "50"} km
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3">
              <p className="text-xs text-text-light">
                {latitud && longitud ? "📍 Ubicación detectada" : "Activa tu ubicación para aplicar el radio y ver distancias"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Resultados */}
      <div className="flex gap-6">
        {/* Lista de resultados */}
        <div className={`${vista === "mapa" ? "w-full lg:w-1/2" : "w-full"}`}>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-text-light">
              {cargando ? "Buscando..." : `${total} profesional(es) encontrado(s)`}
            </p>
          </div>

          {cargando ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange border-t-transparent" />
            </div>
          ) : resultados.length === 0 ? (
            <div className="rounded-xl border border-border bg-card py-16 text-center">
              <p className="text-lg font-medium text-navy">No se encontraron resultados</p>
              <p className="mt-2 text-sm text-text-light">Intentá con otros filtros o ampliá tu búsqueda.</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {resultados.map((r) => (
                  <Link
                    key={r.id}
                    href={`/perfil/${r.id}`}
                    className="block rounded-xl border border-border bg-card p-5 transition-all hover:border-orange/30 hover:shadow-md"
                  >
                    <div className="flex gap-4">
                      {/* Avatar */}
                      {r.usuario.imagen ? (
                        <img src={r.usuario.imagen} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-navy text-xl font-bold text-white">
                          {r.usuario.nombre.charAt(0)}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-navy truncate">{r.usuario.nombre}</h3>
                          {r.verificado && <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">✓ Verificado</span>}
                          {r.destacado && <span className="shrink-0 rounded-full bg-orange/10 px-2 py-0.5 text-[10px] font-semibold text-orange">★ Top</span>}
                        </div>

                        <p className="mt-0.5 text-sm text-text truncate">{r.titulo}</p>

                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-text-light">
                          <span className="flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 fill-orange text-orange" />
                            <span className="font-medium text-text">{r.promedioEstrellas}</span>
                            ({r.totalResenas})
                          </span>
                          {r.distancia != null && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {r.distancia} km
                            </span>
                          )}
                          <span>{r.ciudad}{r.barrio ? `, ${r.barrio}` : ""}</span>
                          {r.tipoPrecio === "por_hora" && r.precioPorHora ? (
                            <span className="font-medium text-orange">${r.precioPorHora.toLocaleString("es-AR")}/hr</span>
                          ) : (
                            <span>A convenir</span>
                          )}
                        </div>

                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {r.oficios.slice(0, 4).map((o) => (
                            <span key={o.oficio.nombre} className="rounded-full bg-surface px-2 py-0.5 text-[10px] text-text-light">
                              {o.oficio.icono} {o.oficio.nombre}
                            </span>
                          ))}
                        </div>

                        {r.descripcion && (
                          <p className="mt-2 line-clamp-2 text-xs text-text-light">{r.descripcion}</p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  <button
                    onClick={() => setPagina(Math.max(1, pagina - 1))}
                    disabled={pagina === 1}
                    className="rounded-lg border border-border p-2 text-text-light hover:bg-surface disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-text-light">
                    Página {pagina} de {totalPages}
                  </span>
                  <button
                    onClick={() => setPagina(Math.min(totalPages, pagina + 1))}
                    disabled={pagina === totalPages}
                    className="rounded-lg border border-border p-2 text-text-light hover:bg-surface disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Mapa */}
        {vista === "mapa" && (
          <div className="hidden w-1/2 lg:block">
            <MapaResultados resultados={resultados} />
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================
// COMPONENTE MAPA
// =============================================
function MapaResultados({ resultados }: { resultados: ResultadoBusqueda[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapaInstancia = useRef<google.maps.Map | null>(null);
  const marcadores = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    if (!mapRef.current || !window.google) return;

    // Centrar mapa en Buenos Aires por defecto
    const centro = { lat: -34.6037, lng: -58.3816 };

    // Si hay resultados con coordenadas, centrar en el primero
    const conCoordenadas = resultados.filter((r) => r.latitud && r.longitud);
    if (conCoordenadas.length > 0 && conCoordenadas[0].latitud && conCoordenadas[0].longitud) {
      const c = { lat: conCoordenadas[0].latitud, lng: conCoordenadas[0].longitud };
      mapaInstancia.current = new google.maps.Map(mapRef.current, {
        center: c,
        zoom: 12,
        styles: [
          { featureType: "poi", stylers: [{ visibility: "off" }] },
        ],
      });
    } else {
      mapaInstancia.current = new google.maps.Map(mapRef.current, {
        center: centro,
        zoom: 11,
      });
    }

    // Limpiar marcadores anteriores
    marcadores.current.forEach((m) => m.setMap(null));
    marcadores.current = [];

    // Agregar marcadores
    conCoordenadas.forEach((r) => {
      if (!r.latitud || !r.longitud || !mapaInstancia.current) return;

      const marker = new google.maps.Marker({
        position: { lat: r.latitud, lng: r.longitud },
        map: mapaInstancia.current,
        title: r.usuario.nombre,
        icon: {
          url: r.verificado
            ? "https://maps.google.com/mapfiles/ms/icons/green-dot.png"
            : "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
        },
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="max-width:200px;font-family:Inter,sans-serif">
            <strong style="color:#1a365d">${r.usuario.nombre}</strong>
            <p style="font-size:12px;color:#718096;margin:2px 0">${r.titulo || ""}</p>
            <p style="font-size:12px">⭐ ${r.promedioEstrellas} (${r.totalResenas} reseñas)</p>
            <a href="/perfil/${r.id}" style="color:#ed8936;font-size:12px">Ver perfil →</a>
          </div>
        `,
      });

      marker.addListener("click", () => infoWindow.open(mapaInstancia.current, marker));
      marcadores.current.push(marker);
    });
  }, [resultados]);

  return (
    <div className="sticky top-24">
      <div ref={mapRef} className="h-[calc(100vh-200px)] rounded-xl border border-border" />
      <p className="mt-2 text-xs text-text-light">
        🟢 Verificado · 🔴 Sin verificar
      </p>
    </div>
  );
}

export default function BusquedaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange border-t-transparent" />
        </div>
      }
    >
      <BusquedaContent />
    </Suspense>
  );
}
