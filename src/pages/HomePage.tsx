import Button from '../components/common/Button';
import Card from '../components/common/Card';

export default function HomePage() {
  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm tracking-widest text-sky-700">
            パック管理
          </p>
          <h2 className="text-3xl font-semibold text-slate-950">クイズパック</h2>
          <p className="max-w-2xl text-slate-600">
            ローカルのJSONクイズパックを読み込み、オフライン学習用の問題集を管理します。
          </p>
        </div>
        <Button disabled type="button">
          クイズパックを読み込む
        </Button>
      </Card>
    </div>
  );
}
