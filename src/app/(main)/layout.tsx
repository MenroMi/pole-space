import Header from '@/shared/components/Header'
import Footer from '@/shared/components/Footer'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Header />
      <div className="flex flex-1 flex-col">
        {children}
      </div>
      <Footer />
    </div>
  )
}
