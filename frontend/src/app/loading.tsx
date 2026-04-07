export default function Loading() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50"
      role="status"
      aria-label="Loading application"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
          <div className="absolute inset-0 rounded-full border-4 border-primary-500 border-t-transparent animate-spin" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-slate-700">
            Sign Language Interpreter
          </h2>
          <p className="text-sm text-slate-400 mt-1">Initializing...</p>
        </div>
      </div>
    </div>
  );
}
