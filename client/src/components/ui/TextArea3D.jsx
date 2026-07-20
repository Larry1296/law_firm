import Textarea from "@/components/ui/TextArea";

export function Textarea3D(props) {
  return (
    <div className='rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-raised)] p-3 text-[color:var(--text-primary)] shadow-[0_8px_20px_rgba(0,0,0,0.08)]'>
      <Textarea {...props} />
    </div>
  );
}
