'use client';
import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type ContentMap = Record<string, string>;

export function useContent(pages: string[]) {
  const [map, setMap] = useState<ContentMap>({});
  const [ready, setReady] = useState(false);
  const pagesKey = pages.join(',');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    async function load() {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data } = await supabase
          .from('ui_content')
          .select('page,element_key,value')
          .in('page', [...pagesKey.split(','), 'global']);
        if (data && mountedRef.current) {
          const m: ContentMap = {};
          data.forEach(r => { m[`${r.page}:${r.element_key}`] = r.value; });
          setMap(m);
        }
      } catch {
        // Network or RLS error — silently use defaults
      } finally {
        if (mountedRef.current) setReady(true);
      }
    }
    load();
    return () => { mountedRef.current = false; };
  }, [pagesKey]);

  function get(page: string, key: string, fallback: string): string {
    const specific = `${page}:${key}`;
    if (specific in map) return map[specific];
    const global_ = `global:${key}`;
    if (global_ in map) return map[global_];
    return fallback;
  }

  return { get, ready };
}
