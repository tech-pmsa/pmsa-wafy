// app/loading.tsx
export default function GlobalLoading() {
  return (
    <div className="flex items-center justify-center h-screen bg-white text-blue-600">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-dashed rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-sm font-medium">Loading College Portal...</p>
      </div>
    </div>
  )
}
