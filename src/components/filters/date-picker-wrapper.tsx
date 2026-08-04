"use client";

import React from 'react';
import { useFilterStore, DateRange } from '@/store/filter-store';
import { Calendar, ChevronDown } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { format, subDays, startOfMonth, endOfMonth, startOfQuarter, startOfYear } from 'date-fns';

const PRESETS = [
  { label: 'Today', key: 'today' as const },
  { label: 'Yesterday', key: 'yesterday' as const },
  { label: 'Last 7 Days', key: 'last_7_days' as const },
  { label: 'Last 30 Days', key: 'last_30_days' as const },
  { label: 'This Month', key: 'this_month' as const },
  { label: 'Last Month', key: 'last_month' as const },
  { label: 'This Quarter', key: 'this_quarter' as const },
  { label: 'This Year', key: 'this_year' as const },
  { label: 'Custom Range', key: 'custom' as const },
];

export function DatePickerWrapper() {
  const { dateRange, setDateRange } = useFilterStore();

  const handleSelectPreset = (key: DateRange['preset']) => {
    const today = new Date();
    let startDate = today;
    let endDate = today;

    switch (key) {
      case 'today':
        startDate = today;
        break;
      case 'yesterday':
        startDate = subDays(today, 1);
        endDate = subDays(today, 1);
        break;
      case 'last_7_days':
        startDate = subDays(today, 6);
        break;
      case 'last_30_days':
        startDate = subDays(today, 29);
        break;
      case 'this_month':
        startDate = startOfMonth(today);
        break;
      case 'last_month':
        const lastMonth = subDays(startOfMonth(today), 1);
        startDate = startOfMonth(lastMonth);
        endDate = endOfMonth(lastMonth);
        break;
      case 'this_quarter':
        startDate = startOfQuarter(today);
        break;
      case 'this_year':
        startDate = startOfYear(today);
        break;
      case 'custom':
        return; // handle manually
    }

    setDateRange({
      preset: key,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    });
  };

  const getLabel = () => {
    const preset = PRESETS.find((p) => p.key === dateRange.preset);
    if (dateRange.preset !== 'custom' && preset) {
      return preset.label;
    }
    
    // Formatting custom display label
    try {
      const start = format(new Date(dateRange.startDate), 'MMM dd, yyyy');
      const end = format(new Date(dateRange.endDate), 'MMM dd, yyyy');
      return `${start} - ${end}`;
    } catch {
      return 'Select dates';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="flex h-9 items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted outline-none cursor-pointer transition select-none">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{getLabel()}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="z-50 min-w-44 rounded-md border bg-card p-1 shadow-md animate-in fade-in-80"
            align="start"
          >
            {PRESETS.map((preset) => (
              <DropdownMenu.Item
                key={preset.key}
                onClick={() => handleSelectPreset(preset.key)}
                className="flex w-full items-center rounded px-2.5 py-1.5 text-xs cursor-pointer outline-none hover:bg-muted text-foreground"
              >
                {preset.label}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {dateRange.preset === 'custom' ? (
        <div className="flex items-center gap-1">
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ startDate: e.target.value })}
            className="h-9 rounded-md border bg-background px-2 py-1 text-xs outline-none focus-visible:ring-1 focus-visible:ring-primary"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ endDate: e.target.value })}
            className="h-9 rounded-md border bg-background px-2 py-1 text-xs outline-none focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>
      ) : null}
    </div>
  );
}
