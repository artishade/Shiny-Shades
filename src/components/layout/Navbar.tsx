/* ===================================================
   - Flush Top Navbar (Open Design style)
   - Solid background, full-width, squared corners
   - Thin bottom border + soft shadow (no floating pill)
   - Hide on scroll DOWN / show on scroll UP
   - Colors pulled live from brandingConfig (BRAND.colors)
   =================================================== */

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Search, Menu, X, ChevronDown, Heart, Package } from 'lucide-react';
import { useCartStore, useUIStore, useCategoryStore, useContentStore } from '@/store';
import { BRAND } from '@/config/brandingConfig';
import { CONTACT } from '@/config/contactConfig';

interface NavbarProps {
  barVisible?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ barVisible = false }) => {
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const lastScrollY = useRef(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { mobileMenuOpen, setMobileMenuOpen } = useUIStore();
  const getItemCount = useCartStore(s => s.getItemCount);

  const { categories, loadCategories, loading: categoriesLoading } = useCategoryStore();
  const { loadContent, getSiteSettings } = useContentStore();
  const logoUrl = getSiteSettings().logoUrl;

  const itemCount = getItemCount();

  // Theme colors — pulled live from brandingConfig.ts
  const { primary, primaryDark, blush, blushLight, softBg, charcoal, warmGray } = BRAND.colors;

  useEffect(() => {
    loadCategories();
    loadContent();
  }, [loadCategories, loadContent]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrolled(currentScrollY > 40);

      if (currentScrollY < 60) {
        setHidden(false);
        lastScrollY.current = currentScrollY;
        return;
      }

      if (currentScrollY > lastScrollY.current + 4) {
        setHidden(true);
        setSearchOpen(false);
        setCategoriesOpen(false);
      } else if (currentScrollY < lastScrollY.current - 4) {
        setHidden(false);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setSearchOpen(false);
    setCategoriesOpen(false);
  }, [location.pathname, setMobileMenuOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setSearchOpen(false);
    }
  };

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Shop', path: '/shop' },
    { label: 'New Arrivals', path: '/new-arrivals' },
    { label: 'Sale', path: '/sale' },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname === path;
  };

  const renderCategoryLinks = (onClose?: () => void) => {
    if (categoriesLoading) {
      return (
        <p className="px-4 py-2 text-[10px] text-center" style={{ color: warmGray }}>
          Loading…
        </p>
      );
    }
    if (categories.length === 0) {
      return (
        <p className="px-4 py-2 text-[10px] text-center" style={{ color: warmGray }}>
          No categories yet
        </p>
      );
    }
    return categories.map(cat => (
      <button
        key={cat.id}
        type="button"
        onClick={() => {
          onClose?.();
          navigate(`/category/${cat.slug}`);
        }}
        className="block w-full text-left px-4 py-2 text-[10px] font-semibold tracking-wider uppercase rounded-lg transition-all duration-200"
        style={{ color: charcoal }}
        onMouseEnter={e => {
          e.currentTarget.style.backgroundColor = blushLight;
          e.currentTarget.style.color = primary;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = charcoal;
        }}
      >
        {cat.name}
      </button>
    ));
  };

  return (
    <>
      {/* ── Outer fixed wrapper: shifts down when announcement bar is visible ── */}
      <div
        className={`fixed left-0 right-0 z-50 pointer-events-none ${barVisible ? 'top-10' : 'top-0'
          }`}
      >
        {/* ── Flush Top Navbar ── */}
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{
            y: hidden ? -120 : 0,
            opacity: hidden ? 0 : 1,
          }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <nav
            className="w-full pointer-events-auto transition-all duration-300 border-b backdrop-blur-xl"
            style={{
              backgroundColor: scrolled ? `${softBg}CC` : `${softBg}99`,
              borderColor: scrolled ? `${charcoal}1A` : `${charcoal}0D`,
              boxShadow: scrolled
                ? '0 4px 24px -2px rgba(0,0,0,0.10)'
                : '0 1px 0 rgba(0,0,0,0.02)',
            }}
          >
            <div className="flex items-center justify-between h-16 md:h-[68px] px-4 md:px-8 lg:px-12">

              {/* Logo */}
              <Link to="/" className="flex-shrink-0 flex items-center gap-2.5 group">
                <div
                  className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden transition-transform duration-300 group-hover:scale-105"
                  style={{ backgroundColor: logoUrl ? 'transparent' : charcoal }}
                >
                  {logoUrl ? (
                    <img src={logoUrl} alt={BRAND.nameTop} className="w-full h-full object-cover" />
                  ) : (
                    <span
                      className="font-serif text-base md:text-lg font-bold"
                      style={{ color: softBg }}
                    >
                      {BRAND.nameTop?.charAt(0)?.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-start leading-none">
                  <span
                    className="font-serif text-[17px] md:text-[19px] font-semibold tracking-[0.08em] capitalize transition-colors duration-300"
                    style={{ color: charcoal }}
                  >
                    {BRAND.nameTop}
                  </span>
                  {BRAND.nameBottom && (
                    <span
                      className="font-serif text-[12px] md:text-[13px] font-medium tracking-[0.15em] mt-0.5"
                      style={{ color: warmGray }}
                    >
                      {BRAND.nameBottom}
                    </span>
                  )}
                </div>
              </Link>

              {/* Desktop Nav Links */}
              <div className="hidden md:flex items-center gap-6 lg:gap-9">
                {navLinks.map(link => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className="text-[13px] lg:text-[14px] font-semibold tracking-[0.18em] uppercase transition-colors duration-300 relative py-1"
                    style={{ color: isActive(link.path) ? primary : charcoal }}
                  >
                    {link.label}
                    {isActive(link.path) && (
                      <motion.span
                        layoutId="activeNavUnderline"
                        className="absolute -bottom-0.5 left-0 right-0 h-px"
                        style={{ backgroundColor: primary }}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </Link>
                ))}
              </div>

              {/* Right Side: Categories + Search + Cart + Hamburger */}
              <div className="flex items-center gap-1 md:gap-2">

                {/* Categories dropdown — desktop only */}
                <div
                  className="relative hidden md:block"
                  onMouseEnter={() => setCategoriesOpen(true)}
                  onMouseLeave={() => setCategoriesOpen(false)}
                >
                  <button
                    type="button"
                    onClick={() => setCategoriesOpen(o => !o)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold tracking-[0.12em] uppercase transition-colors duration-300"
                    style={{
                      color: categoriesOpen ? primary : charcoal,
                      backgroundColor: categoriesOpen ? blushLight : 'transparent',
                    }}
                  >
                    Categories
                    <ChevronDown
                      size={13}
                      className={`transition-transform duration-300 ${categoriesOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  <AnimatePresence>
                    {categoriesOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.97 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="absolute top-full right-0 pt-2 z-10"
                      >
                        <div
                          className="rounded-xl p-1.5 shadow-xl min-w-[190px] border"
                          style={{ backgroundColor: softBg, borderColor: `${charcoal}14` }}
                        >
                          {renderCategoryLinks()}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Search */}
                <button
                  onClick={() => setSearchOpen(!searchOpen)}
                  className="p-2 rounded-lg transition-all duration-300"
                  style={{ color: searchOpen ? primary : charcoal }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = blushLight)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  aria-label="Search"
                >
                  <Search size={19} />
                </button>

                {/* Cart */}
                <Link
                  to="/cart"
                  className="relative p-2 rounded-lg transition-all duration-300"
                  style={{ color: charcoal }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = blushLight)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  aria-label="Shopping bag"
                >
                  <ShoppingBag size={21} />
                  {itemCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 text-[8px] font-bold rounded-full flex items-center justify-center"
                      style={{ backgroundColor: primary, color: softBg }}
                    >
                      {itemCount}
                    </motion.span>
                  )}
                </Link>

                {/* Mobile menu toggle */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 rounded-lg transition-colors"
                  style={{ color: charcoal }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = blushLight)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
                </button>
              </div>
            </div>

            {/* Expandable Search */}
            <AnimatePresence>
              {searchOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: 'easeInOut' }}
                  className="overflow-hidden border-t"
                  style={{ borderColor: `${charcoal}0D` }}
                >
                  <form onSubmit={handleSearch} className="px-4 md:px-8 lg:px-12 py-3">
                    <div className="relative max-w-xl mx-auto">
                      <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: warmGray }} />
                      <input
                        type="text"
                        placeholder={`Search ${BRAND.searchHint ?? 'dresses, tops, accessories'}...`}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        autoFocus
                        className="w-full pl-10 pr-10 py-2.5 rounded-full border text-xs focus:outline-none transition-all"
                        style={{
                          backgroundColor: blushLight,
                          borderColor: `${charcoal}14`,
                          color: charcoal,
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full transition-colors"
                        style={{ backgroundColor: 'transparent' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = blush)}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <X size={12} style={{ color: warmGray }} />
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </nav>
        </motion.div>
      </div>
      {/* ═══ END FIXED HEADER — zero layout space taken ═══ */}


      {/* ── Mobile Drawer ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 backdrop-blur-sm z-40 md:hidden"
              style={{ backgroundColor: `${charcoal}40` }}
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="fixed left-0 top-0 bottom-0 w-72 z-[80] shadow-2xl overflow-y-auto md:hidden"
              style={{ backgroundColor: softBg }}
            >
              <div className="p-5">
                {/* Mobile drawer header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
                      style={{ backgroundColor: logoUrl ? 'transparent' : charcoal }}
                    >
                      {logoUrl ? (
                        <img src={logoUrl} alt={BRAND.nameTop} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-serif text-sm font-bold" style={{ color: softBg }}>
                          {BRAND.nameTop?.charAt(0)?.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col items-start leading-none">
                      <span className="font-serif text-sm font-semibold tracking-[0.1em] capitalize" style={{ color: charcoal }}>
                        {BRAND.nameTop}
                      </span>
                      {BRAND.nameBottom && (
                        <span className="font-serif text-[8px] font-normal tracking-[0.4em] mt-0.5" style={{ color: primary }}>
                          {BRAND.nameBottom}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 rounded-full transition-colors"
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = blushLight)}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <X size={17} style={{ color: charcoal }} />
                  </button>
                </div>

                {/* Mobile search */}
                <form onSubmit={handleSearch} className="mb-5">
                  <div className="relative">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: warmGray }} />
                    <input
                      type="text"
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-full border text-xs focus:outline-none transition-all"
                      style={{ backgroundColor: blushLight, borderColor: `${charcoal}14`, color: charcoal }}
                    />
                  </div>
                </form>

                {/* Main nav links */}
                <div className="space-y-0.5 mb-5">
                  {navLinks.map(link => (
                    <Link
                      key={link.path}
                      to={link.path}
                      className="block px-4 py-2.5 rounded-xl text-[10px] font-semibold tracking-[0.25em] uppercase transition-colors"
                      style={{
                        backgroundColor: isActive(link.path) ? blushLight : 'transparent',
                        color: isActive(link.path) ? primary : charcoal,
                      }}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>

                <div className="h-px my-4" style={{ backgroundColor: `${charcoal}14` }} />

                {/* Categories */}
                <p className="px-4 text-[9px] font-semibold uppercase tracking-[0.3em] mb-2" style={{ color: warmGray }}>
                  Categories
                </p>
                <div className="space-y-0.5 mb-5">
                  {renderCategoryLinks(() => setMobileMenuOpen(false))}
                </div>

                <div className="h-px my-4" style={{ backgroundColor: `${charcoal}14` }} />

                {/* Account / utility links */}
                <p className="px-4 text-[9px] font-semibold uppercase tracking-[0.3em] mb-2" style={{ color: warmGray }}>
                  My Account
                </p>
                <div className="space-y-0.5 mb-5">
                  <Link
                    to="/wishlist"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[10px] font-semibold tracking-[0.25em] uppercase transition-colors"
                    style={{
                      backgroundColor: isActive('/wishlist') ? blushLight : 'transparent',
                      color: isActive('/wishlist') ? primary : charcoal,
                    }}
                  >
                    <Heart size={13} />
                    Wishlist
                  </Link>

                  <Link
                    to="/track-order"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[10px] font-semibold tracking-[0.25em] uppercase transition-colors"
                    style={{
                      backgroundColor: isActive('/track-order') ? blushLight : 'transparent',
                      color: isActive('/track-order') ? primary : charcoal,
                    }}
                  >
                    <Package size={13} />
                    Track Order
                  </Link>
                </div>

                <div className="h-px my-4" style={{ backgroundColor: `${charcoal}14` }} />

                {/* Cart */}
                <Link
                  to="/cart"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors"
                  style={{ backgroundColor: blushLight }}
                >
                  <ShoppingBag size={16} style={{ color: charcoal }} />
                  <span className="text-[10px] font-semibold tracking-[0.22em] uppercase" style={{ color: charcoal }}>
                    Shopping Bag ({itemCount})
                  </span>
                </Link>

                {/* Contact info from contactConfig */}
                {CONTACT?.phone && (
                  <>
                    <div className="h-px my-4" style={{ backgroundColor: `${charcoal}14` }} />
                    <a
                      href={`tel:${CONTACT.phone}`}
                      className="flex items-center gap-2 px-4 py-2 text-[9px] tracking-wider"
                      style={{ color: warmGray }}
                    >
                      📞 {CONTACT.phone}
                    </a>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};