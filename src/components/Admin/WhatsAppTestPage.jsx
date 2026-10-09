import React from 'react';
import { ArrowLeft, ExternalLink, Sparkles } from 'lucide-react';
import WhatsAppConfigModule from './WhatsAppConfigModule';
import { Logo } from '../BrandLogo';

export default function WhatsAppTestPage({ onBackToHome, adminUser }) {
  return (
    <div className="min-h-screen bg-cream-100 font-poppins text-temple-900 pb-16 flex flex-col animate-fadeIn selection:bg-saffron-100 selection:text-saffron-900">
      
      {/* Top Header Navigation */}
      <header className="bg-white/90 backdrop-blur-md border-b border-cream-200/90 sticky top-0 z-30 px-4 sm:px-8 py-3.5 shadow-2xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          
          {/* Logo & Portal Name */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl overflow-hidden border border-amber-200 shadow-soft bg-cream-50 flex items-center justify-center p-0.5 shrink-0">
              <Logo alt="GitaAmrit" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-temple-900 leading-tight">
                WhatsApp Community Control
              </h1>
              <p className="text-[11px] text-temple-500 font-medium">
                Super Admin Configuration Portal
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <a
              href="#register"
              className="hidden sm:flex items-center gap-1.5 py-2 px-3.5 rounded-2xl bg-cream-50 hover:bg-cream-200/80 text-temple-700 text-xs font-semibold border border-cream-300 transition-all shadow-2xs cursor-pointer"
            >
              <span>Test Registration Flow</span>
              <ExternalLink className="w-3 h-3 text-temple-400" />
            </a>

            {onBackToHome && (
              <button
                type="button"
                onClick={onBackToHome}
                className="py-2 px-3.5 rounded-2xl bg-saffron-500 hover:bg-saffron-600 active:bg-saffron-700 text-white font-semibold text-xs shadow-soft transition-all cursor-pointer flex items-center gap-1.5 transform hover:-translate-y-0.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Home</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 pt-6 sm:pt-8">
        
        {/* Module Render */}
        <WhatsAppConfigModule 
          callerUser={adminUser || { email: 'superadmin@gitaamrit.org', name: 'Super Administrator' }} 
        />

        {/* Footer Note */}
        <div className="mt-8 text-center space-y-1 text-xs text-temple-500">
          <p className="font-semibold text-temple-700">GitaAmrit Administrative System</p>
          <p className="text-[11px]">Settings saved here update in real-time across student registration success screens.</p>
        </div>

      </main>

    </div>
  );
}
