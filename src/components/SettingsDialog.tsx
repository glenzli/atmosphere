import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Database, LoaderCircle, Settings, Trash2, X } from 'lucide-react';
import { clearCache } from '../api';

interface Props {
  cachedCities: string[];
  onClear: () => void;
  onClose: () => void;
}

export function SettingsDialog({ cachedCities, onClear, onClose }: Props) {
  const { t } = useTranslation();
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [clearing, setClearing] = useState(false);
  const [status, setStatus] = useState<'done' | 'error' | null>(null);

  useEffect(() => {
    const element = dialog.current!;
    if (!opener.current) opener.current = document.activeElement as HTMLElement;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      opener.current?.focus();
    };
  }, []);

  const handleClear = async () => {
    setClearing(true);
    setStatus(null);
    try {
      await clearCache();
      onClear();
      setStatus('done');
    } catch {
      setStatus('error');
    } finally {
      setClearing(false);
    }
  };

  return (
    <dialog ref={dialog} className="modal card" aria-labelledby="settings-title" onCancel={event => { event.preventDefault(); onClose(); }}
      onKeyDown={event => {
        if (event.key !== 'Tab') return;
        const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
        const first = buttons[0];
        const last = buttons.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="modal-content" onClick={event => event.stopPropagation()}>
        <div className="modal-header">
          <h2 id="settings-title"><Settings size={20} aria-hidden="true" />{t('app.settingsTitle')}</h2>
          <button type="button" className="icon-button modal-close" onClick={onClose} aria-label={t('common.close')}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="form-group cache-group">
          <div className="form-label"><Database size={16} aria-hidden="true" /><span>{t('app.cachedCities', { count: cachedCities.length })}</span></div>
          <p className="helper-copy">{t('app.cacheHelp')}</p>
          <div className="cached-city-list">
            {cachedCities.length === 0 ? <span className="empty-state">{t('common.noData')}</span> : cachedCities.map(city => <span key={city} className="cached-city-chip">{city}</span>)}
          </div>
          <button type="button" className="btn btn-danger" disabled={clearing || cachedCities.length === 0} onClick={handleClear}>
            {clearing ? <LoaderCircle className="spinner" size={17} aria-hidden="true" /> : <Trash2 size={17} aria-hidden="true" />}
            {t('app.clearCache')}
          </button>
          {status && <p className={`helper-copy ${status === 'error' ? 'error-copy' : ''}`} role={status === 'error' ? 'alert' : 'status'}>{t(status === 'done' ? 'app.clearCacheDone' : 'app.clearCacheError')}</p>}
        </div>
        <div className="form-actions"><button type="button" className="btn" onClick={onClose}>{t('common.close')}</button></div>
      </div>
    </dialog>
  );
}
