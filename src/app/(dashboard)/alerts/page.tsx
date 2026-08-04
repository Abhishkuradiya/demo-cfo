import React from 'react';
import { PageContainer } from '@/components/common/page-container';
import { SectionHeader } from '@/components/common/section-header';

export default function AlertsPage() {
  return (
    <PageContainer>
      <SectionHeader
        title="Alerts"
        description="Scaffolded corporate alerts dashboard cockpit."
      />
      <div className="rounded-lg border border-dashed p-12 text-center text-xs text-muted-foreground bg-card/30">
        Analytics metrics and grids for Alerts will be integrated here.
      </div>
    </PageContainer>
  );
}
