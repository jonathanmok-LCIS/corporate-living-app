'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { UserRole } from '@/lib/types';

const ROLE_CONFIG: Record<UserRole, { label: string; path: string; color: string }> = {
  ADMIN: { label: 'Admin', path: '/admin', color: 'bg-purple-600' },
  COORDINATOR: { label: 'Coordinator', path: '/coordinator', color: 'bg-green-600' },
  TENANT: { label: 'Tenant', path: '/tenant', color: 'bg-blue-600' },
};

interface RoleSwitcherProps {
  currentRole: UserRole;
}

export default function RoleSwitcher({ currentRole }: RoleSwitcherProps) {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchUserRoles() {
      const supabase = createClient();
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('roles')
          .eq('id', user.id)
          .single();

        if (profile?.roles) {
          setRoles(profile.roles);
        }
      } catch (error) {
        console.error('Error fetching user roles:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUserRoles();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleRoleSwitch(role: UserRole) {
    const config = ROLE_CONFIG[role];
    setIsOpen(false);
    router.push(config.path);
  }

  // Don't show if user has only one role
  if (loading || roles.length <= 1) {
    return (
      <span className={`${ROLE_CONFIG[currentRole].color.replace('bg-', 'bg-').replace('-600', '-800')} px-3 py-1 rounded text-sm shadow-md`}>
        {ROLE_CONFIG[currentRole].label}
      </span>
    );
  }

  const otherRoles = roles.filter(r => r !== currentRole);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${ROLE_CONFIG[currentRole].color.replace('-600', '-800')} px-3 py-1 rounded text-sm flex items-center gap-1 hover:opacity-90 transition-opacity shadow-md`}
      >
        {ROLE_CONFIG[currentRole].label}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 py-1">
          <div className="px-4 py-2 text-xs text-gray-500 border-b">
            Switch Portal
          </div>
          {otherRoles.map((role) => (
            <button
              key={role}
              onClick={() => handleRoleSwitch(role)}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <span className={`w-2 h-2 rounded-full ${ROLE_CONFIG[role].color}`}></span>
              {ROLE_CONFIG[role].label} Portal
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
