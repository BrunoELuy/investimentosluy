import { useLocation } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { OnlineStatusIndicator } from '@/components/OnlineStatusIndicator';
import { ThemeToggle } from '@/components/ThemeToggle';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/investments': 'Investimentos',
  '/goals': 'Objetivos',
  '/charts': 'Gráficos',
  '/reports': 'Relatórios',
  '/calculator': 'Calculador',
  '/import-b3': 'Importação B3',
};

function getPageTitle(pathname: string): string {
  if (pathname.startsWith('/investments/')) return 'Detalhes do Investimento';
  return PAGE_TITLES[pathname] ?? 'InvestTracker';
}

export function AppHeader() {
  const location = useLocation();
  const title = getPageTitle(location.pathname);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
      <SidebarTrigger className="-ml-1" />
      <h1 className="flex-1 truncate text-base font-semibold">{title}</h1>
      <OnlineStatusIndicator />
      <ThemeToggle />
    </header>
  );
}