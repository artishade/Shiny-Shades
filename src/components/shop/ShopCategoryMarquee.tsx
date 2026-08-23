import React, { useEffect } from 'react';
import { useNavigate } from '@/lib/routerCompat';
import { useCategoryStore } from '@/store';
import { useAutoScroll } from '@/components/home/useAutoScroll';

const CARD_PX = 96;
const GAP_PX = 12;
const CARD_WIDTH = CARD_PX + GAP_PX;

export const ShopCategoryMarquee: React.FC = () => {
  const navigate = useNavigate();
  const { categories: allCategories, loadCategories } = useCategoryStore();
  const categories = allCategories.filter((cat) => !cat.parentId);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const allSlides = [...categories, ...categories, ...categories];

  const { trackRef, isPausedRef } = useAutoScroll(
    categories.length,
    CARD_WIDTH,
    0.45,
    true
  );

  if (categories.length === 0) return null;

  return (
    <section className="overflow-hidden pb-5" aria-label="Shop by category">
      <div
        className="overflow-hidden"
        onMouseEnter={() => {
          isPausedRef.current = true;
        }}
        onMouseLeave={() => {
          isPausedRef.current = false;
        }}
        onTouchStart={() => {
          isPausedRef.current = true;
        }}
        onTouchEnd={() => {
          isPausedRef.current = false;
        }}
      >
        <div
          ref={trackRef}
          className="flex will-change-transform"
          style={{ width: 'max-content', gap: GAP_PX, paddingLeft: GAP_PX }}
        >
          {allSlides.map((category, idx) => (
            <button
              key={`${category.id}-${idx}`}
              type="button"
              onClick={() => navigate(`/category/${category.slug}`)}
              className="flex-shrink-0 flex flex-col items-center gap-1.5 group cursor-pointer bg-transparent border-0 p-0"
              style={{ width: CARD_PX }}
              aria-label={category.name}
            >
              <div
                className="relative w-full overflow-hidden rounded-2xl aspect-square"
                style={{ background: category.gradient || '#F5E6DC' }}
              >
                {category.image ? (
                  <img
                    src={category.image}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center heading-serif text-lg text-charcoal/40">
                    {category.name.charAt(0)}
                  </span>
                )}
              </div>
              <span className="text-[11px] md:text-xs font-medium text-charcoal text-center leading-tight line-clamp-2 group-hover:text-rose-gold transition-colors">
                {category.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
