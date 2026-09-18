import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import StepIndicator from './StepIndicator';
import StepPersonal from './StepPersonal';
import StepContact from './StepContact';
import StepBackground from './StepBackground';
import StepBatch from './StepBatch';
import StepReview from './StepReview';
import StepSuccess from './StepSuccess';
import { saveRegistration, generateRegistrationId, checkDuplicateRegistration } from '../../firebase';

const STEPS = [
  { id: 1, title: 'Personal Details', shortTitle: 'Profile' },
  { id: 2, title: 'Contact & Location', shortTitle: 'Contact' },
  { id: 3, title: 'Your Background', shortTitle: 'Background' },
  { id: 4, title: 'Program Details', shortTitle: 'Batch' },
  { id: 5, title: 'Review & Confirm', shortTitle: 'Review' },
];

const INITIAL_FORM_DATA = {
  fullName: '',
  age: '',
  gender: 'Male',
  countryCode: '+91',
  mobile: '',
  email: '',
  city: '',
  area: '',
  occupation: 'Student',
  gitaExperience: 'Beginner / First time',
  batchId: 'bg-18-offline-7pm',
  batchTitle: 'Bhagavad Gita',
  batchSchedule: 'Daily • 7:00 PM',
  batchMode: 'Offline',
  referralSource: 'WhatsApp',
};

export default function RegistrationFlow({ onBackToHome, onGoToDashboard }) {
  // Initialize state with cache support
  const [currentStep, setCurrentStep] = useState(() => {
    try {
      const completed = localStorage.getItem('gita_amrita_completed_reg');
      if (completed) return 6; // Show success screen if already registered

      const draft = localStorage.getItem('gita_amrita_draft');
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.currentStep && parsed.currentStep >= 1 && parsed.currentStep <= 5) {
          return parsed.currentStep;
        }
      }
    } catch (e) {}
    return 1;
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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [errors, setErrors] = useState({});

  // Auto-save form draft and step to localStorage on change
  useEffect(() => {
    if (currentStep < 6) {
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
      if (!formData.age || isNaN(ageNum) || ageNum < 5 || ageNum > 110) {
        errs.age = 'Please enter a valid age (5 to 110).';
      }
      if (!formData.gender) {
        errs.gender = 'Please select your gender.';
      }
    }

    if (step === 2) {
      const cleanMobile = (formData.mobile || '').replace(/\D/g, '');
      if (!cleanMobile || cleanMobile.length < 7 || cleanMobile.length > 15) {
        errs.mobile = 'Please enter a valid mobile number.';
      }
      
      // Email is MANDATORY
      if (!formData.email || !formData.email.trim()) {
        errs.email = 'Email address is required.';
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email.trim())) {
          errs.email = 'Please enter a valid email address (e.g. name@example.com).';
        }
      }

      if (!formData.city || formData.city.trim().length < 2) {
        errs.city = 'Please enter your city / town.';
      }
      if (!formData.area || formData.area.trim().length < 2) {
        errs.area = 'Please enter your area or locality.';
      }
    }

    if (step === 3) {
      if (!formData.occupation) {
        formData.occupation = 'Student';
      }
      if (!formData.gitaExperience) {
        formData.gitaExperience = 'Beginner / First time';
      }
    }

    if (step === 4) {
      if (!formData.batchId) {
        errs.batchId = 'Please select a preferred batch.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = async () => {
    if (!validateStep(currentStep)) return;

    // In Step 2, run duplicate check before moving forward
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
    // Final duplicate check
    try {
      const checkResult = await checkDuplicateRegistration(formData.mobile, formData.email);
      if (checkResult.isDuplicate) {
        const fieldName = checkResult.field === 'mobile' ? 'Mobile Number' : 'Email Address';
        setDuplicateWarning(`This ${fieldName} is already registered. Please go back to Step 2 to update it.`);
        setCurrentStep(2);
        return;
      }
    } catch (e) {}

    setIsSubmitting(true);
    const newId = generateRegistrationId();
    setGeneratedId(newId);

    const submissionPayload = {
      ...formData,
      registrationId: newId,
    };

    try {
      await saveRegistration(submissionPayload);
      // Cache completed registration record so refresh remembers the user's registration
      localStorage.setItem(
        'gita_amrita_completed_reg',
        JSON.stringify({ registrationId: newId, formData: submissionPayload })
      );
      // Remove in-progress draft
      localStorage.removeItem('gita_amrita_draft');
    } catch (e) {
      console.warn('Submission note:', e);
    } finally {
      setIsSubmitting(false);
      setCurrentStep(6); // Success step
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
    <div className="min-h-screen bg-cream-100 flex flex-col font-poppins text-temple-900 selection:bg-saffron-100 selection:text-saffron-900">
      
      {/* Top Header - Beautiful, Devotional & Well-Proportioned */}
      <header className="sticky top-0 z-30 bg-cream-100/95 backdrop-blur-md border-b border-cream-200/90 shadow-soft">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          
          {/* Left: ISKCON Crest & Title Group */}
          <button
            onClick={onBackToHome}
            className="flex items-center gap-3 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 rounded-xl p-1"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white p-1 border border-cream-300 shadow-soft flex items-center justify-center transition-transform group-hover:scale-105">
              <img
                src="/assets/iskcon_logo.webp"
                alt="ISKCON Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="text-base sm:text-lg font-bold text-temple-900 leading-tight block group-hover:text-saffron-600 transition-colors">
                Gita Amrita
              </span>
              <span className="text-[11px] sm:text-xs font-normal text-temple-600 tracking-wide block">
                ISKCON Adilabad
              </span>
            </div>
          </button>

          {/* Right: Refined "Back to Home" Pill Button */}
          <button
            onClick={onBackToHome}
            className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full border border-cream-300 bg-cream-50 hover:bg-cream-200/80 hover:border-cream-400 text-temple-700 hover:text-temple-900 font-medium text-xs sm:text-sm shadow-soft transition-all duration-200 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500"
          >
            <ArrowLeft className="w-4 h-4 text-saffron-600" />
            <span>Back to Home</span>
          </button>

        </div>
      </header>

      {/* Main Registration Stage */}
      <main className="flex-1 py-6 sm:py-10 px-3 sm:px-6 flex items-center justify-center">
        <div className="w-full max-w-lg lg:max-w-4xl mx-auto">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column (Desktop Spiritual Companion) */}
            {currentStep < 6 && (
              <div className="hidden lg:block lg:col-span-4 sticky top-28 space-y-4">
                <div className="rounded-2xl overflow-hidden border border-cream-300 shadow-soft bg-cream-200 aspect-[4/3]">
                  <img
                    src="/assets/Krishna-Arjuna.jpg"
                    alt="Lord Krishna and Arjuna"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 rounded-2xl bg-cream-50 border border-cream-200 space-y-2">
                  <h3 className="text-sm font-bold text-temple-900">
                    Gita Amrita
                  </h3>
                  <p className="text-xs text-temple-600 leading-relaxed font-normal">
                    A humble journey to understand the timeless wisdom of the Bhagavad Gita and bring its teachings into our daily lives.
                  </p>
                  <p className="text-[11px] font-medium text-saffron-700 pt-1">
                    Free Registration &bull; ISKCON Adilabad
                  </p>
                </div>
              </div>
            )}

            {/* Right Column: Active Step Card */}
            <div className={`w-full ${currentStep < 6 ? 'lg:col-span-8' : 'lg:col-span-12 max-w-md mx-auto'}`}>
              <div className="bg-cream-100 rounded-3xl p-5 sm:p-8 lg:p-10 border border-cream-200/90 shadow-soft">
                
                {/* Step Progress Indicator (Steps 1 to 5) */}
                {currentStep <= 5 && (
                  <StepIndicator currentStep={currentStep} steps={STEPS} />
                )}

                {/* Form Steps */}
                {currentStep === 1 && (
                  <StepPersonal
                    data={formData}
                    onChange={handleFieldChange}
                    onNext={handleNext}
                    errors={errors}
                  />
                )}

                {currentStep === 2 && (
                  <StepContact
                    data={formData}
                    onChange={handleFieldChange}
                    onNext={handleNext}
                    onBack={handleBack}
                    errors={errors}
                    duplicateWarning={duplicateWarning}
                    onClearDuplicateWarning={() => setDuplicateWarning('')}
                    onGoToLogin={onGoToDashboard}
                  />
                )}

                {currentStep === 3 && (
                  <StepBackground
                    data={formData}
                    onChange={handleFieldChange}
                    onNext={handleNext}
                    onBack={handleBack}
                  />
                )}

                {currentStep === 4 && (
                  <StepBatch
                    data={formData}
                    onChange={handleFieldChange}
                    onNext={handleNext}
                    onBack={handleBack}
                    errors={errors}
                  />
                )}

                {currentStep === 5 && (
                  <StepReview
                    data={formData}
                    onBack={handleBack}
                    onGoToStep={handleGoToStep}
                    onSubmit={handleConfirmRegistration}
                    isSubmitting={isSubmitting}
                  />
                )}

                {currentStep === 6 && (
                  <StepSuccess
                    registrationId={generatedId}
                    formData={formData}
                    onBackToHome={onBackToHome}
                    onGoToDashboard={() => onGoToDashboard && onGoToDashboard({ ...formData, registrationId: generatedId })}
                    onRegisterAnother={handleRegisterAnother}
                  />
                )}

              </div>
            </div>

          </div>

        </div>
      </main>

      {/* Gentle Footer */}
      <footer className="py-6 text-center text-xs text-temple-500 border-t border-cream-200">
        <p>&copy; {new Date().getFullYear()} Gita Amrita &bull; ISKCON Adilabad</p>
      </footer>

    </div>
  );
}
