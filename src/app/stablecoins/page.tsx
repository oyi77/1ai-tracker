"use client";

import { PageHeader } from "@/components/domain/page-header";
import StablecoinPanel from "@/components/StablecoinPanel";

export default function StablecoinsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Stablecoin Health"
        description="Peg monitoring, supply tracking, and depeg alerts for major stablecoins"
      />
      <StablecoinPanel />
    </div>
  );
}
