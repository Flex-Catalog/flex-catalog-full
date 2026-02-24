'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';

const flags: Record<string, { src: string; alt: string }> = {
  pt: { src: 'https://flagcdn.com/w40/br.png', alt: 'Portugues' },
  en: { src: 'https://flagcdn.com/w40/us.png', alt: 'English' },
  es: { src: 'https://flagcdn.com/w40/es.png', alt: 'Espanol' },
};

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: string) => {
    if (newLocale === locale) return;
    const segments = pathname.split('/');
    if (['pt', 'en', 'es'].includes(segments[1])) {
      segments[1] = newLocale;
    } else {
      segments.splice(1, 0, newLocale);
    }
    router.push(segments.join('/') || '/');
  };

  return (
    <div className="flex items-center gap-1.5">
      {Object.entries(flags).map(([loc, flag]) => (
        <button
          key={loc}
          onClick={() => switchLocale(loc)}
          className={`rounded-sm overflow-hidden transition-all duration-200 ${
            locale === loc
              ? 'ring-2 ring-blue-400 ring-offset-1 opacity-100 scale-110'
              : 'opacity-60 hover:opacity-100 hover:scale-105'
          }`}
          title={flag.alt}
        >
          <img src={flag.src} alt={flag.alt} className="w-7 h-5 object-cover" />
        </button>
      ))}
    </div>
  );
}
