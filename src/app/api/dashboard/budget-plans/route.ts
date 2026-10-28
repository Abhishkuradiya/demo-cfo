import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTenantIdFromSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getPlanKey(searchParams?: URLSearchParams, body?: Record<string, unknown>): string {
  if (searchParams?.get('planKey')) return searchParams.get('planKey')!;
  if (body?.planKey && typeof body.planKey === 'string') return body.planKey;

  const year = searchParams?.get('year') || (body?.year ? String(body.year) : null);
  if (year) return `plan_${year}`;

  return 'default_plan';
}

export async function GET(req: NextRequest) {
  try {
    const sessionTenantId = await getTenantIdFromSession();
    const tenantId = sessionTenantId || 1;

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'list') {
      const plans = await db.listCustomBudgetPlans(tenantId);
      const years = plans
        .map((p) => {
          const match = p.planKey.match(/^plan_(\d{4})$/);
          return match ? parseInt(match[1], 10) : null;
        })
        .filter((y): y is number => y !== null);

      return NextResponse.json({
        success: true,
        tenantId,
        plans,
        years,
      });
    }

    const planKey = getPlanKey(searchParams);
    const planData = await db.getCustomBudgetPlan(tenantId, planKey);

    return NextResponse.json({
      success: true,
      tenantId,
      planKey,
      plan: planData || null,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error fetching custom budget plan:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch budget plan' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionTenantId = await getTenantIdFromSession();
    const tenantId = sessionTenantId || 1;

    const body = await req.json();
    const planKey = getPlanKey(undefined, body);
    const planData = body?.plan || body?.plan_data;

    if (!planData) {
      return NextResponse.json(
        { success: false, error: 'Missing plan payload in request body' },
        { status: 400 }
      );
    }

    const saved = await db.saveCustomBudgetPlan(tenantId, planData, planKey);

    return NextResponse.json({
      success: Boolean(saved),
      message: saved
        ? 'Custom budget plan saved successfully to database'
        : 'Failed to save to database',
      tenantId,
      planKey,
      updatedAt: new Date().toISOString(),
      plan: planData,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error saving custom budget plan to database:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to save budget plan to database' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sessionTenantId = await getTenantIdFromSession();
    const tenantId = sessionTenantId || 1;

    const { searchParams } = new URL(req.url);
    let body: Record<string, unknown> | undefined;
    try {
      body = await req.json();
    } catch {
      // empty body
    }

    const planKey = getPlanKey(searchParams, body);
    const deleted = await db.deleteCustomBudgetPlan(tenantId, planKey);

    return NextResponse.json({
      success: Boolean(deleted),
      message: 'Custom budget plan removed from database',
      tenantId,
      planKey,
      deleted,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error deleting custom budget plan:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to delete budget plan from database' },
      { status: 500 }
    );
  }
}
