'use client';
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';
interface ToastItem { id: number; type: ToastType; text: string }
interface ToastCtx { show: (text: string, type?: ToastType) => void }

const Ctx = createContext<ToastCtx>({ show: () => {} });
export const useToast = () => useContext(Ctx);

let _id = 0;

const COLORS = {
  success: { bg: 'rgba(22,217,138,0.13)', border: 'rgba(22,217,138,0.32)', color: '#16D98A', icon: 'check_circle' },
  error:   { bg: 'rgba(255,107,138,0.13)', border: 'rgba(255,107,138,0.32)', color: '#FF6B8A', icon: 'error' },
  info:    { bg: 'rgba(124,92,255,0.13)',  border: 'rgba(124,92,255,0.32)',  color: '#C9BBFF', icon: 'info' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((text: string, type: ToastType = 'success') => {
    const id = ++_id;
    setToasts(t => [...t, { id, type, text }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3800);
  }, []);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div style={{ position: 'fixed', bottom: '28px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column-reverse', gap: '10px', pointerEvents: 'none' }}>
        {toasts.map(t => {
          const c = COLORS[t.type];
          return (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', borderRadius: '16px', background: 'rgba(17,16,32,0.97)', border: `1px solid ${c.border}`, boxShadow: '0 8px 32px rgba(0,0,0,0.55)', backdropFilter: 'blur(14px)', fontSize: '14px', fontWeight: 600, color: '#F4F3FA', minWidth: '260px', maxWidth: '380px', animation: 'toastIn .22s ease both', pointerEvents: 'auto', fontFamily: "'Manrope', system-ui, sans-serif" }}>
              <span className="material-symbols-rounded" style={{ fontSize: '20px', color: c.color, flexShrink: 0 }}>{c.icon}</span>
              {t.text}
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}
