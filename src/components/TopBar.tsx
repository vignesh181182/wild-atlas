'use client';

/**
 * The bar across the top on narrow screens: the mark and the wordmark on the
 * left, the account on the right, and a hairline under it.
 *
 * Only ever shown below the sidebar's breakpoint — on a wide screen the
 * sidebar already carries both of these, and a bar as well would say
 * everything twice.
 */

import { UserButton } from '@clerk/nextjs';
import Image from 'next/image';
import Link from 'next/link';
import emblem from '@/assets/wild-atlas-logo-emb.png';

export function TopBar() {
  return (
    <header className="topbar-app">
      <Link href="/" className="topbar-brand" aria-label="Wild Atlas — today's surprise">
        <Image src={emblem} alt="" aria-hidden sizes="24px" />
        <span>Wild Atlas</span>
      </Link>
      <UserButton />
    </header>
  );
}
