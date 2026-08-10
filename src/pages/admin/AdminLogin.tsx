/* ===================================================
   Shiny Shades - Admin Login Page
   Real Supabase Authentication (no demo credentials)
   =================================================== */
import { useAdminAuthStore } from '@/store';
import { BRAND } from '@/config/brandingConfig';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Mail, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui';
import { signIn } from '@/lib/supabase';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { setAuthenticated } = useAdminAuthStore();


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      setAuthenticated(true);
      navigate('/admin/dashboard');
    } catch {
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen admin-gradient flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="glass-card rounded-3xl p-8 md:p-10">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="heading-serif text-2xl font-bold text-charcoal">
              {BRAND.nameTop}
              <span className="block text-[10px] font-sans font-normal tracking-[0.3em] text-rose-gold">{BRAND.nameBottom}</span>
            </h1>
            <p className="text-sm text-[#6B5B55] mt-2">Admin Panel — Sign in to manage your store</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 mb-6 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#6B5B55] mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B5B55]" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your admin email"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-blush/30 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-rose-gold/30"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#6B5B55] mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B5B55]" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-blush/30 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-rose-gold/30"
                  required
                />
              </div>
            </div>

            <Button type="submit" fullWidth size="lg" loading={loading}>
              Sign In
            </Button>
          </form>

          {/* ✅ No demo credentials shown */}
        </div>

        <div className="text-center mt-6">
          <a href="/" className="text-sm text-[#6B5B55] hover:text-rose-gold transition-colors">
            ← Back to store
          </a>
        </div>
      </motion.div>
    </div>
  );
};