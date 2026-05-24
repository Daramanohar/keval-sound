export default function KevalPlayerLoading() {
  return (
    <div className="min-h-[calc(100vh-96px)] space-y-8 pb-28" aria-label="Loading Player">
      <section className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0b0c18]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(78,125,255,0.16),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(137,62,138,0.1),transparent_38%)]" />
        <div className="relative z-10 flex min-h-[300px] flex-col justify-between p-6 md:p-8">
          <div className="max-w-3xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="skeleton h-11 w-11 rounded-xl" />
              <div className="space-y-3">
                <div className="skeleton h-3 w-32 rounded-full" />
                <div className="skeleton h-10 w-[min(520px,72vw)] rounded-xl" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="skeleton h-8 w-36 rounded-full" />
              ))}
            </div>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-[1fr_280px]">
            <div className="skeleton h-12 rounded-xl" />
            <div className="skeleton h-12 rounded-xl" />
          </div>
        </div>
      </section>

      <div className="-mx-6 border-y border-white/[0.04] bg-[#0c0d1c]/85 px-6 py-3">
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="skeleton h-10 w-28 shrink-0 rounded-xl" />
          ))}
        </div>
      </div>

      <section className="space-y-6">
        <div className="space-y-2">
          <div className="skeleton h-8 w-48 rounded-xl" />
          <div className="skeleton h-4 w-[min(520px,78vw)] rounded-lg" />
        </div>

        {Array.from({ length: 3 }).map((_, rowIndex) => (
          <div key={rowIndex} className="space-y-3">
            <div className="space-y-2">
              <div className="skeleton h-6 w-44 rounded-lg" />
              <div className="skeleton h-4 w-32 rounded-lg" />
            </div>
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 6 }).map((_, cardIndex) => (
                <div
                  key={cardIndex}
                  className="h-[276px] w-[174px] shrink-0 overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.035]"
                >
                  <div className="skeleton h-[174px] rounded-none" />
                  <div className="space-y-3 p-3">
                    <div className="skeleton h-4 w-28 rounded-lg" />
                    <div className="skeleton h-3 w-20 rounded-lg" />
                    <div className="flex gap-2">
                      <div className="skeleton h-8 w-8 rounded-full" />
                      <div className="skeleton h-8 flex-1 rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
