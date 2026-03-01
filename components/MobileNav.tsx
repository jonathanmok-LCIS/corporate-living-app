'use client';

import { useState } from 'react';
import Link from 'next/link';

interface NavLink {
  href: string;
  label: string;
}

interface MobileNavProps {
  links: NavLink[];
  colorScheme: 'blue' | 'green' | 'purple';
}

const COLOR_CLASSES = {
  blue: {
    bg: 'bg-blue-600',
    hover: 'hover:bg-blue-500/30',
    active: 'bg-blue-500/20',
    menuBg: 'bg-blue-700',
  },
  green: {
    bg: 'bg-green-600',
    hover: 'hover:bg-green-500/30',
    active: 'bg-green-500/20',
    menuBg: 'bg-green-700',
  },
  purple: {
    bg: 'bg-purple-600',
    hover: 'hover:bg-purple-500/30',
    active: 'bg-purple-500/20',
    menuBg: 'bg-purple-700',
  },
};

export default function MobileNav({ links, colorScheme }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const colors = COLOR_CLASSES[colorScheme];

  return (
    <>
      {/* Hamburger button - only visible on mobile */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`md:hidden p-2 rounded ${colors.hover} focus:outline-none focus:ring-2 focus:ring-white`}
        aria-label="Toggle menu"
        aria-expanded={isOpen}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Desktop nav links */}
      <div className="hidden md:flex space-x-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`${colors.hover} px-3 py-1.5 rounded-md text-sm font-medium transition-colors`}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Mobile menu dropdown */}
      {isOpen && (
        <div className={`md:hidden absolute top-14 left-0 right-0 ${colors.menuBg} shadow-lg z-50 border-t border-white/10`}>
          <div className="px-3 py-2 space-y-0.5">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`block px-3 py-2.5 rounded-md ${colors.hover} text-sm font-medium transition-colors`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
