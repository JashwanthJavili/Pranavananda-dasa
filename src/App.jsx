import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import AboutSection from './components/AboutSection';
import GuideSection from './components/GuideSection';
import TestimonialsSection from './components/TestimonialsSection';
import FAQSection from './components/FAQSection';
import FinalCTASection from './components/FinalCTASection';
import MoreSection from './components/MoreSection';
import Footer from './components/Footer';
import LoginModal from './components/LoginModal';

const RegistrationFlow = React.lazy(() => import('./components/Registration/RegistrationFlow'));
const AdminDashboard = React.lazy(() => import('./components/Admin/AdminDashboard'));
const StudentDashboard = React.lazy(() => import('./components/Student/StudentDashboard'));

export default function App() {
  const [currentView, setCurrentView] = useState(() => {
    if (typeof window !== 'undefined') {
      if (window.location.hash === '#admin') return 'admin';
      if (window.location.hash === '#dashboard') return 'student';
    }
    return 'landing'; // 'landing' | 'register' | 'admin' | 'student'
  });
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [adminUser, setAdminUser] = useState(() => {
    try {
      const session = localStorage.getItem('gita_amrita_admin_session');
      return session ? JSON.parse(session) : null;
    } catch (e) {
      return null;
    }
  });
  const [studentUser, setStudentUser] = useState(() => {
    try {
      const session = localStorage.getItem('gita_amrita_current_user');
      return session ? JSON.parse(session) : null;
    } catch (e) {
      return null;
    }
  });

  const isAdmin = Boolean(adminUser);

  const goToRegister = () => {
    setCurrentView('register');
    window.location.hash = 'register';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToHome = () => {
    setCurrentView('landing');
    window.location.hash = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToAdmin = () => {
    setCurrentView('admin');
    window.location.hash = 'admin';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAdminLoginSuccess = (user) => {
    setAdminUser(user);
    try {
      localStorage.setItem('gita_amrita_admin_session', JSON.stringify(user));
    } catch (e) {}
    setCurrentView('admin');
    window.location.hash = 'admin';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAdminLogout = () => {
    setAdminUser(null);
    try {
      localStorage.removeItem('gita_amrita_admin_session');
    } catch (e) {}
    goToHome();
  };

  const handleStudentLoginSuccess = (user) => {
    setStudentUser(user);
    try {
      localStorage.setItem('gita_amrita_current_user', JSON.stringify(user));
    } catch (e) {}
    setCurrentView('student');
    window.location.hash = 'dashboard';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStudentLogout = () => {
    setStudentUser(null);
    try {
      localStorage.removeItem('gita_amrita_current_user');
    } catch (e) {}
    goToHome();
  };

  const openLogin = () => {
    if (isAdmin) {
      setCurrentView('admin');
      window.location.hash = 'admin';
      return;
    }
    if (studentUser) {
      setCurrentView('student');
      window.location.hash = 'dashboard';
      return;
    }
    setLoginModalOpen(true);
  };
  const closeLogin = () => setLoginModalOpen(false);

  // Handle browser back button or hash if needed
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#register') {
        setCurrentView('register');
      } else if (window.location.hash === '#admin') {
        setCurrentView('admin');
      } else if (window.location.hash === '#dashboard') {
        setCurrentView('student');
      } else if (window.location.hash === '' || window.location.hash === '#') {
        setCurrentView('landing');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (currentView === 'register') {
    return (
      <>
        <React.Suspense fallback={
          <div className="min-h-screen bg-cream-100 flex items-center justify-center font-poppins text-temple-700">
            <div className="text-center space-y-3">
              <div className="w-10 h-10 border-2 border-saffron-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-medium">Loading registration...</p>
            </div>
          </div>
        }>
          <RegistrationFlow 
            onBackToHome={goToHome} 
            onGoToDashboard={openLogin} 
          />
        </React.Suspense>
        <LoginModal 
          isOpen={loginModalOpen} 
          onClose={closeLogin} 
          onOpenRegister={() => { closeLogin(); goToRegister(); }}
          onAdminLoginSuccess={handleAdminLoginSuccess}
          onStudentLoginSuccess={handleStudentLoginSuccess}
        />
      </>
    );
  }

  if (currentView === 'admin') {
    if (!adminUser) {
      return (
        <div className="min-h-screen bg-cream-100 flex flex-col items-center justify-center p-4 font-poppins text-temple-900">
          <div className="w-full max-w-sm bg-cream-50 rounded-3xl p-6 text-center space-y-4 border border-cream-300 shadow-soft animate-fadeIn">
            <h3 className="text-lg font-bold">Admin Portal Access</h3>
            <p className="text-xs text-temple-600">Please sign in with coordinator credentials using the login window.</p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={goToHome}
                className="w-1/2 py-2.5 px-3 rounded-xl border border-cream-300 bg-cream-100 text-xs font-medium cursor-pointer"
              >
                Back to Home
              </button>
              <button
                onClick={openLogin}
                className="w-1/2 py-2.5 px-3 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-white text-xs font-semibold shadow-soft cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </div>
          <LoginModal 
            isOpen={loginModalOpen} 
            onClose={closeLogin} 
            onOpenRegister={() => { closeLogin(); goToRegister(); }}
            onAdminLoginSuccess={handleAdminLoginSuccess}
            onStudentLoginSuccess={handleStudentLoginSuccess}
          />
        </div>
      );
    }

    return (
      <React.Suspense fallback={
        <div className="min-h-screen bg-cream-100 flex items-center justify-center font-poppins text-temple-700">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-2 border-saffron-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-medium">Loading Coordinator Portal...</p>
          </div>
        </div>
      }>
        <AdminDashboard 
          adminUser={adminUser} 
          onLogout={handleAdminLogout} 
          onBackToHome={goToHome} 
        />
      </React.Suspense>
    );
  }

  if (currentView === 'student') {
    if (!studentUser) {
      return (
        <div className="min-h-screen bg-cream-100 flex flex-col items-center justify-center p-4 font-poppins text-temple-900">
          <div className="w-full max-w-sm bg-cream-50 rounded-3xl p-6 text-center space-y-4 border border-cream-300 shadow-soft animate-fadeIn">
            <h3 className="text-lg font-bold">Student Portal</h3>
            <p className="text-xs text-temple-600">Please sign in to access your participant dashboard.</p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={goToHome}
                className="w-1/2 py-2.5 px-3 rounded-xl border border-cream-300 bg-cream-100 text-xs font-medium cursor-pointer"
              >
                Back to Home
              </button>
              <button
                onClick={openLogin}
                className="w-1/2 py-2.5 px-3 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-white text-xs font-semibold shadow-soft cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </div>
          <LoginModal 
            isOpen={loginModalOpen} 
            onClose={closeLogin} 
            onOpenRegister={() => { closeLogin(); goToRegister(); }}
            onAdminLoginSuccess={handleAdminLoginSuccess}
            onStudentLoginSuccess={handleStudentLoginSuccess}
          />
        </div>
      );
    }

    return (
      <React.Suspense fallback={
        <div className="min-h-screen bg-cream-100 flex items-center justify-center font-poppins text-temple-700">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-2 border-saffron-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-medium">Loading Student Dashboard...</p>
          </div>
        </div>
      }>
        <StudentDashboard 
          studentUser={studentUser} 
          onLogout={handleStudentLogout} 
          onBackToHome={goToHome} 
        />
      </React.Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-cream-100 flex flex-col font-poppins selection:bg-saffron-100 selection:text-saffron-900 animate-fadeIn">
      
      {/* Sticky Top Navigation */}
      <Navbar 
        onOpenRegister={goToRegister} 
        onOpenLogin={openLogin} 
        onOpenAdmin={goToAdmin}
        isAdmin={isAdmin}
        studentUser={studentUser}
      />

      {/* Main Content Sections */}
      <main className="flex-1">
        {/* 1. Hero Section */}
        <Hero onOpenRegister={goToRegister} />

        {/* 2. About the Program & 3 Pillars */}
        <AboutSection />

        {/* 3. Our Guide */}
        <GuideSection />

        {/* 4. Previous Journey / Experiences */}
        <TestimonialsSection />

        {/* 5. FAQ */}
        <FAQSection />

        {/* 6. More from our journey */}
        <MoreSection />

        {/* 7. Final Registration CTA */}
        <FinalCTASection onOpenRegister={goToRegister} />
      </main>

      {/* 8. Footer */}
      <Footer 
        onOpenRegister={goToRegister} 
        onOpenLogin={openLogin} 
        onOpenAdmin={goToAdmin}
      />

      {/* Login / Student Portal Modal */}
      <LoginModal 
        isOpen={loginModalOpen} 
        onClose={closeLogin} 
        onOpenRegister={() => { closeLogin(); goToRegister(); }}
        onAdminLoginSuccess={handleAdminLoginSuccess}
        onStudentLoginSuccess={handleStudentLoginSuccess}
      />

    </div>
  );
}
