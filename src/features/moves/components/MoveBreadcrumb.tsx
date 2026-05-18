import { ChevronRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';

type MoveBreadcrumbProps = {
  category: string;
  moveName: string;
};

export default async function MoveBreadcrumb({ category, moveName }: MoveBreadcrumbProps) {
  const t = await getTranslations('moves');

  return (
    <nav
      aria-label="Breadcrumb"
      className="mx-auto flex max-w-[1280px] items-center gap-1.5 px-4 pt-6 text-xs text-on-surface-variant sm:px-8"
    >
      <Link href="/catalog" className="transition-colors hover:text-on-surface">
        {t('breadcrumb')}
      </Link>
      <ChevronRight size={12} aria-hidden="true" />
      <span className="tracking-widest text-primary uppercase">{category}</span>
      <ChevronRight size={12} aria-hidden="true" />
      <span className="min-w-0 truncate text-on-surface">{moveName}</span>
    </nav>
  );
}
