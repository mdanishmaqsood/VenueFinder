import { Route, Routes } from 'react-router-dom';
import Navbar from './components/layout/Navbar.jsx';
import Home from './pages/Home.jsx';
import Shortlist from './pages/Shortlist.jsx';
import ToastViewport from './components/common/ToastViewport.jsx';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <main className="mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shortlist" element={<Shortlist />} />
        </Routes>
      </main>
      <ToastViewport />
    </div>
  );
}
