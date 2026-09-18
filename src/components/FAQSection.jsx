import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: 'Who can join the Gita Amrita program?',
    answer: 'Anyone who sincerely wishes to learn and understand the Bhagavad Gita can join. No previous knowledge is required unless mentioned for a specific batch.',
  },
  {
    question: 'Do I need to know Sanskrit?',
    answer: 'No. The teachings will be explained in simple and easy-to-understand language.',
  },
  {
    question: 'How long is the program?',
    answer: 'The duration and schedule will be shared for each new batch.',
  },
  {
    question: 'Are the classes online or offline?',
    answer: 'This depends on the batch. Please check the program details before registering.',
  },
  {
    question: 'Do I need to attend every class?',
    answer: 'Regular attendance is encouraged because each class builds on the previous one.',
  },
  {
    question: 'Will study materials be provided?',
    answer: 'If materials are provided for the batch, they will be available to registered participants.',
  },
  {
    question: 'Is there a registration fee?',
    answer: 'Please check the details of the current batch for registration information.',
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-16 sm:py-24 bg-cream-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-4 mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-temple-900">
            Frequently Asked Questions
          </h2>
          <div className="w-16 h-1 bg-saffron-500 mx-auto rounded-full" />
        </div>

        {/* Accordion List */}
        <div className="space-y-3.5">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="bg-cream-50 rounded-2xl border border-cream-200/90 overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full text-left px-5 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 hover:bg-cream-100/50 transition-colors"
                  aria-expanded={isOpen}
                >
                  <span className="text-base sm:text-lg font-medium text-temple-900 pr-2">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-saffron-600 flex-shrink-0 transition-transform duration-300 ${
                      isOpen ? 'transform rotate-180' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-1 text-sm sm:text-base text-temple-700 leading-relaxed border-t border-cream-200/60 font-normal">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
