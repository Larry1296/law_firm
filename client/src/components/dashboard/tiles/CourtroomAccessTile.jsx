import { Link2, Video, ExternalLink, Radio } from 'lucide-react';

import DashboardTile from '@/components/dashboard/DashboardTile';
import FloatingInput from '@/components/ui/FloatingInput';

export default function CourtroomAccessTile() {
  const sessions = [
    {
      id: 1,
      court: 'High Court - Nairobi',
      case: 'ELC/2026/0143',
      status: 'Live',
    },
    {
      id: 2,
      court: 'Milimani Court',
      case: 'CR/2026/0881',
      status: 'Waiting',
    },
    {
      id: 3,
      court: 'Virtual Hearing Room',
      case: 'EMP/2026/0021',
      status: 'Scheduled',
    },
  ];

  const statusStyles = {
    Live: 'bg-emerald-900/30 text-emerald-100 border-emerald-300/20',
    Waiting: 'bg-amber-900/30 text-amber-100 border-amber-300/20',
    Scheduled: 'bg-blue-900/30 text-blue-100 border-blue-300/20',
  };

  return (
    <DashboardTile size='large' variant='courtroom'>
      <div className='h-full flex flex-col'>
        {/* HEADER */}
        <div className='mb-6 flex min-w-0 items-start justify-between gap-3 sm:gap-4'>
          <div className='flex items-center gap-4'>
            <div className='p-3 rounded-xl bg-black/15 backdrop-blur-sm'>
              <Video size={24} />
            </div>

            <div>
              <h3
                className='
              text-2xl
              font-black
              tracking-wide
              text-yellow-900
              drop-shadow-md
  '
              >
                Courtroom Access
              </h3>

              <p className='text-sm font-medium text-white/90'>
                Manage virtual hearings and courtroom links
              </p>
            </div>
          </div>

          <Radio size={20} className='text-white/80 animate-pulse' />
        </div>

        {/* LINK INPUT */}
        <div className='rounded-2xl bg-slate-900/25 backdrop-blur-sm border border-white/15 p-4 mb-5'>
          <div className='flex items-center gap-3'>
            <Link2 size={18} className='text-white/80' />

            {/* <input
              type='text'
              placeholder='Paste Zoom, Teams, Google Meet, or Courtroom Link'
              className='
                w-full
                bg-transparent
                outline-none

                text-sm
                font-semibold
                text-white

                placeholder:text-white/70
              '
            /> */}
            <FloatingInput
              className='
                w-full
                bg-transparent
                outline-none

                text-sm
                font-semibold
                text-white'
              label='Courtroom Link'
            />
          </div>

          <button
            className='
              mt-4
              w-full
              py-3
              rounded-xl

              bg-black/15
              hover:bg-black/25

              font-bold
              text-white

              transition
            '
          >
            Attach to Active Case
          </button>
        </div>

        {/* ACTIVE SESSIONS */}
        <div className='flex-1 space-y-3'>
          {sessions.map((session) => (
            <div
              key={session.id}
              className='
                p-4
                rounded-xl

                bg-slate-900/25
                backdrop-blur-sm

                border border-white/15
              '
            >
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <h4 className='text-sm font-bold text-white'>
                    {session.court}
                  </h4>

                  <p className='text-xs font-medium text-white/80 mt-1'>
                    {session.case}
                  </p>
                </div>

                <span
                  className={`
                    px-3 py-1
                    rounded-lg
                    text-xs
                    font-bold
                    border
                    ${statusStyles[session.status]}
                  `}
                >
                  {session.status}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* QUICK STATS */}
        <div className='mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3'>
          <div className='rounded-xl bg-slate-900/25 p-3 text-center border border-white/15'>
            <p className='text-2xl font-black'>3</p>

            <p className='text-xs font-medium text-white/80'>Active Rooms</p>
          </div>

          <div className='rounded-xl bg-slate-900/25 p-3 text-center border border-white/15'>
            <p className='text-2xl font-black'>12</p>

            <p className='text-xs font-medium text-white/80'>Hearings Today</p>
          </div>

          <div className='rounded-xl bg-slate-900/25 p-3 text-center border border-white/15'>
            <p className='text-2xl font-black'>5</p>

            <p className='text-xs font-medium text-white/80'>Waiting</p>
          </div>
        </div>

        {/* FOOTER CTA */}
        <button
          className='
            mt-5
            flex
            items-center
            justify-center
            gap-2

            py-3
            rounded-xl

            bg-black/15
            hover:bg-black/25

            font-bold
            text-white

            transition
          '
        >
          Open Live Court Portal
          <ExternalLink size={16} />
        </button>
      </div>
    </DashboardTile>
  );
}
