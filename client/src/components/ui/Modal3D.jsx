import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Modal3D({ open, onClose, title, children }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className='
            fixed inset-0 z-50
            flex items-center justify-center
            bg-black/40
            backdrop-blur-sm
          '
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* 3D Floating Card */}
          <motion.div
            className='
              w-full max-w-2xl
              rounded-2xl
              bg-[color:var(--surface)]
              border border-[color:var(--border)]
              shadow-[0_30px_80px_rgba(0,0,0,0.35)]
              p-6
              origin-center
            '
            onClick={(e) => e.stopPropagation()}
            initial={{
              opacity: 0,
              scale: 0.85,
              rotateX: 20,
              y: 40,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              rotateX: 0,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.9,
              rotateX: 15,
              y: 30,
            }}
            transition={{
              type: 'spring',
              stiffness: 260,
              damping: 20,
            }}
            whileHover={{
              scale: 1.01,
              rotateX: 2,
              rotateY: -1,
              boxShadow: '0 40px 100px rgba(0,0,0,0.45)',
            }}
            style={{
              transformStyle: 'preserve-3d',
              perspective: 1200,
            }}
          >
            {/* HEADER */}
            {title && (
              <motion.h2
                className='
                  text-xl font-semibold mb-4
                  text-[color:var(--text-primary)]
                '
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
              >
                {title}
              </motion.h2>
            )}

            {/* CONTENT */}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
