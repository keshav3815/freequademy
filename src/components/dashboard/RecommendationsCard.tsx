import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Recommendation } from "@/lib/recommendations";

export default function RecommendationsCard({ recommendations }: { recommendations: Recommendation[] }) {
  if (recommendations.length === 0) return null;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-primary/10"><Sparkles className="h-5 w-5 text-primary" /></div>
        <h3 className="font-semibold">Recommended Next Steps</h3>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {recommendations.map((r) => (
          <Link
            key={r.id}
            to={r.href}
            className="rounded-lg border p-4 hover:border-primary/50 hover:bg-muted/30 transition-colors group"
          >
            <p className="font-medium mb-1">{r.title}</p>
            <p className="text-sm text-muted-foreground mb-2">{r.detail}</p>
            <span className="text-sm text-primary font-medium inline-flex items-center gap-1">
              {r.cta} <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </Link>
        ))}
      </div>
    </Card>
  );
}
