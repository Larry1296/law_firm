import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
} from 'lucide-react';

import DashboardTile from '@/components/dashboard/DashboardTile';

export default function AIInsightsTile() {
  const insights = [
    {
      id: 1,
      icon: AlertTriangle,
      title: 'Case Delay Risk',
      description: '8 active cases show a high probability of timeline delays.',
      level: 'high',
    },
    {
      id: 2,
      icon: TrendingUp,
      title: 'Revenue Growth',
      description: 'Firm revenue is projected to increase by 14% next month.',
      level: 'medium',
    },
    {
      id: 3,
      icon: Lightbulb,
      title: 'Staff Optimization',
      description: 'Redistributing 3 cases could improve workload balance.',
      level: 'low',
    },
  ];

  const levelStyles = {
    high: 'bg-red-500/10 border-red-400/20 text-red-200',
    medium: 'bg-amber-500/10 border-amber-400/20 text-amber-200',
    low: 'bg-emerald-500/10 border-emerald-400/20 text-emerald-200',
  };

  return (
    <DashboardTile size='large' variant='ai'>
      <div className='h-full flex flex-col'>
        {/* HEADER */}
        <div className='flex items-start justify-between mb-6'>
          <div className='flex items-center gap-3'>
            <div className='p-3 rounded-xl bg-white/15'>
              <Brain size={22} />
            </div>

            <div>
              <h3 className='text-lg font-semibold'>AI Insights</h3>
              <p className='text-sm opacity-80'>
                Strategic recommendations and predictions
              </p>
            </div>
          </div>
        </div>

        {/* HERO METRIC */}
        <div className='rounded-2xl bg-white/10 border border-white/10 p-5 mb-5'>
          <p className='text-sm opacity-70'>AI Confidence Score</p>

          <div className='flex items-end justify-between mt-2'>
            <h2 className='text-4xl font-bold'>92%</h2>
            <Brain size={30} className='opacity-80' />
          </div>

          <div className='mt-4 h-2 bg-white/10 rounded-full overflow-hidden'>
            <div
              className='h-full bg-white rounded-full'
              style={{ width: '92%' }}
            />
          </div>
        </div>

        {/* INSIGHTS */}
        <div className='flex-1 space-y-3'>
          {insights.map((insight) => {
            const Icon = insight.icon;

            return (
              <div
                key={insight.id}
                className='flex items-start gap-3 p-3 rounded-xl bg-white/10 border border-white/10'
              >
                <div
                  className={`p-2 rounded-lg border ${levelStyles[insight.level]}`}
                >
                  <Icon size={16} />
                </div>

                <div>
                  <h4 className='font-medium text-sm'>{insight.title}</h4>
                  <p className='text-xs opacity-75 mt-1'>
                    {insight.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* FOOTER CTA */}
        <button className='mt-5 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/15 hover:bg-white/20 transition'>
          View AI Dashboard
          <ArrowRight size={16} />
        </button>
      </div>
    </DashboardTile>
  );
}
