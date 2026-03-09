import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import MobileNav from './MobileNav';
import { useIsMobile } from '@/hooks/use-mobile';

const AppLayout = () => {
  const isMobile = useIsMobile();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      {!isMobile && <AppSidebar />}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        {isMobile && <MobileNav />}
        <main className="flex-1 overflow-y-auto bg-mesh pb-20 md:pb-0">
          <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground">
            Skip to main content
          </a>
          <div id="main-content" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
