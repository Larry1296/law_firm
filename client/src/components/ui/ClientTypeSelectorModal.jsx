import React from 'react';
import { motion } from 'framer-motion';

import { UserRound, ShieldCheck, ArrowRight, Briefcase } from 'lucide-react';

import Modal3D from '@/components/ui/Modal3D';

export default function ClientTypeSelectorModal({ open, onClose, onSelect }) {
  return (
    <Modal3D open={open} onClose={onClose} title='Create New Client'>
      <div className='space-y-6'>
        <div>
          <h3 className='text-lg font-semibold text-[color:var(--text-primary)]'>
            Choose Client Type
          </h3>

          <p className='text-sm text-[color:var(--text-muted)] mt-1'>
            Select how this client will interact with your law firm.
          </p>
        </div>

        {/* PORTAL CLIENT */}
        <motion.button
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect('portal')}
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
                <h4 className='font-semibold text-base'>Portal Client</h4>

                <p className='text-sm text-[color:var(--text-muted)] mt-1'>
                  This client receives portal access and can log into the
                  system.
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
                    Email Required
                  </span>

                  <span
                    className='
                      px-2 py-1
                      rounded-lg
                      text-xs
                      bg-emerald-500/10
                    '
                  >
                    Password Required
                  </span>

                  <span
                    className='
                      px-2 py-1
                      rounded-lg
                      text-xs
                      bg-emerald-500/10
                    '
                  >
                    Client Login Access
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
                <h4 className='font-semibold text-base'>Assisted Client</h4>

                <p className='text-sm text-[color:var(--text-muted)] mt-1'>
                  Internal client record only. The client cannot log into the
                  portal.
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
                    No User Account
                  </span>

                  <span
                    className='
                      px-2 py-1
                      rounded-lg
                      text-xs
                      bg-blue-500/10
                    '
                  >
                    No Login Access
                  </span>

                  <span
                    className='
                      px-2 py-1
                      rounded-lg
                      text-xs
                      bg-blue-500/10
                    '
                  >
                    Firm Managed
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
              Use Portal Clients for individuals who need access to documents,
              case updates and billing. Use Assisted Clients for walk-ins,
              consultations and clients managed entirely by firm staff.
            </p>
          </div>
        </div>
      </div>
    </Modal3D>
  );
}
