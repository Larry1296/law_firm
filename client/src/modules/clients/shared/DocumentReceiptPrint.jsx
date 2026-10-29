import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer } from 'lucide-react';
import Button3D from '@/components/ui/Button3D';
import { formatDateTime } from '@/core/utils/dateFormatter';
import { enumLabel } from '@/core/utils/textFormatter';

const cell = 'border border-[#9ca3af] px-2 py-1.5 text-left align-top';

/** The paper acknowledgement handed to whoever delivered the documents; the system keeps the record. */
function ReceiptSheet({ receipt }) {
  const firm = receipt.firm || {};
  const contact = [firm.location, firm.phone_number, firm.email].filter(Boolean).join(' · ');
  const line = (label, value) => (
    <p className='flex items-end gap-2'>{label}<span className='min-h-[1.4em] flex-1 border-b border-[#111827]'>{value}</span></p>
  );
  const signature = (label, name) => (
    <div className='space-y-6'>
      <p className='font-semibold'>{label}</p>
      {line('Name', name)}
      {line('Signature')}
      {line('Date')}
    </div>
  );
  return (
    <article className='mx-auto max-w-[180mm] bg-white text-[13px] leading-relaxed text-[#111827]'>
      <header className='border-b-2 border-[#111827] pb-3 text-center'>
        <h1 className='text-2xl font-bold uppercase tracking-wide'>{firm.name}</h1>
        {contact && <p className='mt-1'>{contact}</p>}
      </header>
      <h2 className='mt-5 text-center text-base font-bold uppercase tracking-wider'>Acknowledgement of receipt of documents</h2>
      <dl className='mt-5 grid grid-cols-2 gap-x-6 gap-y-1'>
        <div><dt className='inline font-semibold'>Receipt no.: </dt><dd className='inline'>{receipt.receipt_number}</dd></div>
        <div><dt className='inline font-semibold'>Date and time: </dt><dd className='inline'>{formatDateTime(receipt.received_at)}</dd></div>
        <div><dt className='inline font-semibold'>Client: </dt><dd className='inline'>{receipt.client_name}</dd></div>
        <div><dt className='inline font-semibold'>Client file: </dt><dd className='inline'>{receipt.kyc_reference}</dd></div>
        <div className='col-span-2'><dt className='inline font-semibold'>Received from: </dt><dd className='inline'>{receipt.received_from}</dd></div>
      </dl>
      <table className='mt-5 w-full border-collapse'>
        <thead><tr>{['#', 'Reference', 'Document', 'Original / copy', 'Pages', 'Condition', 'To be returned'].map((label) => <th key={label} className={`${cell} bg-[#f3f4f6] font-semibold`}>{label}</th>)}</tr></thead>
        <tbody>{receipt.documents.map((line, index) => (
          <tr key={line.reference}>
            <td className={cell}>{index + 1}</td><td className={cell}>{line.reference}</td><td className={cell}>{line.title}</td>
            <td className={cell}>{enumLabel(line.copy_type)}</td><td className={cell}>{line.page_count}</td>
            <td className={cell}>{line.condition}</td><td className={cell}>{line.return_required ? 'Yes' : 'No'}</td>
          </tr>
        ))}</tbody>
      </table>
      <p className='mt-4'>
        The firm has received the documents listed above and holds them in safe custody on the client&apos;s file. Documents
        marked for return will be handed back on request against this receipt.
      </p>
      <section className='mt-8 grid grid-cols-2 gap-10'>
        {signature('Received for the firm', receipt.received_by)}
        {signature('Delivered by', receipt.received_from)}
      </section>
      <footer className='mt-10 border-t border-[#9ca3af] pt-2 text-center text-[11px]'>{firm.name} · {receipt.receipt_number} · Keep this receipt to collect any returnable document.</footer>
    </article>
  );
}

export default function PrintReceiptButton({ receipt, size = 'sm' }) {
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    if (!printing) return undefined;
    const done = () => setPrinting(false);
    window.addEventListener('afterprint', done);
    // The sheet is mounted by now; only it reaches the paper (see .print-sheet in theme.css).
    window.print();
    return () => window.removeEventListener('afterprint', done);
  }, [printing]);
  return (
    <>
      <Button3D size={size} variant='outlineLight' onClick={() => setPrinting(true)}>
        <Printer size={15} aria-hidden='true' /> Print receipt
      </Button3D>
      {printing && createPortal(<div className='print-sheet'><ReceiptSheet receipt={receipt} /></div>, document.body)}
    </>
  );
}
