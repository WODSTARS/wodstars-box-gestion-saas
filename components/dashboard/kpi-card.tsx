import { Card, CardBody } from "@/components/ui/card";

export function KpiCard({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <Card>
      <CardBody>
        <strong className="block text-3xl font-black text-wod-gold">{value}</strong>
        <span className="mt-1 block text-sm text-wod-muted">{label}</span>
        <p className="mt-4 text-sm text-wod-text">{detail}</p>
      </CardBody>
    </Card>
  );
}
