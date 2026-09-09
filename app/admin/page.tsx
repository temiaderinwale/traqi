'use client';
/* Traqi — /admin: the product admin console.

   Deliberately unlinked. Reach it by typing the URL. */

import React from 'react';
import { useAdmin } from '@/lib/adminStore';
import AdminAuth, { NoAccessScreen, PendingScreen, RejectedScreen, SuspendedScreen } from '@/components/admin/AdminAuth';
import AdminShell from '@/components/admin/AdminShell';
import { PlatformProvider } from '@/components/admin/platform';
import Preloader from '@/components/Preloader';

export default function AdminPage() {
  const { stage } = useAdmin();

  if (stage === 'loading') return <Preloader />;
  if (stage === 'signedOut') return <AdminAuth />;
  if (stage === 'pending') return <PendingScreen />;
  if (stage === 'rejected') return <RejectedScreen />;
  if (stage === 'suspended') return <SuspendedScreen />;
  if (stage === 'noaccess') return <NoAccessScreen />;

  return (
    <PlatformProvider>
      <AdminShell />
    </PlatformProvider>
  );
}
