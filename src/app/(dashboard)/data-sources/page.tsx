import React from 'react';
import { PageContainer } from '@/components/common/page-container';
import { SectionHeader } from '@/components/common/section-header';

export default function DataSourcesPage() {
  return (
    <PageContainer>
      <SectionHeader
        title="Data Sources"
        description="Scaffolded corporate data sources dashboard cockpit."
      />
      <div className="rounded-lg border border-dashed p-12 text-center text-xs text-muted-foreground bg-card/30">
        Analytics metrics and grids for Data Sources will be integrated here.
      </div>
    </PageContainer>
  );
}
