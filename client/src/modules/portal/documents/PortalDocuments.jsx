import { Link } from 'react-router-dom';
import Card from '@/components/ui/Card';
import SectionHeading from '@/components/ui/SectionHeading';

export default function PortalDocuments() {
  return <div className='space-y-6 p-4 md:p-6'>
    <SectionHeading title='Documents' subtitle='Prospective-client intake' />
    <Card className='p-6'>
      <h3 className='font-semibold'>Your secure client file is not open yet</h3>
      <p className='mt-2 text-text-muted-light dark:text-text-muted-dark'>Documents are accepted into a formal client account only after onboarding and conflict clearance. This prevents intake material from being mistaken for an accepted retainer or an open matter.</p>
      <Link className='mt-4 inline-block rounded-xl bg-brand-primary px-4 py-2 text-white' to='/portal/intake/new'>Continue secure intake</Link>
    </Card>
  </div>;
}
