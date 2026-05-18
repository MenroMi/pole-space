import Footer from '@/shared/components/Footer';
import Header from '@/shared/components/Header';
import MobileBottomNav from '@/shared/components/MobileBottomNav';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Header />
      <div className="mx-auto flex w-full max-w-[2560px] flex-1 flex-col pb-14 sm:pb-0">
        {children}
      </div>
      <div className="hidden sm:block">
        <Footer />
      </div>
      <MobileBottomNav />
    </div>
  );
}
