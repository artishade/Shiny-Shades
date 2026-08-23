/* ===================================================
   All Categories Page
   Grid of top-level categories, each showing its
   subcategories as clickable chips. Mirrors the
   Shop / Sale page pattern — a real route, not a
   navbar dropdown.
   =================================================== */

import { CustomerLayout } from '@/components/layout/CustomerLayout';
import React, { useEffect, useMemo } from 'react';
import { Link } from '@/lib/routerCompat';
import Head from 'next/head';

import { FadeIn } from '@/components/ui';
import { useCategoryStore } from '@/store';
import { SITE } from '@/config/siteConfig';
import { BRAND } from '@/config/brandingConfig';

const ORIGIN = SITE.domain.replace(/\/$/, '');

export const CategoriesPage: React.FC = () => {
  const { categories, loadCategories, loading } = useCategoryStore();

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const topLevel = useMemo(() => categories.filter((c) => !c.parentId), [categories]);
  const childrenOf = useMemo(() => {
    const map: Record<string, typeof categories> = {};
    categories.forEach((c) => {
      if (c.parentId) {
        map[c.parentId] = [...(map[c.parentId] || []), c];
      }
    });
    return map;
  }, [categories]);

  const canonical = `${ORIGIN}/categories`;

  return (
    <>
      <Head>
        <title>{`Shop by Category | ${BRAND.fullName}`}</title>
        <meta
          name="description"
          content={`Browse all product categories at ${BRAND.fullName} — find exactly what you're looking for.`}
        />
        <link rel="canonical" href={canonical} />
      </Head>

      <div className="min-h-screen pt-8 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page header */}
          <div className="mb-10 text-center">
            <h1 className="heading-serif text-3xl md:text-4xl font-bold text-charcoal mb-3">
              Shop by Category
            </h1>
            <p className="text-[#6B5B55] max-w-xl mx-auto">
              Explore our full collection, organized to help you find what you love — faster.
            </p>
          </div>

          {loading ? (
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              role="status"
              aria-busy="true"
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-3xl aspect-[4/3] bg-blush-light/40 animate-pulse" />
              ))}
            </div>
          ) : topLevel.length === 0 ? (
            <p className="text-center text-[#6B5B55] py-16">No categories yet — check back soon.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {topLevel.map((cat, index) => {
                const subs = childrenOf[cat.id] || [];
                return (
                  <FadeIn key={cat.id} delay={index * 0.06}>
                    <div className="rounded-3xl overflow-hidden border border-blush/20 bg-white/60 hover:shadow-xl transition-shadow duration-300 h-full flex flex-col">
                      <Link
                        to={`/category/${cat.slug}`}
                        className="relative block aspect-[4/3] overflow-hidden group"
                        style={{ background: cat.gradient || '#F5E6DC' }}
                      >
                        {cat.image?.startsWith('http') && (
                          <img
                            src={cat.image}
                            alt=""
                            aria-hidden="true"
                            loading="lazy"
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        )}
                        <div className="absolute inset-0 bg-black/25 group-hover:bg-black/35 transition-colors" aria-hidden="true" />
                        <div className="absolute inset-0 flex items-end p-5">
                          <div>
                            <h2 className="heading-serif text-xl md:text-2xl font-bold text-white drop-shadow-lg">
                              {cat.name}
                            </h2>
                            <p className="text-white/85 text-xs mt-1">
                              {cat.productCount} {cat.productCount === 1 ? 'product' : 'products'}
                            </p>
                          </div>
                        </div>
                      </Link>

                      {/* Subcategory chips */}
                      {subs.length > 0 && (
                        <div className="p-4 flex flex-wrap gap-2">
                          {subs.map((sub) => (
                            <Link
                              key={sub.id}
                              to={`/category/${sub.slug}`}
                              className="px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider border border-rose-gold/30 text-charcoal hover:bg-rose-gold hover:text-white hover:border-rose-gold transition-colors"
                            >
                              {sub.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </FadeIn>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};


CategoriesPage.getLayout = function getLayout(page: React.ReactElement) {
  return <CustomerLayout>{page}</CustomerLayout>;
};

export default CategoriesPage;
