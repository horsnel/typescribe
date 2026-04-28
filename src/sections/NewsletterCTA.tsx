'use client';
import { useState } from 'react';
import { Mail, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NewsletterCTA() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');

    try {
      const response = await fetch('https://formspree.io/f/xreawkow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email, _subject: 'New Typescribe Newsletter Subscription' }),
      });

      if (response.ok) {
        setSubscribed(true);
      } else {
        const data = await response.json();
        setError(data.errors?.[0]?.message || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-20 bg-gradient-to-br from-[#d4a853] to-[#b8922e]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 text-center">
        <div className="reveal-section max-w-xl mx-auto">
          <div className="mb-6"><Mail className="w-12 h-12 text-white/80 mx-auto" /></div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 tracking-tight">Get Weekly Movie Picks</h2>
          <p className="text-white/70 mb-8 leading-relaxed">Curated recommendations delivered to your inbox every Friday. Stay updated with the latest releases, hidden gems, exclusive AI reviews, and community highlights.</p>
          {subscribed ? (
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center justify-center gap-3 text-white">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"><Check className="w-5 h-5" /></div>
                <span className="font-medium text-lg">Thanks for subscribing!</span>
              </div>
              <p className="text-white/60 text-sm">Check your inbox for a confirmation email.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="flex-1 bg-white/15 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-white/50 focus:outline-none focus:border-white/40 transition-colors"
              />
              <Button type="submit" disabled={loading} className="bg-white text-[#d4a853] hover:bg-white/90 font-semibold px-6 py-3 rounded-lg transition-colors disabled:opacity-60">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Subscribe'}
              </Button>
            </form>
          )}
          {error && <p className="text-white/80 text-sm mt-3">{error}</p>}
          <p className="text-white/50 text-xs mt-6">No spam. Unsubscribe anytime. Join 12,000+ movie lovers.</p>
        </div>
      </div>
    </section>
  );
}
