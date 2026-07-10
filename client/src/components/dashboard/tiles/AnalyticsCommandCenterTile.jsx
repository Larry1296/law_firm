import {
  BarChart3,
  Users,
  Briefcase,
  Gavel,
  Scale,
  TrendingUp,
  Brain,
} from 'lucide-react';

import DashboardTile from '@/components/dashboard/DashboardTile';

export default function AnalyticsCommandCenterTile() {
  const monthlyCases = [40, 55, 68, 82, 110, 140];

  const workload = [
    { name: 'James Kariuki', load: 92 },
    { name: 'Mercy Wambui', load: 70 },
    { name: 'Brian Otieno', load: 54 },
    { name: 'Alice Mwangi', load: 35 },
  ];

  return (
    <DashboardTile size='full' variant='analytics'>
      <div className='flex flex-col gap-8'>
        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4'>
          <div className='flex items-center gap-4'>
            <div className='p-4 rounded-2xl bg-white/10 backdrop-blur-sm'>
              <BarChart3 size={28} />
            </div>

            <div>
              <h2 className='text-3xl font-black tracking-tight'>
                Firm Analytics Command Center
              </h2>

              <p className='text-slate-300 mt-1'>
                Real-time operational intelligence across the firm
              </p>
            </div>
          </div>

          <div className='flex items-center gap-2 text-emerald-400 font-bold'>
            <TrendingUp size={18} />
            +18% Quarterly Growth
          </div>
        </div>

        {/* ================================================= */}
        {/* EXECUTIVE KPI ROW */}
        {/* ================================================= */}

        <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5'>
          <div className='rounded-2xl bg-white/5 border border-white/10 p-5'>
            <div className='flex justify-between items-center mb-4'>
              <Briefcase size={22} />
              <span className='text-xs text-emerald-400 font-semibold'>
                +12%
              </span>
            </div>

            <p className='text-sm text-slate-400'>Active Cases</p>

            <h3 className='text-5xl font-black mt-2'>248</h3>

            <div className='mt-5'>
              <div className='flex justify-between text-xs mb-1'>
                <span>Resolved Rate</span>
                <span>72%</span>
              </div>

              <div className='h-2 rounded-full bg-white/10'>
                <div className='h-2 rounded-full bg-emerald-500 w-[72%]' />
              </div>
            </div>
          </div>

          <div className='rounded-2xl bg-white/5 border border-white/10 p-5'>
            <div className='flex justify-between items-center mb-4'>
              <Users size={22} />
              <span className='text-xs text-cyan-400 font-semibold'>+24</span>
            </div>

            <p className='text-sm text-slate-400'>Total Clients</p>

            <h3 className='text-5xl font-black mt-2'>1,248</h3>

            <p className='mt-5 text-sm text-slate-400'>
              82 new clients onboarded this month
            </p>
          </div>

          <div className='rounded-2xl bg-white/5 border border-white/10 p-5'>
            <div className='flex justify-between items-center mb-4'>
              <Gavel size={22} />
              <span className='text-xs text-amber-400 font-semibold'>
                5 Courts
              </span>
            </div>

            <p className='text-sm text-slate-400 mb-4'>Court Distribution</p>

            <div className='space-y-3'>
              <div>
                <div className='flex justify-between text-xs mb-1'>
                  <span>High Court</span>
                  <span>40%</span>
                </div>

                <div className='h-2 bg-white/10 rounded-full'>
                  <div className='h-2 bg-blue-500 rounded-full w-[40%]' />
                </div>
              </div>

              <div>
                <div className='flex justify-between text-xs mb-1'>
                  <span>ELC</span>
                  <span>28%</span>
                </div>

                <div className='h-2 bg-white/10 rounded-full'>
                  <div className='h-2 bg-purple-500 rounded-full w-[28%]' />
                </div>
              </div>

              <div>
                <div className='flex justify-between text-xs mb-1'>
                  <span>Employment</span>
                  <span>18%</span>
                </div>

                <div className='h-2 bg-white/10 rounded-full'>
                  <div className='h-2 bg-emerald-500 rounded-full w-[18%]' />
                </div>
              </div>
            </div>
          </div>

          <div className='rounded-2xl bg-white/5 border border-white/10 p-5'>
            <div className='flex justify-between items-center mb-4'>
              <Scale size={22} />
              <span className='text-xs text-pink-400 font-semibold'>
                Leading
              </span>
            </div>

            <p className='text-sm text-slate-400'>Top Case Category</p>

            <h3 className='text-3xl font-black mt-2'>Land Cases</h3>

            <p className='mt-5 text-sm text-slate-400'>
              38% of all active matters
            </p>

            <div className='mt-4 h-2 bg-white/10 rounded-full'>
              <div className='h-2 bg-pink-500 rounded-full w-[38%]' />
            </div>
          </div>
        </div>

        {/* ================================================= */}
        {/* VISUAL ANALYTICS */}
        {/* ================================================= */}

        <div className='grid grid-cols-1 xl:grid-cols-2 gap-5'>
          {/* CASE TREND */}
          <div className='rounded-2xl bg-white/5 border border-white/10 p-6'>
            <h3 className='font-bold text-lg mb-6'>Case Filing Trend</h3>

            <div className='h-48 flex items-end gap-4'>
              {monthlyCases.map((value, index) => (
                <div
                  key={index}
                  className='flex-1 rounded-t-xl bg-gradient-to-t from-cyan-500 to-sky-400'
                  style={{ height: `${value}%` }}
                />
              ))}
            </div>

            <div className='grid grid-cols-6 mt-4 text-xs text-slate-400'>
              <span>Jan</span>
              <span>Feb</span>
              <span>Mar</span>
              <span>Apr</span>
              <span>May</span>
              <span>Jun</span>
            </div>
          </div>

          {/* REVENUE */}
          <div className='rounded-2xl bg-white/5 border border-white/10 p-6'>
            <h3 className='font-bold text-lg mb-6'>Revenue Performance</h3>

            <div className='space-y-5'>
              {[
                ['January', 'KES 1.2M', '45%'],
                ['February', 'KES 1.7M', '65%'],
                ['March', 'KES 2.4M', '90%'],
              ].map(([month, value, width]) => (
                <div key={month}>
                  <div className='flex justify-between text-sm mb-2'>
                    <span>{month}</span>
                    <span>{value}</span>
                  </div>

                  <div className='h-3 rounded-full bg-white/10'>
                    <div
                      className='h-3 rounded-full bg-emerald-500'
                      style={{ width }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ================================================= */}
        {/* OPERATIONAL INTELLIGENCE */}
        {/* ================================================= */}

        <div className='grid grid-cols-1 xl:grid-cols-3 gap-5'>
          {/* LAWYER WORKLOAD */}
          <div className='rounded-2xl bg-white/5 border border-white/10 p-6'>
            <h3 className='font-bold text-lg mb-6'>Lawyer Workload</h3>

            <div className='space-y-5'>
              {workload.map((lawyer) => (
                <div key={lawyer.name}>
                  <div className='flex justify-between text-sm mb-2'>
                    <span>{lawyer.name}</span>
                    <span>{lawyer.load}%</span>
                  </div>

                  <div className='h-2 bg-white/10 rounded-full'>
                    <div
                      className='h-2 bg-amber-500 rounded-full'
                      style={{ width: `${lawyer.load}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CASE STATUS */}
          <div className='rounded-2xl bg-white/5 border border-white/10 p-6'>
            <h3 className='font-bold text-lg mb-6'>Case Status Breakdown</h3>

            <div className='space-y-5'>
              {[
                ['Active', '48%', 'bg-blue-500'],
                ['Pending', '22%', 'bg-amber-500'],
                ['Closed', '30%', 'bg-emerald-500'],
              ].map(([status, value, color]) => (
                <div key={status}>
                  <div className='flex justify-between text-sm mb-2'>
                    <span>{status}</span>
                    <span>{value}</span>
                  </div>

                  <div className='h-3 bg-white/10 rounded-full'>
                    <div
                      className={`h-3 rounded-full ${color}`}
                      style={{ width: value }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI FORECAST */}
          <div className='rounded-2xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-600/20 to-indigo-700/20 p-6'>
            <div className='flex items-center gap-3 mb-6'>
              <Brain size={24} />

              <h3 className='font-bold text-lg'>AI Forecast Engine</h3>
            </div>

            <div className='space-y-5'>
              <div className='flex justify-between'>
                <span>Expected New Cases</span>
                <strong>+24</strong>
              </div>

              <div className='flex justify-between'>
                <span>Likely Closures</span>
                <strong>17</strong>
              </div>

              <div className='flex justify-between'>
                <span>Revenue Forecast</span>
                <strong>KES 2.9M</strong>
              </div>

              <div className='flex justify-between'>
                <span>Risk Cases</span>

                <strong className='text-red-300'>8</strong>
              </div>

              <div className='pt-4 border-t border-white/10'>
                <p className='text-sm text-slate-300'>
                  AI predicts a 14% increase in firm revenue and recommends
                  reallocation of high-load cases.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardTile>
  );
}
