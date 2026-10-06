export function Placeholder({ title, text, color }: { title: string; text: string; color: string }) {
  return (
    <div className="px-5 pt-10">
      <h1 className="text-4xl font-semibold">{title}</h1>
      <div className={`tile mt-6 p-8 text-on-pastel ${color}`}>
        <p className="font-display text-2xl font-semibold">Binnenkort</p>
        <p className="mt-2 text-sm opacity-80">{text}</p>
      </div>
    </div>
  );
}
