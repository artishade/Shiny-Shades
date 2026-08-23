/* ===================================================
   Shiny Shades - Reusable UI Components
   =================================================== */

import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { X } from 'lucide-react';
import { SITE } from '@/config/siteConfig';

// ===== Button Component =====
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-rose-gold/30 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-rose-gold text-white hover:bg-deep-rose shadow-lg shadow-rose-gold/20 hover:shadow-rose-gold/40',
    secondary: 'bg-blush text-charcoal hover:bg-blush-dark',
    outline: 'border-2 border-rose-gold text-rose-gold hover:bg-rose-gold hover:text-white',
    ghost: 'text-charcoal hover:bg-blush-light',
    danger: 'bg-red-500 text-white hover:bg-red-600',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm gap-1.5',
    md: 'px-6 py-2.5 text-sm gap-2',
    lg: 'px-8 py-3.5 text-base gap-2.5',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
};

// ===== Input Component =====
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', id, ...props }) => {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-[#6B5B55] mb-1.5">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full px-4 py-2.5 rounded-xl border bg-white/80 text-charcoal placeholder:text-[#6B5B55]/50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-rose-gold/30 focus:border-rose-gold ${error ? 'border-red-400' : 'border-blush/30'
          } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};

// ===== Textarea Component =====
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, error, className = '', id, ...props }) => {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-[#6B5B55] mb-1.5">
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={`w-full px-4 py-2.5 rounded-xl border bg-white/80 text-charcoal placeholder:text-[#6B5B55]/50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-rose-gold/30 focus:border-rose-gold resize-none ${error ? 'border-red-400' : 'border-blush/30'
          } ${className}`}
        rows={4}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};

// ===== Select Component =====
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, options, className = '', id, ...props }) => {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-[#6B5B55] mb-1.5">
          {label}
        </label>
      )}
      <select
        id={id}
        className={`w-full px-4 py-2.5 rounded-xl border border-blush/30 bg-white/80 text-charcoal transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-rose-gold/30 focus:border-rose-gold ${className}`}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
};

// ===== Badge Component =====
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'sale' | 'new' | 'trending' | 'featured' | 'success' | 'warning' | 'danger';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-blush-light text-deep-rose',
    sale: 'bg-red-100 text-red-700',
    new: 'bg-lavender text-deep-rose',
    trending: 'bg-champagne text-deep-rose',
    featured: 'bg-blush text-charcoal',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-600',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

// ===== Modal Component =====
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`relative w-full ${sizes[size]} glass-card rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto`}
      >
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h3 className="heading-serif text-xl font-semibold text-charcoal">{title}</h3>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-blush-light transition-colors">
              <X size={20} className="text-[#6B5B55]" />
            </button>
          </div>
        )}
        {children}
      </motion.div>
    </div>
  );
};

// ===== Fade-In Wrapper =====
interface FadeInProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
}

export const FadeIn: React.FC<FadeInProps> = ({ children, delay = 0, direction = 'up', ...props }) => {
  const directions = {
    up: { y: 30 },
    down: { y: -30 },
    left: { x: 30 },
    right: { x: -30 },
    none: {},
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...directions[direction] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// ===== Section Header =====
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  center?: boolean;
  light?: boolean;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, center = true, light = false }) => {
  return (
    <div className={`mb-10 ${center ? 'text-center' : ''}`}>
      <h2 className={`heading-serif text-3xl md:text-4xl lg:text-5xl font-semibold mb-3 ${light ? 'text-white' : 'text-charcoal'}`}>
        {title}
      </h2>
      {subtitle && (
        <p className={`text-base md:text-lg max-w-2xl ${center ? 'mx-auto' : ''} ${light ? 'text-white/80' : 'text-[#6B5B55]'}`}>
          {subtitle}
        </p>
      )}
      <div className={`luxury-line mt-6 ${center ? 'mx-auto' : ''} w-24`} />
    </div>
  );
};

// ===== Empty State =====
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="text-blush mb-4">{icon}</div>}
      <h3 className="heading-serif text-2xl font-semibold text-charcoal mb-2">{title}</h3>
      <p className="text-[#6B5B55] max-w-md mb-6">{description}</p>
      {action}
    </div>
  );
};

// ===== Price Display =====
interface PriceDisplayProps {
  price: number;
  comparePrice?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({ price, comparePrice, size = 'md' }) => {
  const sizes = { sm: 'text-sm', md: 'text-lg', lg: 'text-2xl' };
  const saleSizes = { sm: 'text-xs', md: 'text-sm', lg: 'text-lg' };

  return (
    <div className="flex items-center gap-2">
      <span className={`${sizes[size]} font-semibold text-charcoal`}>
        {SITE.currency.symbol}{price.toFixed(2)}
      </span>
      {comparePrice && comparePrice > price && (
        <span className={`${saleSizes[size]} text-[#6B5B55] line-through`}>
          {SITE.currency.symbol}{comparePrice.toFixed(2)}
        </span>
      )}
      {comparePrice && comparePrice > price && (
        <Badge variant="sale">
          {Math.round(((comparePrice - price) / comparePrice) * 100)}% OFF
        </Badge>
      )}
    </div>
  );
};

// ===== Star Rating =====
interface StarRatingProps {
  rating: number;
  count?: number;
  size?: number;
}

export const StarRating: React.FC<StarRatingProps> = ({ rating, count, size = 16 }) => {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <svg
          key={star}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={star <= Math.round(rating) ? '#B76E79' : '#E8E8E8'}
          className="flex-shrink-0"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
      {count !== undefined && (
        <span className="text-sm text-[#6B5B55] ml-1">({count})</span>
      )}
    </div>
  );
};
