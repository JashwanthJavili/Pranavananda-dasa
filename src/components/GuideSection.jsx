import React from 'react';
import { Users, Video, Eye } from 'lucide-react';

export default function GuideSection() {
  const stats = [
    { label: 'Subscribers', value: '1.02M', icon: Users },
    { label: 'Videos', value: '738', icon: Video },
    { label: 'Views', value: '204,153,391', icon: Eye },
  ];

  return (
    <section id="guide" className="py-16 sm:py-20 bg-cream-100 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-temple-900 leading-tight">
            Under the Guidance of HG Pranavananda Prabhuji
          </h2>
          <div className="w-16 h-1 bg-saffron-500 mx-auto rounded-full" />
        </div>

        {/* Guide Profile Card */}
        <div className="bg-cream-50 rounded-3xl p-6 sm:p-10 border border-cream-200 shadow-soft-md">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 sm:gap-10">
            
            {/* Portrait */}
            <div className="flex-shrink-0">
              <div className="relative w-44 h-52 sm:w-52 sm:h-64 rounded-2xl overflow-hidden shadow-soft border-2 border-cream-300/90 bg-cream-200">
                <img
                  src="/assets/prabhuji.jpg"
                  alt="HG Pranavananda Prabhuji"
                  className="w-full h-full object-cover object-top"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Content & Stats */}
            <div className="flex-1 text-center sm:text-left space-y-5">
              <p className="text-base sm:text-lg text-temple-700 leading-relaxed font-normal">
                With a heart dedicated to sharing Krishna's teachings, HG Pranavananda Prabhuji guides seekers through the timeless wisdom of the Bhagavad Gita in a simple and relatable way. He is currently rendering his dedicated seva at ISKCON Edulapuram (Adilabad).
              </p>

              {/* YouTube / Community Stats */}
              <div className="pt-2">
                <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-4 border-t border-cream-200">
                  {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div
                        key={stat.label}
                        className="bg-cream-100/90 rounded-xl p-3 sm:p-4 border border-cream-200/80 text-center flex flex-col items-center justify-center"
                      >
                        <Icon className="w-4 h-4 text-saffron-600 mb-1 opacity-80" />
                        <span className="text-sm sm:text-lg font-bold text-temple-900 tracking-tight">
                          {stat.value}
                        </span>
                        <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-temple-500 mt-0.5">
                          {stat.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
