"use client";

import { PageHeader } from "@/components/domain/page-header";
import FearGreedPanel from "@/components/FearGreedPanel";

export default function FearGreedPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Fear & Greed Index"
        description="Composite crypto sentiment from 6 weighted categories"
      />
      <FearGreedPanel />
    </div>
  );
}
