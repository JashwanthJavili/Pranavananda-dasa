import React from 'react';

export default function AboutSection() {
  const pillars = [
    {
      step: '01',
      title: 'LEARN',
      description: 'Understand the teachings of the Bhagavad Gita in simple words.',
    },
    {
      step: '02',
      title: 'REFLECT',
      description: 'Take time to understand how these teachings connect with our daily life.',
    },
    {
      step: '03',
      title: 'PRACTICE',
      description: 'Learn to bring these teachings into our thoughts, actions and choices.',
    },
  ];

  return (
    <section id="about" className="py-12 sm:py-16 bg-cream-50 border-t border-b border-cream-200/70">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-xl mx-auto space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-temple-900">
            About the Program
          </h2>
          <div className="w-12 h-1 bg-saffron-500 mx-auto rounded-full" />
        </div>

        {/* Narrative Paragraphs - Compact & Clean */}
        <div className="mt-6 max-w-2xl mx-auto text-center space-y-3 text-base text-temple-700 leading-relaxed font-normal">
          <p>
            Bhagavad Gita is a timeless guide that helps us understand life, our duties, our challenges and our relationship with the Supreme.
          </p>
          <p className="text-temple-900 font-medium">
            Gita for Youth is a humble effort to share the teachings of the Bhagavad Gita in a simple and practical way, so that everyone can understand them and apply them in daily life.
          </p>
        </div>

        {/* 3 Pillars: Learn, Reflect, Practice - Simple, clean, compact row */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {pillars.map((pillar) => (
            <div
              key={pillar.title}
              className="bg-cream-100/90 rounded-xl p-5 border border-cream-200 shadow-soft text-left flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold tracking-widest text-saffron-600 uppercase">
                  {pillar.title}
                </span>
                <span className="text-xs font-medium text-temple-400">
                  {pillar.step}
                </span>
              </div>
              <p className="text-sm text-temple-700 leading-relaxed">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
