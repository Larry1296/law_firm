import Input from "@/components/ui/Inputs";

export const Input3D = (props) => {
  return (
    <div className="bg-white rounded-xl p-3 shadow-[0_8px_20px_rgba(0,0,0,0.08)] border border-gray-100">
      <Input {...props} />
    </div>
  );
};
