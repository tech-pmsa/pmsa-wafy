// app/loading.tsx
export default function GlobalLoading() {
  return (
    <div className="flex items-center justify-center h-screen bg-primary-grey text-dark-green">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-dark-green border-dashed rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-sm font-medium">Loading......</p>
      </div>
    </div>
  )
}
