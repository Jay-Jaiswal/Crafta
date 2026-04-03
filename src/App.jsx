import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import useStore from './store/useStore';
import useThemeStore from './store/useThemeStore';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import History from './pages/History';
import { useEffect } from 'react';

const Layout = ({ children }) => {
  const { theme } = useThemeStore();

  useEffect(() => {
    document.body.className = theme === 'dark' ? 'dark-theme' : '';
  }, [theme]);

  return (
    <div className="min-h-screen relative overflow-hidden transition-colors duration-300">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -top-40 -left-28 h-96 w-96 rounded-full bg-orange-200/60 blur-3xl" />
        <div className="absolute bottom-[-130px] left-[30%] h-96 w-96 rounded-full bg-cyan-200/70 blur-3xl" />
      </div>
      <Sidebar />
      <main className="relative ml-20 md:ml-56 min-h-screen">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-5 md:py-6">
          {children}
        </div>
      </main>
    </div>
  );
};

function App() {
  const isLoading = useStore((s) => s.isLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoaderCircle className="w-6 h-6 text-brand-600 animate-spin" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/home" element={<Home />} />
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
