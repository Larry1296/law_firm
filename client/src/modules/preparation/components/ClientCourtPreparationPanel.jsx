import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';

import Card from '@/components/ui/Card';
import { ClientBrief } from '@/modules/preparation/components/PreparationBrief';
import SittingCard from '@/modules/preparation/components/SittingCard';
import preparationService from '@/modules/preparation/services/preparationService';

export default function ClientCourtPreparationPanel({ className = '' }) {
  const [searchParams] = useSearchParams();
  const { data: sittings = [], isLoading } = useQuery({
    queryKey: ['court-preparation', 'client'],
    queryFn: preparationService.getClientSittings,
  });
  const [openId, setOpenId] = useState(searchParams.get('prepare'));
  if (isLoading || sittings.length === 0) return null;

  return (
    <section className={className}>
      <Card className='p-5'>
        <h2 className='text-lg font-bold'>Prepare for your court dates</h2>
        <p className='mb-4 text-sm text-text-muted-light dark:text-text-muted-dark'>What each sitting is for and how to get ready.</p>
        <div className='space-y-3'>
          {sittings.map((sitting) => (
            <SittingCard
              key={sitting.event.id}
              sitting={sitting}
              open={openId === sitting.event.id}
              onToggle={() => setOpenId(openId === sitting.event.id ? null : sitting.event.id)}
              showReadiness={false}
            >
              <ClientBrief brief={sitting.brief} />
            </SittingCard>
          ))}
        </div>
      </Card>
    </section>
  );
}
