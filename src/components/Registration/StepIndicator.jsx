import React from 'react';
import { Check } from 'lucide-react';

export default function StepIndicator({ currentStep, steps }) {
  return (
    <div className="w-full pb-6 sm:pb-8 pt-1">
      <div className="flex items-center justify-between max-w-sm sm:max-w-md mx-auto relative px-2">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = currentStep > stepNumber;
          const isActive = currentStep === stepNumber;

          return (
            <React.Fragment key={step.id}>
              {/* Step Circle & Label */}
              <div className="flex flex-col items-center relative z-10 flex-shrink-0">
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold transition-all duration-200 ${
                    isCompleted
                      ? 'bg-saffron-500 text-white shadow-2xs'
                      : isActive
                      ? 'bg-saffron-500 text-white shadow-soft ring-2 ring-saffron-500/20'
                      : 'bg-white text-temple-400 border border-cream-300'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 text-white stroke-[2.5]" />
                  ) : (
                    <span>{stepNumber}</span>
                  )}
                </div>
                
                <span
                  className={`text-[10px] sm:text-xs mt-1.5 transition-colors text-center tracking-wide ${
                    isActive
                      ? 'text-saffron-700 font-semibold'
                      : isCompleted
                      ? 'text-temple-700 font-medium'
                      : 'text-temple-400 font-normal'
                  }`}
                >
                  {step.shortTitle}
                </span>
              </div>

              {/* Connecting Line between steps */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-[2px] mx-2 -mt-4 transition-colors duration-200 relative min-w-[20px] rounded-full overflow-hidden bg-cream-200">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      currentStep > stepNumber
                        ? 'w-full bg-saffron-500'
                        : currentStep === stepNumber
                        ? 'w-1/2 bg-saffron-500'
                        : 'w-0'
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
