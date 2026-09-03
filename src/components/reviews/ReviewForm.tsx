/**
 * ReviewForm - Formulario para dejar reseñas
 * 
 * Componente modal con:
 * - Selector de estrellas (1-5) interactivo
 * - Textarea para comentario (10-1000 caracteres)
 * - Subida de foto opcional (a Cloudinary)
 * - Validación completa en cliente
 * - Estados de carga y éxito/error
 * - Contador de caracteres
 */

"use client";

import { useState, useRef } from "react";
import { Star, X, Camera, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface ReviewFormProps {
  /** ID del perfil profesional */
  perfilId: string;
  /** Nombre del profesional (para mostrar en el título) */
  nombreProfesional: string;
  /** Si el modal está abierto */
  abierto: boolean;
  /** Callback para cerrar el modal */
  onCerrar: () => void;
  /** Callback cuando se crea la reseña exitosamente */
  onResenaCreada: () => void;
}

type EstadoFormulario = "idle" | "subiendo_foto" | "enviando" | "exito" | "error";

export function ReviewForm({
  perfilId,
  nombreProfesional,
  abierto,
  onCerrar,
  onResenaCreada,
}: ReviewFormProps) {
  // Estado del formulario
  const [puntuacion, setPuntuacion] = useState(0);
  const [puntuacionHover, setPuntuacionHover] = useState(0);
  const [comentario, setComentario] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoFormulario>("idle");
  const [error, setError] = useState("");

  // Ref del input de archivo
  const fileInputRef = useRef<HTMLInputElement>(null);

  // =============================================
  // LÍMITES
  // =============================================
  const MIN_COMENTARIO = 10;
  const MAX_COMENTARIO = 1000;
  const MAX_FOTO_MB = 5;

  // =============================================
  // SELECCIÓN DE ESTRELLAS
  // =============================================
  const handleStarClick = (star: number) => {
    setPuntuacion(star);
  };

  // =============================================
  // SUBIDA DE FOTO
  // =============================================
  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith("image/")) {
      setError("Solo se permiten archivos de imagen");
      return;
    }

    // Validar tamaño
    if (file.size > MAX_FOTO_MB * 1024 * 1024) {
      setError(`La imagen no puede superar ${MAX_FOTO_MB}MB`);
      return;
    }

    setFoto(file);
    setError("");

    // Crear preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFotoPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const eliminarFoto = () => {
    setFoto(null);
    setFotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // =============================================
  // SUBMIT
  // =============================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validaciones en cliente
    if (puntuacion < 1 || puntuacion > 5) {
      setError("Seleccioná una puntuación del 1 al 5");
      return;
    }

    if (comentario.trim().length < MIN_COMENTARIO) {
      setError(`El comentario debe tener al menos ${MIN_COMENTARIO} caracteres`);
      return;
    }

    if (comentario.trim().length > MAX_COMENTARIO) {
      setError(`El comentario no puede exceder ${MAX_COMENTARIO} caracteres`);
      return;
    }

    try {
      let fotoUrl: string | null = null;

      // Si hay foto, subirla primero a Cloudinary
      if (foto) {
        setEstado("subiendo_foto");
        const formData = new FormData();
        formData.append("file", foto);

        const uploadRes = await fetch("/api/uploads", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error("Error al subir la imagen");
        }

        const uploadData = await uploadRes.json();
        fotoUrl = uploadData.url;
      }

      // Crear la reseña
      setEstado("enviando");
      const res = await fetch(`/api/profesionales/${perfilId}/resenas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          puntuacion,
          comentario: comentario.trim(),
          fotoUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al crear la reseña");
      }

      // Éxito
      setEstado("exito");
      setTimeout(() => {
        onResenaCreada();
        onCerrar();
        // Resetear formulario
        setPuntuacion(0);
        setComentario("");
        setFoto(null);
        setFotoPreview(null);
        setEstado("idle");
      }, 1500);
    } catch (err) {
      setEstado("error");
      setError(err instanceof Error ? err.message : "Error al enviar la reseña");
    }
  };

  // =============================================
  // CERRAR MODAL
  // =============================================
  const handleCerrar = () => {
    if (estado === "enviando" || estado === "subiendo_foto") return;
    onCerrar();
    // Resetear después de un frame
    setTimeout(() => {
      setPuntuacion(0);
      setComentario("");
      setFoto(null);
      setFotoPreview(null);
      setError("");
      setEstado("idle");
    }, 200);
  };

  // No renderizar si no está abierto
  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay oscuro */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={handleCerrar}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-2xl bg-card shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h2 className="text-lg font-bold text-navy">Dejar reseña</h2>
            <p className="text-sm text-text-light">
              a {nombreProfesional}
            </p>
          </div>
          <button
            onClick={handleCerrar}
            disabled={estado === "enviando" || estado === "subiendo_foto"}
            className="rounded-lg p-1 hover:bg-surface transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5 text-text" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Estado de éxito */}
          {estado === "exito" && (
            <div className="flex flex-col items-center py-6 text-center">
              <CheckCircle className="h-12 w-12 text-success mb-3" />
              <h3 className="text-lg font-semibold text-navy">
                ¡Reseña enviada!
              </h3>
              <p className="text-sm text-text-light mt-1">
                Tu opinión ayuda a otros clientes
              </p>
            </div>
          )}

          {/* Formulario normal */}
          {estado !== "exito" && (
            <>
              {/* Selector de estrellas */}
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Puntuación *
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleStarClick(star)}
                      onMouseEnter={() => setPuntuacionHover(star)}
                      onMouseLeave={() => setPuntuacionHover(0)}
                      className="p-0.5 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-8 w-8 transition-colors ${
                          star <= (puntuacionHover || puntuacion)
                            ? "fill-orange text-orange"
                            : "text-border hover:text-orange-light"
                        }`}
                      />
                    </button>
                  ))}
                  {puntuacion > 0 && (
                    <span className="ml-2 text-sm text-text-light self-center">
                      {puntuacion === 1 && "Muy mala"}
                      {puntuacion === 2 && "Mala"}
                      {puntuacion === 3 && "Regular"}
                      {puntuacion === 4 && "Buena"}
                      {puntuacion === 5 && "Excelente"}
                    </span>
                  )}
                </div>
              </div>

              {/* Comentario */}
              <div>
                <label className="block text-sm font-medium text-text mb-1">
                  Tu experiencia *
                </label>
                <textarea
                  value={comentario}
                  onChange={(e) => {
                    setComentario(e.target.value);
                    setError("");
                  }}
                  placeholder="Contanos cómo fue tu experiencia con este profesional..."
                  rows={4}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-light focus:outline-none focus:border-navy-light resize-none"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-text-light">
                    Mínimo {MIN_COMENTARIO} caracteres
                  </span>
                  <span
                    className={`text-xs ${
                      comentario.length > MAX_COMENTARIO
                        ? "text-error"
                        : comentario.length > MAX_COMENTARIO * 0.9
                        ? "text-warning"
                        : "text-text-light"
                    }`}
                  >
                    {comentario.length}/{MAX_COMENTARIO}
                  </span>
                </div>
              </div>

              {/* Foto opcional */}
              <div>
                <label className="block text-sm font-medium text-text mb-1">
                  Foto del trabajo (opcional)
                </label>

                {fotoPreview ? (
                  <div className="relative inline-block">
                    <img
                      src={fotoPreview}
                      alt="Preview"
                      className="h-24 w-24 rounded-lg object-cover border border-border"
                    />
                    <button
                      type="button"
                      onClick={eliminarFoto}
                      className="absolute -top-2 -right-2 bg-error text-white rounded-full p-0.5 hover:bg-error/80"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-text-light hover:border-navy-light hover:text-navy transition-colors"
                  >
                    <Camera className="h-4 w-4" />
                    Subir foto (máx. {MAX_FOTO_MB}MB)
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFotoChange}
                  className="hidden"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Botones */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCerrar}
                  disabled={estado === "enviando" || estado === "subiendo_foto"}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    estado === "enviando" ||
                    estado === "subiendo_foto" ||
                    puntuacion === 0 ||
                    comentario.trim().length < MIN_COMENTARIO
                  }
                  className="flex items-center gap-2 rounded-lg bg-orange px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-dark disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {estado === "subiendo_foto" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Subiendo foto...
                    </>
                  ) : estado === "enviando" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar reseña"
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
