import React from 'react';
import { PageContainer } from '@/components/common/page-container';
import { SectionHeader } from '@/components/common/section-header';

export default function CustomersPage() {
  return (
    <PageContainer>
      <SectionHeader
        title="Customers"
        description="Scaffolded corporate customers dashboard cockpit."
      />
      <div className="rounded-lg border border-dashed p-12 text-center text-xs text-muted-foreground bg-card/30">
        Analytics metrics and grids for Customers will be integrated here.
      </div>
    </PageContainer>
  );
}
