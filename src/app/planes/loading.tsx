export default function PlanesLoading() {
  return (
    <div className="min-h-screen bg-[#f7fafc]">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12 space-y-4">
          <div className="h-10 bg-gray-200 rounded w-96 mx-auto animate-pulse" />
          <div className="h-6 bg-gray-100 rounded w-[500px] mx-auto animate-pulse" />
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl shadow-sm p-8 animate-pulse"
            >
              <div className="h-6 bg-gray-200 rounded w-32 mx-auto mb-4" />
              <div className="h-10 bg-gray-200 rounded w-40 mx-auto mb-6" />
              <div className="space-y-3 mb-8">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="h-4 bg-gray-100 rounded" />
                ))}
              </div>
              <div className="h-12 bg-gray-200 rounded-xl w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
