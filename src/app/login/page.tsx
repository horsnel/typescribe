'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Film, Eye, EyeOff, AlertCircle, Github, Chrome, Loader2, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // If already authenticated, redirect
  if (isAuthenticated) {
    router.replace('/');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else if (result?.ok) {
        router.push('/');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    // Submit to Formspree for password reset
    try {
      await fetch('https://formspree.io/f/xreawkow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, _subject: 'Typescribe Password Reset Request', type: 'password_reset' }),
      });
    } catch { /* silent */ }
    setForgotSent(true);
  };

  return (
    <div className="min-h-screen bg-[#050507] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <Film className="w-8 h-8 text-[#D4A853]" strokeWidth={1.5} />
            <span className="text-2xl font-extrabold text-white">Typescribe</span>
          </Link>
          <h1 className="text-2xl font-bold text-white mb-2">Welcome back</h1>
          <p className="text-[#6b7280]">Sign in to your account to continue</p>
        </div>

        {showForgotPassword ? (
          /* Forgot Password Form */
          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <KeyRound className="w-5 h-5 text-[#D4A853]" strokeWidth={1.5} />
              <h2 className="text-lg font-semibold text-white">Reset Password</h2>
            </div>
            {forgotSent ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <p className="text-white font-medium mb-1">Check your email</p>
                <p className="text-sm text-[#6b7280]">If an account exists with that email, we&apos;ve sent password reset instructions.</p>
                <button onClick={() => { setShowForgotPassword(false); setForgotSent(false); }} className="text-sm text-[#D4A853] hover:underline mt-4">Back to Sign In</button>
              </div>
            ) : (
              <>
                <p className="text-sm text-[#9ca3af]">Enter your email address and we&apos;ll send you instructions to reset your password.</p>
                <div>
                  <label className="text-sm font-medium text-white mb-1.5 block">Email</label>
                  <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg py-2.5 px-3 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#D4A853]" placeholder="you@example.com" />
                </div>
                <Button onClick={handleForgotPassword} className="w-full bg-[#D4A853] hover:bg-[#B8922F] text-white font-medium">Send Reset Link</Button>
                <button onClick={() => setShowForgotPassword(false)} className="text-sm text-[#6b7280] hover:text-white transition-colors w-full text-center">Back to Sign In</button>
              </>
            )}
          </div>
        ) : (
          /* Login Form */
          <>
            {/* Social Login */}
            <div className="space-y-3 mb-6">
              <button
                onClick={() => signIn('google', { callbackUrl: '/' })}
                className="w-full flex items-center justify-center gap-3 bg-white text-black font-medium py-2.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Chrome className="w-5 h-5" strokeWidth={1.5} /> Continue with Google
              </button>
              <button
                onClick={() => signIn('github', { callbackUrl: '/' })}
                className="w-full flex items-center justify-center gap-3 bg-[#24292e] text-white font-medium py-2.5 rounded-lg hover:bg-[#2f363d] transition-colors"
              >
                <Github className="w-5 h-5" strokeWidth={1.5} /> Continue with GitHub
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-[#2a2a35]" />
              <span className="text-xs text-[#6b7280]">OR</span>
              <div className="flex-1 h-px bg-[#2a2a35]" />
            </div>

            <form onSubmit={handleSubmit} className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6 space-y-4">
              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" strokeWidth={1.5} />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-white mb-1.5 block">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg py-2.5 px-3 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#D4A853]"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-white mb-1.5 block">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg py-2.5 px-3 pr-10 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#D4A853]"
                    placeholder="Your password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280] hover:text-white">
                    {showPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded border-[#1e1e28] bg-[#050507] text-[#D4A853] focus:ring-[#D4A853]" />
                  <span className="text-xs text-[#6b7280]">Remember me</span>
                </label>
                <button type="button" onClick={() => setShowForgotPassword(true)} className="text-xs text-[#D4A853] hover:underline">
                  Forgot password?
                </button>
              </div>

              <Button type="submit" disabled={loading} className="w-full bg-[#D4A853] hover:bg-[#B8922F] text-white font-medium">
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" strokeWidth={1.5} /> : 'Sign In'}
              </Button>

              <p className="text-center text-sm text-[#6b7280]">
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="text-[#D4A853] hover:underline">Sign Up</Link>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
