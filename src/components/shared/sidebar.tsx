'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface SidebarItem {
  icon: string;
  label: string;
  href: string;
  children?: SidebarItem[];
}

interface SidebarProps {
  items: SidebarItem[];
  baseUrl: string;
}

export default function Sidebar({ items, baseUrl }: SidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpand = (href: string) => {
    setExpandedItems(prev =>
      prev.includes(href)
        ? prev.filter(item => item !== href)
        : [...prev, href]
    );
  };

  const renderItem = (item: SidebarItem, level: number = 0) => {
    const isActive = pathname === item.href;
    const isExpanded = expandedItems.includes(item.href);
    const hasChildren = item.children && item.children.length > 0;
    const IconComponent = (Icons as any)[item.icon];
    const isChildActive = item.children?.some(child => pathname === child.href);

    return (
      <div key={item.href}>
        {hasChildren ? (
          <div>
            <div className="flex items-center gap-1">
              <Link
                href={item.href}
                className={cn(
                  "flex-1 flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                  isActive || isChildActive
                    ? "bg-orange-600 text-white shadow-lg shadow-orange-500/50"
                    : "text-slate-300 hover:bg-slate-800 hover:text-orange-400"
                )}
                style={{ paddingLeft: `${1 + level * 0.5}rem` }}
              >
                {IconComponent && <IconComponent className="w-5 h-5" />}
                <span className="flex-1">{item.label}</span>
              </Link>
              <button
                onClick={() => toggleExpand(item.href)}
                className={cn(
                  "p-3 rounded-lg transition-all",
                  isActive || isChildActive
                    ? "text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-orange-400"
                )}
              >
                <ChevronDown
                  className={cn(
                    "w-4 h-4 transition-transform",
                    isExpanded && "rotate-180"
                  )}
                />
              </button>
            </div>
          </div>
        ) : (
          <Link
            href={item.href}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
              isActive
                ? "bg-orange-600 text-white shadow-lg shadow-orange-500/50"
                : "text-slate-300 hover:bg-slate-800 hover:text-orange-400"
            )}
            style={{ paddingLeft: `${1 + level * 0.5}rem` }}
          >
            {IconComponent && <IconComponent className="w-5 h-5" />}
            <span>{item.label}</span>
          </Link>
        )}

        {hasChildren && isExpanded && (
          <div className="ml-4 mt-1 space-y-1">
            {item.children!.map(child => renderItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-64 bg-slate-900 text-white h-screen p-4 space-y-2 overflow-y-auto">
      <div className="mb-8 pb-4 border-b border-slate-700">
        <h1 className="text-2xl font-bold text-orange-500">HRMS</h1>
        <p className="text-sm text-slate-400">Management System</p>
      </div>
      {items.map(item => renderItem(item))}
    </div>
  );
}