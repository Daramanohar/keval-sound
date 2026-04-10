export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="space-y-6">
        <div className="skeleton h-14 rounded-2xl" />
        <div className="skeleton h-72 rounded-3xl" />
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="skeleton h-64 rounded-3xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
