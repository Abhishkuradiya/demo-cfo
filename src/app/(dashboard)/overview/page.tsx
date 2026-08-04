import React from 'react';
import { PageContainer } from '@/components/common/page-container';
import { SectionHeader } from '@/components/common/section-header';

export default function OverviewPage() {
  return (
    <PageContainer>
      <SectionHeader
        title="Overview"
        description="Enterprise SaaS CFO Intelligence overview terminal."
      />
      <div className="rounded-lg border border-dashed p-12 text-center text-xs text-muted-foreground bg-card/30">
        Analytics metrics cards and dynamic layout grids will connect here.
      </div>
    </PageContainer>
  );
}
