'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export interface AppProfile {
  id: string;
  full_name: string;
  eth_balance: number;
  hashrate_th: number;
  hashrate_capacity_th: number;
  mining_status: string;
  vip_tier: number;
  is_active: boolean;
}

interface AppCtx {
  profile: AppProfile | null;
  ethPrice: number;
  loading: boolean;
  refreshProfile: () => void;
}

const Ctx = createContext<AppCtx>({ profile: null, ethPrice: 3284.12, loading: true, refreshProfile: () => {} });

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [ethPrice, setEthPrice] = useState(3284.12);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function fetchProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from('profiles')
      .select('id,full_name,eth_balance,hashrate_th,hashrate_capacity_th,mining_status,vip_tier,is_active')
      .eq('id', user.id)
      .single();
    if (data) setProfile(data);
    setLoading(false);
  }

  useEffect(() => {
    // fetchProfile is async — setState calls inside it only run after Supabase resolves,
    // not synchronously within this effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProfile();
    // ETH price jitter — functional updater form is safe inside interval
    const id = setInterval(() => {
      setEthPrice(p => Math.max(3200, Math.min(3400, p + (Math.random() - 0.5) * 1.4)));
    }, 120);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- fetchProfile is stable, intentional empty deps

  return (
    <Ctx.Provider value={{ profile, ethPrice, loading, refreshProfile: fetchProfile }}>
      {children}
    </Ctx.Provider>
  );
}

export const useApp = () => useContext(Ctx);
