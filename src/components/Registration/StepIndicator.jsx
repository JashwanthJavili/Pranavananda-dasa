import React from 'react';
import { Check } from 'lucide-react';

export default function StepIndicator({ currentStep, steps }) {
  return (
    <div className="w-full pb-6 pt-1">
      {/* Mobile-first clean horizontal step line */}
      <div className="flex items-center justify-between max-w-sm sm:max-w-lg mx-auto relative px-1">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = currentStep > stepNumber;
          const isActive = currentStep === stepNumber;

          return (
            <React.Fragment key={step.id}>
              {/* Step Circle & Label */}
              <div className="flex flex-col items-center relative z-10 flex-shrink-0">
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-semibold transition-all duration-300 ${
                    isCompleted
                      ? 'bg-saffron-500 text-white shadow-soft'
                      : isActive
                      ? 'bg-saffron-50 border-2 border-saffron-500 text-saffron-700 shadow-soft'
                      : 'bg-cream-200/80 text-temple-400 border border-cream-300'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white stroke-[2.5]" />
                  ) : (
                    <span>0{stepNumber}</span>
                  )}
                </div>
                
                <span
                  className={`text-[9px] sm:text-[10px] md:text-[11px] font-medium mt-1 transition-colors text-center ${
                    isActive
                      ? 'text-saffron-700 font-semibold'
                      : isCompleted
                      ? 'text-temple-700'
                      : 'text-temple-400'
                  }`}
                >
                  {step.shortTitle}
                </span>
              </div>

              {/* Connecting Line between steps */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-[2px] mx-1 sm:mx-1.5 -mt-3.5 transition-colors duration-300 relative min-w-[12px]">
                  <div
                    className={`h-full w-full rounded-full ${
                      currentStep > stepNumber
                        ? 'bg-saffron-500'
                        : 'bg-cream-300'
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
