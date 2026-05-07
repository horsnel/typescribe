'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Film, Eye, EyeOff, AlertCircle, Github, Chrome, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';

export default function SignupPage() {
  const router = useRouter();
  const { signup, isAuthenticated } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // If already authenticated, redirect
  if (isAuthenticated) {
    router.replace('/');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!agreedToTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      // Register the user via our API
      const regRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, display_name: name }),
      });

      if (!regRes.ok) {
        const data = await regRes.json().catch(() => ({}));
        setError(data.error || 'Registration failed');
        return;
      }

      // Auto sign-in after registration
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.ok) {
        router.push('/onboarding');
      } else {
        setError('Account created but sign-in failed. Please log in manually.');
        router.push('/login');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Password strength
  const getPasswordStrength = () => {
    if (!password) return { level: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 1) return { level: 1, label: 'Weak', color: 'bg-red-500' };
    if (score <= 2) return { level: 2, label: 'Fair', color: 'bg-orange-500' };
    if (score <= 3) return { level: 3, label: 'Good', color: 'bg-yellow-500' };
    if (score <= 4) return { level: 4, label: 'Strong', color: 'bg-green-400' };
    return { level: 5, label: 'Very Strong', color: 'bg-green-500' };
  };

  const strength = getPasswordStrength();

  return (
    <div className="min-h-screen bg-[#050507] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <Film className="w-8 h-8 text-[#8B5CF6]" strokeWidth={1.5} />
            <span className="text-2xl font-extrabold text-white">Typescribe</span>
          </Link>
          <h1 className="text-2xl font-bold text-white mb-2">Create your account</h1>
          <p className="text-[#6b7280]">Join the community of movie lovers</p>
        </div>

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

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" strokeWidth={1.5} />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-white mb-1.5 block">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg py-2.5 px-3 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#8B5CF6]"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-white mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg py-2.5 px-3 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#8B5CF6]"
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
                className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg py-2.5 px-3 pr-10 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#8B5CF6]"
                placeholder="At least 6 characters"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280] hover:text-white">
                {showPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
              </button>
            </div>
            {/* Password Strength */}
            {password && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full ${i < strength.level ? strength.color : 'bg-[#2a2a35]'}`} />
                  ))}
                </div>
                <p className="text-xs text-[#6b7280]">{strength.label}</p>
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-white mb-1.5 block">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg py-2.5 px-3 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#8B5CF6]"
              placeholder="Repeat your password"
            />
            {confirmPassword && password && (
              <p className={`text-xs mt-1 flex items-center gap-1 ${password === confirmPassword ? 'text-green-400' : 'text-red-400'}`}>
                {password === confirmPassword ? <><Check className="w-3 h-3" strokeWidth={1.5} /> Passwords match</> : 'Passwords do not match'}
              </p>
            )}
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 rounded border-[#1e1e28] bg-[#050507] text-[#8B5CF6] focus:ring-[#8B5CF6]"
            />
            <span className="text-xs text-[#6b7280]">
              I agree to the{' '}
              <Link href="/terms" className="text-[#9ca3af] hover:text-white">Terms of Service</Link> and{' '}
              <Link href="/privacy" className="text-[#9ca3af] hover:text-white">Privacy Policy</Link>
            </span>
          </label>

          <Button
            type="submit"
            disabled={loading || !agreedToTerms}
            className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-medium disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" strokeWidth={1.5} /> : 'Sign Up'}
          </Button>

          <p className="text-center text-sm text-[#6b7280]">
            Already have an account?{' '}
            <Link href="/login" className="text-[#8B5CF6] hover:underline">Sign In</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
