/* ===================================================
   Shiny Shades - Announcement Bar
   FIXED VERSION
   - Fully visible on website
   - Works with floating navbar
   - Admin editable
   - Marquee / Fade / Static modes
   - Dismiss button
   - Better z-index handling
   - Safer TypeScript support
   - No feature removed
   =================================================== */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useContentStore } from '@/store/contentStore';

export const AnnouncementBar: React.FC = () => {
  const { content } = useContentStore();

  const [visible, setVisible] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Safe access
  const announcement = content?.announcement;

  // Filter empty messages safely
  const messages =
    announcement?.messages?.filter((m: string) => m?.trim()) || [];

  // Rotate messages for FADE mode
  useEffect(() => {
    if (
      !announcement?.enabled ||
      messages.length <= 1 ||
      announcement.animation !== 'fade'
    ) {
      return;
    }

    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % messages.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [
    messages.length,
    announcement?.enabled,
    announcement?.animation,
  ]);

  // Hide completely if disabled
  if (
    !announcement?.enabled ||
    messages.length === 0 ||
    !visible
  ) {
    return null;
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] w-full overflow-hidden"
      style={{
        backgroundColor: announcement.bgColor || '#B76E79',
        color: announcement.textColor || '#FFFFFF',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-center h-9 md:h-10">

          {/* =========================================
              MARQUEE MODE
              ========================================= */}
          {announcement.animation === 'marquee' && (
            <div className="flex whitespace-nowrap marquee-animation">
              {[...messages, ...messages, ...messages].map((msg, i) => (
                <span
                  key={i}
                  className="mx-8 flex items-center gap-2 text-xs md:text-sm tracking-wide"
                  style={{
                    fontWeight: announcement.bold ? 600 : 500,
                  }}
                >
                  ✨ {msg}
                </span>
              ))}
            </div>
          )}

          {/* =========================================
              FADE MODE
              ========================================= */}
          {announcement.animation === 'fade' && (
            <div className="relative flex h-full w-full items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.p
                  key={currentIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4 }}
                  className="px-8 text-center text-xs md:text-sm tracking-wide"
                  style={{
                    fontWeight: announcement.bold ? 600 : 500,
                  }}
                >
                  ✨ {messages[currentIndex]}
                </motion.p>
              </AnimatePresence>
            </div>
          )}

          {/* =========================================
              STATIC MODE
              ========================================= */}
          {announcement.animation === 'static' && (
            <p
              className="px-8 text-center text-xs md:text-sm tracking-wide"
              style={{
                fontWeight: announcement.bold ? 600 : 500,
              }}
            >
              ✨ {messages.join('  •  ')}
            </p>
          )}

          {/* =========================================
              CLOSE BUTTON
              ========================================= */}
          {announcement.dismissible && (
            <button
              onClick={() => setVisible(false)}
              className="absolute right-2 rounded-full p-1 transition-colors hover:bg-white/20"
              aria-label="Close announcement"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* =========================================
          MARQUEE ANIMATION CSS
          ========================================= */}
      <style>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }

          100% {
            transform: translateX(-33.333%);
          }
        }

        .marquee-animation {
          animation: marquee 25s linear infinite;
        }

        .marquee-animation:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};