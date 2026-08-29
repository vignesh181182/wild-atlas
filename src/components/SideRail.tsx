'use client';

/**
 * The left menu on a wide screen, from the design (node 433:1575): the mark at
 * the top, the three places to be beneath it, and the account at the foot —
 * all in a rail about as wide as one button.
 *
 * The design draws it lying along the bottom because the whole frame is
 * rotated; stood up, it is this. It is the same three destinations the tab bar
 * offers on a narrow screen, so both read from one list.
 *
 * It expands to the full sidebar, with the groups written out, and remembers
 * which way it was left.
 */

import { AccountButton } from '@/components/AccountButton';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import emblem from '@/assets/wild-atlas-logo-emb.png';
import { NAV } from '@/components/nav';

export function SideRail({ onExpand }: { onExpand: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="rail" aria-label="Main">
      <Link href="/" className="rail-brand" aria-label="Wild Atlas">
        <Image src={emblem} alt="" aria-hidden sizes="26px" />
      </Link>

      <div className="rail-tabs">
        {NAV.map(({ href, label, Icon, match }) => (
          <Link
            key={href}
            href={href}
            className="rail-tab"
            aria-current={match(pathname) ? 'page' : undefined}
            aria-label={label}
            data-tip={label}
          >
            <Icon size={16} />
          </Link>
        ))}
      </div>

      <div className="rail-foot">
        <button
          type="button"
          className="rail-tab rail-toggle"
          onClick={onExpand}
          aria-label="Show groups"
          data-tip="Show groups"
        >
          <ChevronRight />
        </button>
        <AccountButton />
      </div>
    </nav>
  );
}

function ChevronRight() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 3.5 10.5 8 6 12.5" />
    </svg>
  );
}
