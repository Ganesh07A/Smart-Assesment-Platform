export const TableSkeleton = () => (
  <div className="p-6 space-y-4 animate-pulse">
    {[1,2,3].map(i => (
      <div key={i} className="h-10 bg-gray-100 rounded-lg"></div>
    ))}
  </div>
);