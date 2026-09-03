export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange border-t-transparent" />
        <p className="text-sm text-text-light">Cargando...</p>
      </div>
    </div>
  );
}
