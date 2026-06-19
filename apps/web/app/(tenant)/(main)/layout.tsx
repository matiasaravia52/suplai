export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-8">
      {children}
    </div>
  )
}
