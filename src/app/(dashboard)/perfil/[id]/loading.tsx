export default function PerfilLoading() {
  return (
    <div className="min-h-screen bg-[#f7fafc]">
      {/* Header skeleton */}
      <div className="bg-[#1a365d] text-white py-12">
        <div className="max-w-4xl mx-auto px-4 flex items-center gap-6 animate-pulse">
          <div className="w-24 h-24 bg-white/20 rounded-full" />
          <div className="space-y-3">
            <div className="h-8 bg-white/20 rounded w-64" />
            <div className="h-5 bg-white/10 rounded w-40" />
            <div className="flex gap-4">
              <div className="h-5 bg-white/10 rounded w-24" />
              <div className="h-5 bg-white/10 rounded w-32" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-6 shadow-sm animate-pulse space-y-4">
              <div className="h-5 bg-gray-200 rounded w-24" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-4 bg-gray-100 rounded" />
              ))}
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm animate-pulse space-y-3">
              <div className="h-5 bg-gray-200 rounded w-32" />
              <div className="h-4 bg-gray-100 rounded" />
              <div className="h-4 bg-gray-100 rounded w-3/4" />
            </div>
          </div>

          {/* Main content */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 rounded w-48" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-4 bg-gray-100 rounded" />
              ))}
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 rounded w-36" />
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
