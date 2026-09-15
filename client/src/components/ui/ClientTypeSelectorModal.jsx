import React from 'react';
import { motion } from 'framer-motion';

import { UserRound, ShieldCheck, ArrowRight, Briefcase } from 'lucide-react';

import Modal3D from '@/components/ui/Modal3D';

export default function ClientTypeSelectorModal({ open, onClose, onSelect }) {
  return (
    <Modal3D open={open} onClose={onClose} title='Create prospective client'>
      <div className='space-y-6'>
        <div>
          <h3 className='text-lg font-semibold text-[color:var(--text-primary)]'>
            Choose access mode
          </h3>

          <p className='text-sm text-[color:var(--text-muted)] mt-1'>
            Access mode and lifecycle are independent. A new record starts as Prospective.
          </p>
        </div>

        {/* PROSPECT */}
        <motion.button
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect('prospect')}
          className='
            w-full
            text-left
            rounded-2xl
            border
            border-emerald-500/30
            bg-emerald-500/5
            hover:bg-emerald-500/10
            transition-all
            p-5
          '
        >
          <div className='flex items-start justify-between'>
            <div className='flex gap-4'>
              <div
                className='
                  h-12
                  w-12
                  rounded-xl
                  bg-emerald-500/15
                  flex
                  items-center
                  justify-center
                '
              >
                <UserRound size={24} className='text-emerald-500' />
              </div>

              <div>
                <h4 className='font-semibold text-base'>Portal-enabled</h4>

                <p className='text-sm text-[color:var(--text-muted)] mt-1'>
                  Controlled portal login, kept separate from client lifecycle status.
                </p>

                <div className='mt-3 flex flex-wrap gap-2'>
                  <span
                    className='
                      px-2 py-1
                      rounded-lg
                      text-xs
                      bg-emerald-500/10
                    '
                  >
                    Controlled portal login
                  </span>

                  <span
                    className='
                      px-2 py-1
                      rounded-lg
                      text-xs
                      bg-emerald-500/10
                    '
                  >
                    Prospective lifecycle
                  </span>

                  <span
                    className='
                      px-2 py-1
                      rounded-lg
                      text-xs
                      bg-emerald-500/10
                    '
                  >
                    Not accepted instructions
                  </span>
                </div>
              </div>
            </div>

            <ArrowRight size={20} />
          </div>
        </motion.button>

        {/* ASSISTED CLIENT */}
        <motion.button
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect('assisted')}
          className='
            w-full
            text-left
            rounded-2xl
            border
            border-blue-500/30
            bg-blue-500/5
            hover:bg-blue-500/10
            transition-all
            p-5
          '
        >
          <div className='flex items-start justify-between'>
            <div className='flex gap-4'>
              <div
                className='
                  h-12
                  w-12
                  rounded-xl
                  bg-blue-500/15
                  flex
                  items-center
                  justify-center
                '
              >
                <Briefcase size={24} className='text-blue-500' />
              </div>

              <div>
                <h4 className='font-semibold text-base'>Firm-managed</h4>

                <p className='text-sm text-[color:var(--text-muted)] mt-1'>
                  Internal record with no portal login. This is the normal default for a new prospective client.
                </p>

                <div className='mt-3 flex flex-wrap gap-2'>
                  <span
                    className='
                      px-2 py-1
                      rounded-lg
                      text-xs
                      bg-blue-500/10
                    '
                  >
                    No portal login
                  </span>

                  <span
                    className='
                      px-2 py-1
                      rounded-lg
                      text-xs
                      bg-blue-500/10
                    '
                  >
                    Prospective lifecycle
                  </span>

                  <span
                    className='
                      px-2 py-1
                      rounded-lg
                      text-xs
                      bg-blue-500/10
                    '
                  >
                    Staff assisted
                  </span>
                </div>
              </div>
            </div>

            <ArrowRight size={20} />
          </div>
        </motion.button>

        {/* FOOTER */}
        <div
          className='
            rounded-xl
            border
            border-[color:var(--border)]
            bg-[color:var(--surface)]
            p-4
            flex
            gap-3
          '
        >
          <ShieldCheck size={18} className='text-green-500 mt-0.5' />

          <div>
            <p className='text-sm font-medium'>Recommended Workflow</p>

            <p className='text-xs text-[color:var(--text-muted)] mt-1'>
              Lifecycle values are Prospective, Official and Archived. Select Firm-managed unless controlled portal access is deliberately required.
            </p>
          </div>
        </div>
      </div>
    </Modal3D>
  );
}
