export default function BusquedaLoading() {
  return (
    <div className="min-h-screen bg-[#f7fafc]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search bar skeleton */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 h-12 bg-gray-200 rounded-lg animate-pulse" />
            <div className="w-48 h-12 bg-gray-200 rounded-lg animate-pulse" />
            <div className="w-32 h-12 bg-gray-200 rounded-lg animate-pulse" />
          </div>
          <div className="flex gap-3 mt-4">
            <div className="w-40 h-10 bg-gray-100 rounded-lg animate-pulse" />
            <div className="w-32 h-10 bg-gray-100 rounded-lg animate-pulse" />
            <div className="w-36 h-10 bg-gray-100 rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Results skeleton */}
        <div className="flex gap-6">
          <div className="flex-1 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-20 h-20 bg-gray-200 rounded-full" />
                  <div className="flex-1 space-y-3">
                    <div className="h-5 bg-gray-200 rounded w-1/3" />
                    <div className="h-4 bg-gray-100 rounded w-1/2" />
                    <div className="flex gap-2">
                      <div className="h-6 w-16 bg-yellow-100 rounded-full" />
                      <div className="h-6 w-20 bg-blue-100 rounded-full" />
                    </div>
                    <div className="h-4 bg-gray-100 rounded w-2/3" />
                  </div>
                  <div className="text-right space-y-2">
                    <div className="h-6 w-24 bg-gray-200 rounded" />
                    <div className="h-8 w-28 bg-[#ed8936]/20 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Map skeleton */}
          <div className="hidden lg:block w-[400px] h-[600px] bg-gray-200 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}
