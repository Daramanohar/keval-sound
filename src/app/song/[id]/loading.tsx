export default function SongDetailsLoading() {
  return (
    <div className="max-w-4xl animate-pulse" aria-label="Loading track details">
      <div className="mb-5 h-5 w-32 rounded bg-white/[0.05]" />
      <div className="flex flex-col gap-6 md:flex-row md:items-end">
        <div className="aspect-square w-full max-w-[320px] rounded-2xl bg-white/[0.06] md:w-80" />
        <div className="min-w-0 flex-1 space-y-4 pb-3">
          <div className="h-5 w-24 rounded-full bg-dandelion/10" />
          <div className="h-12 w-3/4 rounded bg-white/[0.07]" />
          <div className="h-5 w-40 rounded bg-white/[0.05]" />
          <div className="h-12 w-64 rounded-md bg-zesty-red/10" />
        </div>
      </div>
    </div>
  );
}
