'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SalesmanStockPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/pos');
  }, [router]);

  return null;
}
