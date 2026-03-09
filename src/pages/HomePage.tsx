import Button from '../components/common/Button';
import Card from '../components/common/Card';

export default function HomePage() {
  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.25em] text-sky-700">
            Pack Management
          </p>
          <h2 className="text-3xl font-semibold text-slate-950">Quiz Packs</h2>
          <p className="max-w-2xl text-slate-600">
            Import local JSON quiz packs and manage your offline study library.
          </p>
        </div>
        <Button disabled type="button">
          Import Quiz Pack
        </Button>
      </Card>
    </div>
  );
}
