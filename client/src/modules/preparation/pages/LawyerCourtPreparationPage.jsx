import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw, Scale } from 'lucide-react';

import Card from '@/components/ui/Card';
import { getApiErrorMessage } from '@/core/utils/errorMessages';
import { AdvocateBrief } from '@/modules/preparation/components/PreparationBrief';
import SittingCard from '@/modules/preparation/components/SittingCard';
import preparationService from '@/modules/preparation/services/preparationService';

export default function LawyerCourtPreparationPage() {
  const [searchParams] = useSearchParams();
  const [openId, setOpenId] = useState(searchParams.get('event'));
  const queryClient = useQueryClient();
  const { data: sittings = [], isLoading, error } = useQuery({
    queryKey: ['court-preparation', 'advocate'],
    queryFn: preparationService.getAdvocateSittings,
  });
  const refresh = useMutation({
    mutationFn: preparationService.refreshAdvocateBrief,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['court-preparation', 'advocate'] }),
  });

  return (
    <div className='space-y-6 p-4 md:p-6'>
      <Card className='p-5'>
        <div className='flex items-center gap-3'>
          <Scale size={22} className='text-brand-primary' />
          <div>
            <h1 className='text-xl font-bold'>Court preparation</h1>
            <p className='text-sm text-text-muted-light dark:text-text-muted-dark'>
              Your sittings in the next 14 days, with what is outstanding and the questions to expect. Readiness rises as the file is prepared; it is not a prediction of the outcome.
            </p>
          </div>
        </div>
      </Card>
      {isLoading && <p className='text-sm'>Loading your sittings…</p>}
      {error && <p role='alert' className='text-sm text-red-700'>{getApiErrorMessage(error, 'Court preparation could not be loaded.')}</p>}
      {!isLoading && !error && sittings.length === 0 && (
        <Card className='p-5'><p className='text-sm'>No court sittings in the next 14 days on your matters.</p></Card>
      )}
      <div className='space-y-4'>
        {sittings.map((sitting) => (
          <SittingCard
            key={sitting.event.id}
            sitting={sitting}
            open={openId === sitting.event.id}
            onToggle={() => setOpenId(openId === sitting.event.id ? null : sitting.event.id)}
            actions={(
              <button
                type='button'
                onClick={() => refresh.mutate(sitting.event.id)}
                disabled={refresh.isPending}
                aria-label='Refresh brief'
                className='inline-flex min-h-11 items-center rounded-lg border border-border-light px-3 dark:border-border-dark'
              >
                <RefreshCw size={16} />
              </button>
            )}
          >
            <AdvocateBrief brief={sitting.brief} />
          </SittingCard>
        ))}
      </div>
    </div>
  );
}
