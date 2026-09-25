import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { AppLayout } from './components/layouts/AppLayout';
import Index from './pages/Index';
import Auth from './pages/Auth';
import Investments from './pages/Investments';
import Goals from './pages/Goals';
import Charts from './pages/Charts';
import Reports from './pages/Reports';
import Calculator from './pages/Calculator';
import InvestmentDetail from './pages/InvestmentDetail';
import ImportB3 from './pages/ImportB3';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/investments" element={<Investments />} />
              <Route path="/investments/:id" element={<InvestmentDetail />} />
              <Route path="/goals" element={<Goals />} />
              <Route path="/charts" element={<Charts />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/calculator" element={<Calculator />} />
              <Route path="/import-b3" element={<ImportB3 />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;