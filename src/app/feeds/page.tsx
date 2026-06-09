"use client";

import { PageHeader } from "@/components/domain/page-header";
import FeedPanel from "@/components/FeedPanel";

export default function FeedsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Crypto News Feed"
        description="Aggregated from 25+ curated sources with credibility scoring"
      />
      <FeedPanel />
    </div>
  );
}
