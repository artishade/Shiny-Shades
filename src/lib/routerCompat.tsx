/* ===================================================================
   routerCompat.tsx

   A thin, react-router-dom-shaped wrapper around next/router (Pages
   Router). This exists so pages/components that were written against
   react-router-dom's API (useNavigate, useParams, useLocation,
   useSearchParams, <Link to="">) keep working with only their import
   source changed — e.g.:

     - import { Link, useNavigate } from 'react-router-dom';
     + import { Link, useNavigate } from '@/lib/routerCompat';

   This is a compatibility layer, not a general-purpose router — it
   only covers the subset of the react-router-dom API this project
   actually used (checked against the pre-migration codebase).
   =================================================================== */

import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useMemo } from 'react';
import type { AnchorHTMLAttributes, ReactNode } from 'react';

// ─── <Link to="..."> → next/link (href) ──────────────────────────────────────

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string;
  replace?: boolean;
  children?: ReactNode;
}

export function Link({ to, replace, children, ...rest }: LinkProps) {
  return (
    <NextLink href={to} replace={replace} {...rest}>
      {children}
    </NextLink>
  );
}

// ─── useNavigate() ────────────────────────────────────────────────────────────
// Supports: navigate('/path'), navigate('/path', { replace: true }),
// navigate(-1) (back button).

type NavigateOptions = { replace?: boolean };

export function useNavigate() {
  const router = useRouter();
  return useCallback(
    (to: string | number, options?: NavigateOptions) => {
      if (typeof to === 'number') {
        // Only `-1` (go back) was ever used in this codebase.
        router.back();
        return;
      }
      if (options?.replace) {
        router.replace(to);
      } else {
        router.push(to);
      }
    },
    [router],
  );
}

// ─── useParams() ──────────────────────────────────────────────────────────────
// router.query holds both path params (e.g. [slug]) and query string params.
// On the very first render of a dynamic route, Next may not have parsed the
// URL yet (router.isReady === false) — components here already fetch data in
// a useEffect keyed off the param, so they self-heal one tick later.

export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>(): Readonly<Partial<T>> {
  const router = useRouter();
  return router.query as Partial<T>;
}

// ─── useLocation() ─────────────────────────────────────────────────────────────
// react-router's `state` (passed via navigate(path, { state })) has no Next.js
// equivalent and was never actually used to pass data in this codebase (always
// null in practice) — kept for shape-compatibility only.

export function useLocation() {
  const router = useRouter();
  const asPath = router.asPath || '/';
  const [pathAndSearch, hash] = asPath.split('#');
  const [pathname, search] = pathAndSearch.split('?');
  return {
    pathname: pathname || '/',
    search: search ? `?${search}` : '',
    hash: hash ? `#${hash}` : '',
    state: null as unknown,
    key: 'default',
  };
}

// ─── useSearchParams() ─────────────────────────────────────────────────────────
// Returns a real URLSearchParams built from router.query, matching
// react-router-dom's `[searchParams, setSearchParams]` shape. Only `.get()`
// was used in this codebase, so setSearchParams is a light-weight best-effort
// implementation (push with the merged query).

type SearchParamsInit = Record<string, string> | URLSearchParams | [string, string][];

export function useSearchParams(): [URLSearchParams, (init: SearchParamsInit, opts?: NavigateOptions) => void] {
  const router = useRouter();

  const searchParams = useMemo(() => {
    const usp = new URLSearchParams();
    Object.entries(router.query).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => usp.append(key, v));
      } else if (value !== undefined) {
        usp.set(key, value);
      }
    });
    return usp;
  }, [router.query]);

  const setSearchParams = useCallback(
    (init: SearchParamsInit, opts?: NavigateOptions) => {
      const usp = init instanceof URLSearchParams ? init : new URLSearchParams(init);
      const query: Record<string, string> = {};
      usp.forEach((value, key) => {
        query[key] = value;
      });
      const target = { pathname: router.pathname, query };
      if (opts?.replace) {
        router.replace(target, undefined, { shallow: true });
      } else {
        router.push(target, undefined, { shallow: true });
      }
    },
    [router],
  );

  return [searchParams, setSearchParams];
}
