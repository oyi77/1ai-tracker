"use client";

import { PageHeader } from "@/components/domain/page-header";
import SectorHeatmap from "@/components/SectorHeatmap";

export default function SectorsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Crypto Sectors"
        description="Performance breakdown across Layer 1, DeFi, AI, Memes, and more"
      />
      <SectorHeatmap />
    </div>
  );
}
