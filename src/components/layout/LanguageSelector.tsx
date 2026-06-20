import { useTranslation } from 'react-i18next';
import { LanguagesIcon } from '@/lib/icons';
import { TSelect, TOption } from '@/components/ui-tdesign';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n';

export function LanguageSelector() {
  const { i18n, t } = useTranslation();
  const currentLanguage = i18n.resolvedLanguage ?? SUPPORTED_LANGUAGES[0].code;

  return (
    <TSelect
      value={currentLanguage}
      onChange={(value) => {
        void i18n.changeLanguage(value as string);
      }}
      prefixIcon={<LanguagesIcon size={16} />}
      borderless
      autoWidth
      size="small"
      aria-label={t('topbar.languageSelector')}
    >
      {SUPPORTED_LANGUAGES.map((lang) => (
        <TOption key={lang.code} value={lang.code} label={lang.label}>
          {lang.label}
        </TOption>
      ))}
    </TSelect>
  );
}
