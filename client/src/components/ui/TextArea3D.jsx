import Textarea from "@/components/ui/TextArea";

export function Textarea3D(props) {
  return (
    <div className="bg-white rounded-xl p-3 shadow-[0_8px_20px_rgba(0,0,0,0.08)] border border-gray-100">
      <Textarea {...props} />
    </div>
  );
}
