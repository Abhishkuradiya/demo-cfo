import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTenantIdFromSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sessionTenantId = await getTenantIdFromSession();
    const tenantId = sessionTenantId || 1;

    const { searchParams } = new URL(req.url);
    const planKey = searchParams.get('planKey') || 'default_plan';

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
    const planKey = body?.planKey || 'default_plan';
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
    let planKey = searchParams.get('planKey');

    if (!planKey) {
      try {
        const body = await req.json();
        planKey = body?.planKey;
      } catch {
        // empty body is fine
      }
    }

    const keyToDelete = planKey || 'default_plan';
    const deleted = await db.deleteCustomBudgetPlan(tenantId, keyToDelete);

    return NextResponse.json({
      success: Boolean(deleted),
      message: 'Custom budget plan removed from database',
      tenantId,
      planKey: keyToDelete,
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
