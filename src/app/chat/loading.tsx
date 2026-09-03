export default function ChatLoading() {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#f7fafc] flex">
      {/* Conversations sidebar skeleton */}
      <div className="w-80 border-r border-gray-200 bg-white p-4 hidden md:block">
        <div className="h-10 bg-gray-200 rounded-lg mb-4 animate-pulse" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Messages area skeleton */}
      <div className="flex-1 flex flex-col">
        <div className="h-16 border-b border-gray-200 bg-white px-6 flex items-center gap-3 animate-pulse">
          <div className="w-10 h-10 bg-gray-200 rounded-full" />
          <div className="h-5 bg-gray-200 rounded w-40" />
        </div>
        <div className="flex-1 p-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              <div className={`h-10 rounded-2xl animate-pulse ${
                i % 2 === 0 ? 'bg-gray-200 w-48' : 'bg-[#1a365d]/20 w-56'
              }`} />
            </div>
          ))}
        </div>
        <div className="h-16 border-t border-gray-200 bg-white px-6 flex items-center gap-3 animate-pulse">
          <div className="flex-1 h-10 bg-gray-100 rounded-full" />
          <div className="w-10 h-10 bg-gray-200 rounded-full" />
        </div>
      </div>
    </div>
  );
}
