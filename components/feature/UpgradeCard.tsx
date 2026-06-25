export default function UpgradeCard({title}:{title:string}){
  return (
    <div className="rounded-xl border p-6">
      <h2 className="text-xl font-bold">{title}</h2>
      <p>This feature is not available on your current plan.</p>
    </div>
  );
}
