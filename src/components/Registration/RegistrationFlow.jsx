import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock } from 'lucide-react';
import StepIndicator from './StepIndicator';
import StepPersonal from './StepPersonal';
import StepContact from './StepContact';
import StepReflections from './StepReflections';
import StepReview from './StepReview';
import StepSuccess from './StepSuccess';
import WaitingRoomQueue from './WaitingRoomQueue';
import BrandLogo from '../BrandLogo';
import { 
  saveRegistration, 
  getNextRegistrationId, 
  checkDuplicateRegistration, 
  fetchProgramSettings, 
  subscribeToProgramSettings 
} from '../../firebase';

const STEPS = [
  { id: 1, title: 'Participant Details', shortTitle: 'Profile' },
  { id: 2, title: 'Contact Details', shortTitle: 'Contact' },
  { id: 3, title: 'Reflections', shortTitle: 'Reflections' },
  { id: 4, title: 'Review & Confirm', shortTitle: 'Review' },
];

const INITIAL_FORM_DATA = {
  fullName: '',
  age: '',
  gender: '',
  education: '',
  otherEducation: '',
  occupation: '',
  otherOccupation: '',
  countryCode: '+91',
  mobile: '',
  email: '',
  currentResidence: '',
  fullAddress: '',
  pincode: '',
  questionForPranavanandaPrabhu: '',
  inspirationToJoin: '',
  takeawayAspiration: '',
  sourceOfDiscovery: '',
  sourceOfDiscoveryOther: '',
};

export default function RegistrationFlow({ onBackToHome, onGoToDashboard, initialSettings, showLandingPage }) {
  const [currentStep, setCurrentStep] = useState(() => {
    try {
      const completed = localStorage.getItem('gita_amrita_completed_reg');
      if (completed) return 5; // Show success screen if already registered

      const draft = localStorage.getItem('gita_amrita_draft');
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.currentStep && parsed.currentStep >= 1 && parsed.currentStep <= 4) {
          if (!parsed.formData?.fullName && !parsed.formData?.mobile) {
            localStorage.removeItem('gita_amrita_draft');
            return 1;
          }
          return parsed.currentStep;
        }
      }
    } catch (e) {}
    return 1;
  });

  // Session Pass Check for High-Traffic Virtual Queue
  const [isQueuePassed, setIsQueuePassed] = useState(() => {
    try {
      const pass = sessionStorage.getItem('ga_queue_pass');
      if (pass) {
        const passTime = Number(pass);
        // Valid for 30 minutes
        if (Date.now() - passTime < 30 * 60 * 1000) {
          return true;
        }
      }
    } catch (e) {}
    return false;
  });

  const [formData, setFormData] = useState(() => {
    try {
      const completed = localStorage.getItem('gita_amrita_completed_reg');
      if (completed) {
        const parsed = JSON.parse(completed);
        if (parsed.formData) return parsed.formData;
      }

      const draft = localStorage.getItem('gita_amrita_draft');
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.formData) {
          // If draft has no name and no mobile, it was an empty auto-saved draft with old defaults - clear it
          if (!parsed.formData.fullName && !parsed.formData.mobile) {
            localStorage.removeItem('gita_amrita_draft');
            return INITIAL_FORM_DATA;
          }
          return { ...INITIAL_FORM_DATA, ...parsed.formData };
        }
      }
    } catch (e) {}
    return INITIAL_FORM_DATA;
  });

  const [generatedId, setGeneratedId] = useState(() => {
    try {
      const completed = localStorage.getItem('gita_amrita_completed_reg');
      if (completed) {
        const parsed = JSON.parse(completed);
        return parsed.registrationId || '';
      }
    } catch (e) {}
    return '';
  });

  const [settings, setSettings] = useState(() => {
    if (initialSettings) return initialSettings;
    try {
      const cached = localStorage.getItem('gita_amrita_cached_settings');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return { isRegistrationOpen: true, closedNotice: '', isQueueEnabled: false, queueWaitSeconds: 60, queueMessage: '' };
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
    }
  }, [initialSettings]);

  useEffect(() => {
    const unsubscribe = subscribeToProgramSettings((latestSettings) => {
      if (latestSettings) {
        setSettings(latestSettings);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleJoinCommunity = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    try {
      const _k = [73, 83, 75, 67, 79, 78, 95, 71, 73, 84, 65, 95, 65, 77, 82, 73, 84, 65, 95, 50, 48, 50, 54];
      const _d = [
        61, 39, 55, 51, 60, 116, 80, 120, 42, 60, 32, 43, 111, 58, 58, 40,
        32, 50, 62, 66, 64, 28, 85, 38, 62, 124, 7, 13, 56, 30, 40, 8,
        100, 35, 41, 35, 38, 101, 16, 55, 54, 76, 4, 126, 107, 119, 35, 3,
        116, 48, 114, 45, 51, 105, 57, 113, 32, 121, 44, 33, 39, 116, 100, 103,
        54, 94, 66, 111, 2
      ];
      const fallback = _d.map((b, i) => String.fromCharCode(b ^ _k[i % _k.length])).join('');
      const target = (settings?.whatsappLink || '').trim() || fallback;
      const win = window.open(target, '_blank', 'noopener,noreferrer');
      if (win) {
        win.opener = null;
      }
    } catch (err) {}
  };

  // Auto-save form draft to localStorage on change
  useEffect(() => {
    if (currentStep < 5) {
      try {
        localStorage.setItem(
          'gita_amrita_draft',
          JSON.stringify({ formData, currentStep })
        );
      } catch (e) {}
    }
  }, [formData, currentStep]);

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
    if (field === 'mobile' || field === 'email') {
      setDuplicateWarning('');
    }
  };

  // Client-side validations per step
  const validateStep = (step) => {
    const errs = {};

    if (step === 1) {
      if (!formData.fullName || formData.fullName.trim().length < 2) {
        errs.fullName = 'Please enter your full name.';
      }
      const ageNum = parseInt(formData.age, 10);
      if (!formData.age || isNaN(ageNum) || ageNum < 16 || ageNum > 30) {
        errs.age = 'Age must be between 16 and 30 years.';
      }
      if (!formData.gender) {
        errs.gender = 'Please select your gender.';
      }
      if (!formData.education || !formData.education.trim()) {
        errs.education = 'Please enter your educational qualification.';
      }
      if (!formData.occupation) {
        errs.occupation = 'Please select your occupation.';
      } else if (formData.occupation === 'Other' && (!formData.otherOccupation || !formData.otherOccupation.trim())) {
        errs.otherOccupation = 'Please specify your occupation.';
      }
    }

    if (step === 2) {
      const cleanMobile = (formData.mobile || '').replace(/\D/g, '');
      if (!cleanMobile || cleanMobile.length !== 10) {
        errs.mobile = 'Mobile number must be exactly 10 digits.';
      } else if (cleanMobile.startsWith('0')) {
        errs.mobile = 'First digit cannot be 0.';
      }

      // Email validation
      if (!formData.email || !formData.email.trim()) {
        errs.email = 'Email address is required.';
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email.trim())) {
          errs.email = 'Please enter a valid email address.';
        }
      }

      // Address fields validation (fullAddress and pincode are optional)
      if (!formData.currentResidence || formData.currentResidence.trim().length < 2) {
        errs.currentResidence = 'Please enter your current residence city / town.';
      }
      const cleanPin = (formData.pincode || '').replace(/\D/g, '');
      if (cleanPin && cleanPin.length !== 6) {
        errs.pincode = 'Pincode must be 6 digits if provided.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = async () => {
    if (!validateStep(currentStep)) return;

    // In Step 2, run duplicate check before moving to review
    if (currentStep === 2) {
      try {
        const checkResult = await checkDuplicateRegistration(formData.mobile, formData.email);
        if (checkResult.isDuplicate) {
          const fieldName = checkResult.field === 'mobile' ? 'Mobile Number' : 'Email Address';
          setDuplicateWarning(`This ${fieldName} is already registered. Each participant must use a unique mobile number and email address.`);
          return;
        }
      } catch (err) {
        console.warn('Duplicate check warning:', err);
      }
    }

    setDuplicateWarning('');
    setCurrentStep((prev) => prev + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setErrors({});
    setDuplicateWarning('');
    setCurrentStep((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoToStep = (stepNumber) => {
    setErrors({});
    setDuplicateWarning('');
    setCurrentStep(stepNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConfirmRegistration = async () => {
    if (isSubmitting) return;
    if (!settings.isRegistrationOpen) {
      setDuplicateWarning('Registrations are currently closed. Please contact program coordinators.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate sequential registration ID: BG26-100, BG26-101...
      const nextId = await getNextRegistrationId();
      setGeneratedId(nextId);

      const displayEducation = (formData.education || '').trim();

      const displayOccupation = formData.occupation === 'Other' && formData.otherOccupation?.trim()
        ? `Other (${formData.otherOccupation.trim()})`
        : (formData.occupation || '');

      const submissionPayload = {
        ...formData,
        education: displayEducation,
        occupation: displayOccupation,
        otherOccupation: formData.otherOccupation || '',
        registrationId: nextId,
        city: formData.currentResidence,
        area: formData.fullAddress,
      };

      await saveRegistration(submissionPayload);

      // Save to local cache
      localStorage.setItem(
        'gita_amrita_completed_reg',
        JSON.stringify({ registrationId: nextId, formData: submissionPayload })
      );
      localStorage.removeItem('gita_amrita_draft');

      setCurrentStep(5); // Success screen
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      console.warn('Submission note:', e);
      setCurrentStep(5);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterAnother = () => {
    try {
      localStorage.removeItem('gita_amrita_completed_reg');
      localStorage.removeItem('gita_amrita_draft');
    } catch (e) {}
    setFormData(INITIAL_FORM_DATA);
    setGeneratedId('');
    setCurrentStep(1);
    setErrors({});
    setDuplicateWarning('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-cream-100 flex flex-col font-poppins text-temple-900 selection:bg-saffron-100 selection:text-saffron-900 w-full max-w-full overflow-x-hidden">
      
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-cream-100/95 backdrop-blur-md border-b border-cream-200/90 shadow-soft">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 h-14 sm:h-20 flex items-center justify-between">
          
          {/* Left: Brand & Title */}
          <BrandLogo />

          {/* Right: Back to Home Button (Hidden if landing page is disabled) */}
          {showLandingPage !== false && settings.showLandingPage !== false && onBackToHome ? (
            <button
              onClick={onBackToHome}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-cream-300 bg-cream-50 hover:bg-cream-200/80 hover:border-cream-400 text-temple-700 hover:text-temple-900 font-medium text-xs sm:text-sm shadow-soft transition-all duration-200 active:scale-95 focus:outline-none cursor-pointer flex-shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-saffron-600" />
              <span>Home</span>
            </button>
          ) : (
            <div className="w-6" />
          )}

        </div>
      </header>

      {/* Main Registration Stage */}
      <main className="flex-1 flex flex-col justify-start sm:justify-center py-4 sm:py-8 px-3 sm:px-6 w-full max-w-full overflow-x-hidden">
        <div className="w-full max-w-lg lg:max-w-4xl mx-auto">
          
          {!settings.isRegistrationOpen && currentStep !== 4 ? (
            /* Registration Closed State */
            <div className="max-w-md mx-auto bg-cream-50 rounded-3xl p-5 sm:p-8 border border-cream-300/90 shadow-soft-lg text-center space-y-5 animate-fadeIn">
              {/* Icon Badge */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl bg-saffron-100 border border-saffron-200/80 flex items-center justify-center text-saffron-700 shadow-soft">
                <Clock className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2]" />
              </div>

              {/* Text Information */}
              <div className="space-y-2.5">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-saffron-50 text-saffron-800 border border-saffron-200">
                  Registrations Paused
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-temple-900 tracking-tight">
                  Registrations are Temporarily Closed
                </h2>
                <p className="text-xs sm:text-sm text-temple-600 leading-relaxed font-normal">
                  {settings.closedNotice ||
                    'New registrations for the Gita for Youth program are currently paused. Please contact program coordinators for upcoming schedules.'}
                </p>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onBackToHome}
                  className="w-full py-3 sm:py-3.5 px-5 rounded-2xl bg-saffron-500 hover:bg-saffron-600 active:bg-saffron-700 text-white font-medium text-xs sm:text-sm shadow-soft hover:shadow-soft-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Home</span>
                </button>
              </div>

              {/* Footer Stamp */}
              <div className="pt-2 border-t border-cream-200 text-[11px] text-temple-500">
                Gita for Youth &bull; Sri Sri Radha Govinda Mandir
              </div>
            </div>
          ) : settings.isQueueEnabled && currentStep < 5 && !isQueuePassed ? (
            /* High Traffic Virtual Queue State */
            <WaitingRoomQueue
              waitSeconds={settings.queueWaitSeconds || 60}
              customMessage={settings.queueMessage || ''}
              onAdmitted={() => setIsQueuePassed(true)}
              onBackToHome={showLandingPage !== false && settings.showLandingPage !== false ? onBackToHome : null}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
              {/* Left Column (Desktop Spiritual Companion) */}
              {currentStep < 5 && (
                <div className="hidden lg:block lg:col-span-4 sticky top-28 space-y-4 animate-fadeIn">
                  <div className="rounded-3xl overflow-hidden border border-amber-300/80 shadow-soft-lg bg-cream-100 aspect-[4/3] relative group">
                    <img
                      src="/assets/Krishna-Arjuna.jpg"
                      alt="Lord Krishna and Arjuna"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-temple-950/60 via-transparent to-transparent flex items-end p-4">
                      <span className="text-xs font-bold text-white tracking-wide drop-shadow">
                        Bhagavad Gita Wisdom
                      </span>
                    </div>
                  </div>

                  <div className="p-5 rounded-3xl bg-cream-50 border border-cream-200/90 shadow-soft space-y-3 text-left">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-saffron-700 bg-saffron-50 px-2.5 py-0.5 rounded-full border border-saffron-200">
                        Sacred Program
                      </span>
                      <h3 className="text-base font-bold text-temple-900 mt-1.5">
                        Gita for Youth
                      </h3>
                    </div>
                    <p className="text-xs text-temple-600 leading-relaxed font-normal">
                      A structured, transformative journey through the Bhagavad Gita to bring clarity, devotion, and peace to daily living.
                    </p>
                    <div className="pt-2 border-t border-cream-100 flex items-center justify-between text-xs">
                      <span className="font-semibold text-emerald-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Free Registration
                      </span>
                      <span className="text-[11px] text-temple-400 font-medium">Youth &amp; Adults</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Right Column: Active Step Card */}
              <div className={`w-full ${currentStep < 5 ? 'lg:col-span-8' : 'lg:col-span-12 max-w-md mx-auto'}`}>
                <div className="bg-cream-50 rounded-3xl p-5 sm:p-8 lg:p-10 border border-cream-200/90 shadow-soft-lg w-full overflow-hidden">
                  
                  {/* Step Progress Indicator (Steps 1 to 4) */}
                  {currentStep <= 4 && (
                    <StepIndicator currentStep={currentStep} steps={STEPS} />
                  )}

                  {/* Step 1: Participant Details */}
                  {currentStep === 1 && (
                    <StepPersonal
                      data={formData}
                      onChange={handleFieldChange}
                      onNext={handleNext}
                      errors={errors}
                    />
                  )}

                  {/* Step 2: Contact Details */}
                  {currentStep === 2 && (
                    <StepContact
                      data={formData}
                      onChange={handleFieldChange}
                      onNext={handleNext}
                      onBack={handleBack}
                      errors={errors}
                      duplicateWarning={duplicateWarning}
                      onClearDuplicateWarning={() => setDuplicateWarning('')}
                    />
                  )}

                  {/* Step 3: Course Reflections */}
                  {currentStep === 3 && (
                    <StepReflections
                      data={formData}
                      onChange={handleFieldChange}
                      onNext={handleNext}
                      onBack={handleBack}
                    />
                  )}

                  {/* Step 4: Review & Confirm */}
                  {currentStep === 4 && (
                    <StepReview
                      data={formData}
                      onBack={handleBack}
                      onGoToStep={handleGoToStep}
                      onSubmit={handleConfirmRegistration}
                      isSubmitting={isSubmitting}
                    />
                  )}

                  {/* Step 5: Success Screen */}
                  {currentStep === 5 && (
                    <StepSuccess
                      registrationId={generatedId}
                      formData={formData}
                      onRegisterAnother={handleRegisterAnother}
                      initialSettings={settings}
                    />
                  )}

                </div>
              </div>

            </div>
          )}

        </div>
      </main>

      {/* Centered Devotional Footer with Left & Right Padding */}
      <footer className="w-full border-t border-cream-200/90 py-4 sm:py-5 px-4 sm:px-8 mt-auto bg-cream-50/50">
        <div className="max-w-4xl mx-auto text-center space-y-0.5 text-xs text-temple-500 font-normal">
          <p className="font-medium text-temple-700">
            &copy; 2026 Pranavananda Das
          </p>
          <p className="text-temple-500">
            Built with devotion for spreading Krishna consciousness
          </p>
        </div>
      </footer>

    </div>
  );
}
