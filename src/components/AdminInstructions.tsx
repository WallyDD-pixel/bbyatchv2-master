interface AdminInstructionsProps {
  locale: 'fr' | 'en';
  title: string;
  instructions: Array<{
    title: string;
    description: string;
  }>;
}

export default function AdminInstructions({ locale, title, instructions }: AdminInstructionsProps) {
  return (
    <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 shadow-sm">
      <h3 className="font-semibold text-sm mb-3 text-blue-900 flex items-center gap-2">
        <span>📋</span>
        {title}
      </h3>
      <ul className="space-y-1.5 text-sm text-blue-800 list-disc list-inside">
        {instructions.map((instruction, index) => (
          <li key={index}>
            <strong className="text-blue-900">{instruction.title}:</strong> {instruction.description}
          </li>
        ))}
      </ul>
    </div>
  );
}
