import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Footer from './components/Footer';
import LoginModal from './components/LoginModal';
import { Logo } from './components/BrandLogo';
import { subscribeToProgramSettings } from './firebase';

const RegistrationFlow = React.lazy(() => import('./components/Registration/RegistrationFlow'));
const AdminDashboard = React.lazy(() => import('./components/Admin/AdminDashboard'));
const AdminLogin = React.lazy(() => import('./components/Admin/AdminLogin'));
const StudentDashboard = React.lazy(() => import('./components/Student/StudentDashboard'));

export default function App() {
  const [programSettings, setProgramSettings] = useState(() => {
    try {
      const cached = localStorage.getItem('gita_amrita_cached_settings');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return null;
  });

  const [currentView, setCurrentView] = useState(() => {
    if (typeof window !== 'undefined') {
      const hash = (window.location.hash || '').toLowerCase();
      if (hash === '#register' || hash === '#registration') return 'register';
      if (hash === '#admin' || hash === '#admin-dashboard' || hash === '#settings' || hash === '#admin-settings') return 'admin';
      if (hash === '#admin-login') return 'admin-login';
      if (hash === '#dashboard' || hash === '#student' || hash === '#student-dashboard' || hash === '#portal') return 'student';
      try {
        const cached = localStorage.getItem('gita_amrita_cached_settings');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.showLandingPage === false) {
            return 'register';
          }
          if (parsed && parsed.showLandingPage !== false) {
            return 'landing';
          }
        }
      } catch (e) {}
    }
    // If no hash and no cache, show brief loading screen while reading initial settings
    return 'loading';
  });
  const [loginModalOpen, setLoginModalOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return (window.location.hash || '').toLowerCase() === '#login';
    }
    return false;
  });
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

  const [showLandingPage, setShowLandingPage] = useState(() => {
    try {
      const cached = localStorage.getItem('gita_amrita_cached_settings');
      if (cached) return JSON.parse(cached).showLandingPage !== false;
    } catch (e) {}
    return true;
  });

  const [isRegistrationOpen, setIsRegistrationOpen] = useState(() => {
    try {
      const cached = localStorage.getItem('gita_amrita_cached_settings');
      if (cached) return JSON.parse(cached).isRegistrationOpen !== false;
    } catch (e) {}
    return true;
  });

  useEffect(() => {
    let isMounted = true;
    
    // Safety fallback timeout: if Firestore takes more than 600ms, fall back to landing
    const fallbackTimer = setTimeout(() => {
      if (isMounted) {
        setCurrentView((prev) => (prev === 'loading' ? 'landing' : prev));
      }
    }, 600);

    const unsub = subscribeToProgramSettings((sett) => {
      if (sett && isMounted) {
        setProgramSettings(sett);
        setIsRegistrationOpen(sett.isRegistrationOpen !== false);
        const shouldShowLanding = sett.showLandingPage !== false;
        setShowLandingPage(shouldShowLanding);

        setCurrentView((prev) => {
          const hash = (typeof window !== 'undefined' ? (window.location.hash || '').toLowerCase() : '');
          if (hash === '#register' || hash === '#registration') return 'register';
          if (hash === '#admin' || hash === '#admin-dashboard' || hash === '#settings' || hash === '#admin-settings') return 'admin';
          if (hash === '#admin-login') return 'admin-login';
          if (hash === '#dashboard' || hash === '#student' || hash === '#student-dashboard' || hash === '#portal') return 'student';

          if (!shouldShowLanding) {
            if (prev === 'loading' || prev === 'landing' || !hash || hash === '#' || hash === '#home') {
              return 'register';
            }
          } else {
            if (prev === 'loading') {
              return 'landing';
            }
          }
          return prev;
        });
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
      unsub();
    };
  }, []);

  const goToRegister = () => {
    setCurrentView('register');
    window.location.hash = 'register';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToHome = () => {
    if (!showLandingPage) {
      goToRegister();
      return;
    }
    setCurrentView('landing');
    if (window.location.hash) {
      window.history.pushState(null, '', window.location.pathname);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToAdmin = () => {
    setCurrentView('admin');
    window.location.hash = 'admin';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToSettings = () => {
    setCurrentView('admin');
    window.location.hash = 'settings';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAdminLoginSuccess = (user) => {
    setAdminUser(user);
    try {
      localStorage.setItem('gita_amrita_admin_session', JSON.stringify(user));
    } catch (e) {}
    setCurrentView('admin');
    const hash = (window.location.hash || '').toLowerCase();
    if (hash !== '#settings' && hash !== '#admin-settings') {
      window.location.hash = 'admin';
    }
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
    window.location.hash = 'login';
    setLoginModalOpen(true);
  };
  const closeLogin = () => {
    setLoginModalOpen(false);
    if ((window.location.hash || '').toLowerCase() === '#login') {
      window.history.pushState(null, '', window.location.pathname);
    }
  };

  // Handle browser back button or hash navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = (window.location.hash || '').toLowerCase();
      if (hash === '#register' || hash === '#registration') {
        setCurrentView('register');
        setLoginModalOpen(false);
      } else if (hash === '#admin' || hash === '#admin-dashboard' || hash === '#settings' || hash === '#admin-settings') {
        setCurrentView('admin');
        setLoginModalOpen(false);
      } else if (hash === '#admin-login') {
        setCurrentView('admin-login');
        setLoginModalOpen(false);
      } else if (hash === '#dashboard' || hash === '#student' || hash === '#student-dashboard' || hash === '#portal') {
        setCurrentView('student');
        setLoginModalOpen(false);
      } else if (hash === '#login') {
        setLoginModalOpen(true);
      } else if (hash === '' || hash === '#' || hash === '#home') {
        if (!showLandingPage) {
          setCurrentView('register');
        } else {
          setCurrentView('landing');
        }
        setLoginModalOpen(false);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [showLandingPage]);

  if (currentView === 'loading') {
    return (
      <div className="min-h-screen bg-cream-100 flex flex-col items-center justify-center p-4 font-poppins text-temple-900">
        <div className="text-center space-y-4 animate-fadeIn">
          <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl overflow-hidden border-2 border-amber-300 shadow-soft bg-cream-50 flex items-center justify-center p-1">
            <Logo alt="Gita for Youth" className="w-full h-full object-contain" />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-base sm:text-lg font-bold text-temple-900">Gita for Youth</h1>
          </div>
          <div className="w-6 h-6 border-2 border-saffron-500 border-t-transparent rounded-full animate-spin mx-auto mt-2" />
        </div>
      </div>
    );
  }

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
            onGoToDashboard={(user) => {
              if (user && user.fullName) {
                handleStudentLoginSuccess(user);
              } else {
                openLogin();
              }
            }} 
            initialSettings={programSettings}
            showLandingPage={showLandingPage}
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

  if (currentView === 'admin-login' || (currentView === 'admin' && !adminUser)) {
    return (
      <React.Suspense fallback={
        <div className="min-h-screen bg-cream-100 flex items-center justify-center font-poppins text-temple-700">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-2 border-saffron-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-medium">Loading Admin Portal...</p>
          </div>
        </div>
      }>
        <AdminLogin 
          onLoginSuccess={handleAdminLoginSuccess} 
          onBackToHome={goToHome} 
        />
      </React.Suspense>
    );
  }

  if (currentView === 'admin') {
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
        />
      </React.Suspense>
    );
  }

  if (currentView === 'student') {
    if (!studentUser) {
      return (
        <div className="min-h-screen bg-cream-100 flex flex-col items-center justify-center p-4 font-poppins text-temple-900">
          <div className="w-full max-w-sm bg-cream-50 rounded-3xl p-6 text-center space-y-4 border border-cream-300 shadow-soft animate-fadeIn">
            <h3 className="text-lg font-bold">Participant Portal</h3>
            <p className="text-xs text-temple-600">Please sign in to access your registration pass.</p>
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
            <p className="text-sm font-medium">Loading Participant Portal...</p>
          </div>
        </div>
      }>
        <StudentDashboard 
          studentUser={studentUser} 
          onLogout={handleStudentLogout} 
        />
      </React.Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-cream-100 flex flex-col font-poppins selection:bg-saffron-100 selection:text-saffron-900 animate-fadeIn">
      
      {/* Top Navigation */}
      <Navbar 
        onOpenRegister={goToRegister} 
        onOpenLogin={openLogin} 
        onOpenAdmin={goToAdmin}
        isAdmin={isAdmin}
        studentUser={studentUser}
        isRegistrationOpen={isRegistrationOpen}
      />

      {/* Main Content Sections */}
      <main className="flex-1">
        {/* 1. Hero Section */}
        <Hero onOpenRegister={goToRegister} />
      </main>

      {/* 2. Footer */}
      <Footer 
        onOpenLogin={openLogin} 
      />

      {/* Login Modal */}
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
