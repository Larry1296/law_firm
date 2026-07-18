import React from 'react';
import { useNavigate } from 'react-router-dom';

import Card from '@/components/ui/Card';
import Button3D from '@/components/ui/Button3D';
import SectionHeading from '@/components/ui/SectionHeading';

export default function LawyerCreateCasePage() {
  const navigate = useNavigate();

  return (
    <div className='space-y-6 p-4 md:p-6'>
      <SectionHeading
        title='Create Matter'
        subtitle='Matter creation uses the shared firm workflow when the backend exposes lawyer creation permissions.'
      />
      <Card className='p-6'>
        <div className='space-y-4'>
          <div>
            <h2 className='text-lg font-semibold text-text-primary-light dark:text-text-primary-dark'>
              Matter creation is not enabled for lawyers yet
            </h2>
            <p className='mt-2 text-sm text-text-muted-light dark:text-text-muted-dark'>
              The shared Kenyan matter-creation form is available to administrator and authorized secretary routes. The current backend does not expose a lawyer create endpoint or create-options contract, so this route does not maintain a separate legal form schema.
            </p>
          </div>
          <Button3D type='button' variant='primary' onClick={() => navigate('/lawyer/cases')}>
            Return to Matters
          </Button3D>
        </div>
      </Card>
    </div>
  );
}
