import React from 'react';
import { PageContainer } from '@/components/common/page-container';
import { SectionHeader } from '@/components/common/section-header';

export default function ForecastPage() {
  return (
    <PageContainer>
      <SectionHeader
        title="Forecast"
        description="Scaffolded corporate forecast dashboard cockpit."
      />
      <div className="rounded-lg border border-dashed p-12 text-center text-xs text-muted-foreground bg-card/30">
        Analytics metrics and grids for Forecast will be integrated here.
      </div>
    </PageContainer>
  );
}
