import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const testimonials = [
  {
    name: 'Santhu Goud',
    text: 'The 18-day Gita journey brought a change in me that I never expected. I continue listening to the teachings and trying to follow them in my daily life.',
  },
  {
    name: 'Batthula Abhiram',
    text: 'We feel blessed to have a guide like you. May Krishna give you the strength and health to continue serving and sharing Krishna consciousness.',
  },
  {
    name: 'Ram Venky',
    text: 'The Gita should reach people in every mother tongue. Its teachings are as important for life as education is for our career.',
  },
  {
    name: 'Vani Yasala',
    text: 'You explained all 18 chapters so beautifully and clearly. We feel blessed to have listened to the teachings and verses.',
  },
  {
    name: 'Pavan Reddy',
    text: 'It was my first time listening to the Bhagavad Gita for 18 days. I am very happy and grateful to have experienced this journey.',
  },
  {
    name: 'Vijaya Veeramalli',
    text: 'Through your teachings, many people have understood the Bhagavad Gita. The classes were simple and easy to understand for people of all ages.',
  },
];

const TOTAL = testimonials.length; // 6

export default function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % TOTAL);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + TOTAL) % TOTAL);
  }, []);

  // Autoplay every 5s: Pauses while user holds down or hovers
  useEffect(() => {
    if (isHolding || isHovered) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(timer);
  }, [isHolding, isHovered, nextSlide]);

  // Touch Swipe Handlers
  const handleTouchStart = (e) => {
    setIsHolding(true);
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    setIsHolding(false);
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 40) {
      nextSlide();
    } else if (diff < -40) {
      prevSlide();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Calculates the relative stage offset for each card relative to currentIndex
  const getCardStyle = (index) => {
    let offset = index - currentIndex;
    // Circular wrap for 6 items (-2 to +3)
    if (offset > 3) offset -= TOTAL;
    if (offset < -2) offset += TOTAL;

    if (offset === 0) {
      // Active center card
      return {
        transform: 'translateX(-50%) scale(1)',
        opacity: 1,
        zIndex: 20,
        pointerEvents: 'auto',
      };
    } else if (offset === 1) {
      // Right peek card
      return {
        transform: 'translateX(calc(-50% + 105%)) scale(0.92)',
        opacity: 0.45,
        zIndex: 10,
        pointerEvents: 'auto',
      };
    } else if (offset === -1) {
      // Left peek card
      return {
        transform: 'translateX(calc(-50% - 105%)) scale(0.92)',
        opacity: 0.45,
        zIndex: 10,
        pointerEvents: 'auto',
      };
    } else if (offset > 1) {
      // Off-screen right
      return {
        transform: 'translateX(calc(-50% + 210%)) scale(0.85)',
        opacity: 0,
        zIndex: 0,
        pointerEvents: 'none',
      };
    } else {
      // Off-screen left
      return {
        transform: 'translateX(calc(-50% - 210%)) scale(0.85)',
        opacity: 0,
        zIndex: 0,
        pointerEvents: 'none',
      };
    }
  };

  return (
    <section id="experiences" className="py-16 sm:py-24 bg-cream-50 border-t border-cream-200/70 overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-10 sm:mb-14">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-temple-900">
            Our Previous Journey
          </h2>
          <div className="w-16 h-1 bg-saffron-500 mx-auto rounded-full" />
          <p className="text-base sm:text-lg text-temple-700 leading-relaxed font-normal pt-1">
            Many people have already experienced this journey with us. Here are a few words shared by participants.
          </p>
        </div>

        {/* Carousel Viewport Container */}
        <div
          className="relative w-full overflow-hidden select-none py-2"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => {
            setIsHovered(false);
            setIsHolding(false);
          }}
          onMouseDown={() => setIsHolding(true)}
          onMouseUp={() => setIsHolding(false)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={() => setIsHolding(false)}
        >
          {/* Stage Container holding absolute positioned cards */}
          <div className="relative w-full h-[220px] sm:h-[195px]">
            {testimonials.map((item, index) => {
              const style = getCardStyle(index);
              const isActive = index === currentIndex;

              return (
                <div
                  key={index}
                  onClick={() => {
                    if (!isActive) setCurrentIndex(index);
                  }}
                  style={style}
                  className="absolute top-0 left-1/2 w-[84%] sm:w-[64%] md:w-[60%] max-w-[560px] h-[200px] sm:h-[180px] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer"
                >
                  <div
                    className={`h-full rounded-2xl p-5 sm:p-7 border flex flex-col justify-between transition-colors duration-300 ${
                      isActive
                        ? 'bg-cream-100 border-cream-300 shadow-soft-md ring-1 ring-saffron-500/25'
                        : 'bg-cream-100/70 border-cream-200 shadow-soft hover:opacity-75'
                    }`}
                  >
                    {/* Quote Text */}
                    <p className="text-sm sm:text-base text-temple-800 leading-relaxed italic font-normal">
                      "{item.text}"
                    </p>

                    {/* Author Attribution */}
                    <div className="pt-3 mt-2 border-t border-cream-200/70">
                      <h4 className="text-sm font-semibold text-temple-900 tracking-tight">
                        — {item.name}
                      </h4>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Navigation Controls: Prev / Next Buttons & Pagination Dots */}
        <div className="flex items-center justify-between max-w-xs sm:max-w-sm mx-auto mt-6 px-4">
          <button
            onClick={prevSlide}
            className="p-2 rounded-full bg-cream-100 hover:bg-cream-200 text-temple-700 hover:text-temple-900 border border-cream-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 shadow-sm"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Real Pagination Dots (0 to 5) */}
          <div className="flex items-center space-x-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`transition-all duration-300 rounded-full ${
                  index === currentIndex
                    ? 'w-6 h-2 bg-saffron-500'
                    : 'w-2 h-2 bg-cream-300 hover:bg-temple-400'
                }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>

          <button
            onClick={nextSlide}
            className="p-2 rounded-full bg-cream-100 hover:bg-cream-200 text-temple-700 hover:text-temple-900 border border-cream-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 shadow-sm"
            aria-label="Next testimonial"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

      </div>
    </section>
  );
}
