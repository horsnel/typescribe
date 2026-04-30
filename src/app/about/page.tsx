'use client';

import { Film, Sparkles, Users, Shield, BarChart3, Globe, Cpu, Heart, Star, TrendingUp, Award, Zap } from 'lucide-react';
import Link from 'next/link';

const stats = [
  { label: 'Movies Reviewed', value: '12,500+', icon: Film },
  { label: 'AI Reviews Generated', value: '50,000+', icon: Sparkles },
  { label: 'Community Members', value: '85,000+', icon: Users },
  { label: 'Countries Reached', value: '120+', icon: Globe },
];

const values = [
  { icon: Sparkles, title: 'AI-Powered Reviews', desc: 'Our AI analyzes plot structure, performances, cinematography, pacing, and thematic depth to generate comprehensive reviews that complement human perspectives. Each review is the product of sophisticated natural language processing trained on decades of film criticism.' },
  { icon: Users, title: 'Community Driven', desc: 'Real user reviews and ratings provide the human perspective that algorithms cannot replicate. Vote on helpful reviews, share your own thoughts, and engage in meaningful discussions about the films that move you. Our community is the heartbeat of Typescribe.' },
  { icon: Shield, title: 'Trust & Transparency', desc: 'Every AI-generated review is clearly labeled as such. We believe in honest, transparent film criticism that respects both the art of cinema and the intelligence of our audience. We never disguise AI content as human writing.' },
  { icon: BarChart3, title: 'Multi-Source Ratings', desc: 'We aggregate ratings from IMDb, Rotten Tomatoes, and Metacritic alongside our own AI scores and community ratings, giving you the most comprehensive picture of a film\'s quality before you invest your time.' },
  { icon: Cpu, title: 'Smart Recommendations', desc: 'Our recommendation engine learns from your watchlist, ratings, and genre preferences to suggest movies you will genuinely enjoy. The more you use Typescribe, the better our suggestions become.' },
  { icon: Heart, title: 'Made for Film Lovers', desc: 'Whether you are a casual moviegoer or a dedicated cinephile, Typescribe is designed to enhance your film discovery experience. We celebrate the art of cinema in all its forms, from blockbusters to indie gems.' },
];

const team = [
  { name: 'Alex Chen', role: 'Founder & CEO', bio: 'Former film critic turned tech entrepreneur. Alex founded Typescribe to bridge the gap between AI capabilities and genuine film appreciation.' },
  { name: 'Maya Rodriguez', role: 'Head of AI', bio: 'PhD in Natural Language Processing from MIT. Maya leads the team that trains our review generation models on the finest film criticism.' },
  { name: 'James Okafor', role: 'Head of Community', bio: 'With a decade of community management experience, James ensures Typescribe remains a welcoming space for diverse film perspectives.' },
  { name: 'Sarah Kim', role: 'Lead Designer', bio: 'Award-winning UX designer who believes that discovering movies should be as cinematic as watching them.' },
];

const timeline = [
  { year: '2023', title: 'The Idea', desc: 'Typescribe was born from a simple question: what if AI could help people discover great movies without replacing the human voices that make criticism valuable?' },
  { year: '2024', title: 'AI Review Engine', desc: 'After months of training on curated film criticism, our AI review engine launched, generating thoughtful, nuanced reviews that complement rather than replace human perspectives.' },
  { year: '2025', title: 'Community Launch', desc: 'We opened our community platform, allowing film lovers to share their own reviews, build watchlists, and connect with fellow cinephiles around the world.' },
  { year: '2026', title: 'Global Reach', desc: 'Typescribe now serves movie lovers in over 120 countries, with reviews in multiple languages and a thriving community of 85,000+ members.' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#050507] pt-8 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-12 py-8">

        {/* Hero */}
        <div className="mb-16">
          <h1 className="text-3xl lg:text-5xl font-extrabold text-white mb-4 leading-tight">About <span className="text-[#d4a853]">Typescribe</span></h1>
          <p className="text-lg text-[#9ca3af] leading-relaxed max-w-3xl">Typescribe is an AI-powered movie review platform that combines cutting-edge artificial intelligence with genuine community insights. Our mission is to help you discover your next favorite movie with reviews that are both intelligent and authentic — because the best film criticism combines the breadth of data with the depth of human experience.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-16">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-5 text-center">
              <Icon className="w-6 h-6 text-[#d4a853] mx-auto mb-2" />
              <div className="text-2xl font-extrabold text-white mb-1">{value}</div>
              <div className="text-xs text-[#6b7280]">{label}</div>
            </div>
          ))}
        </div>

        {/* Our Values */}
        <div className="mb-16">
          <h2 className="text-2xl lg:text-3xl font-extrabold text-white mb-8">What Makes Us Different</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6 hover:border-[#3a3a45] transition-colors">
                <Icon className="w-8 h-8 text-[#d4a853] mb-3" />
                <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-[#9ca3af] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-16">
          <h2 className="text-2xl lg:text-3xl font-extrabold text-white mb-8">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: '01', icon: TrendingUp, title: 'Discover', desc: 'Browse our curated library of thousands of movies, filtered by genre, rating, release date, or popularity. Our smart recommendations learn what you love.' },
              { step: '02', icon: Sparkles, title: 'Read AI + Community Reviews', desc: 'Get the full picture with AI-generated analysis alongside real user opinions. See aggregated ratings from IMDb, Rotten Tomatoes, and Metacritic in one place.' },
              { step: '03', icon: Star, title: 'Decide & Share', desc: 'Make informed viewing decisions, add movies to your watchlist, and share your own reviews with the community. Your voice matters.' },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="relative bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
                <span className="absolute top-4 right-4 text-4xl font-extrabold text-[#1a1a25]">{step}</span>
                <Icon className="w-8 h-8 text-[#d4a853] mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-[#9ca3af] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="mb-16">
          <h2 className="text-2xl lg:text-3xl font-extrabold text-white mb-8">Our Journey</h2>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-[#2a2a35]" />
            <div className="space-y-8">
              {timeline.map(({ year, title, desc }) => (
                <div key={year} className="relative pl-12">
                  <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-[#d4a853] flex items-center justify-center">
                    <Award className="w-4 h-4 text-white" strokeWidth={1.5} />
                  </div>
                  <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-5">
                    <span className="text-xs font-semibold text-[#d4a853] uppercase tracking-wider">{year}</span>
                    <h3 className="text-lg font-semibold text-white mt-1 mb-2">{title}</h3>
                    <p className="text-sm text-[#9ca3af] leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Team */}
        <div className="mb-16">
          <h2 className="text-2xl lg:text-3xl font-extrabold text-white mb-8">Meet the Team</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map(({ name, role, bio }) => (
              <div key={name} className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-5 text-center hover:border-[#3a3a45] transition-colors">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#d4a853] to-[#b8922e] flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">
                  {name.split(' ').map(n => n[0]).join('')}
                </div>
                <h3 className="text-base font-semibold text-white">{name}</h3>
                <p className="text-xs text-[#d4a853] font-medium mb-2">{role}</p>
                <p className="text-xs text-[#9ca3af] leading-relaxed">{bio}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-br from-[#d4a853]/20 to-[#b8922e]/10 border border-[#d4a853]/20 rounded-2xl p-8 text-center">
          <Zap className="w-10 h-10 text-[#d4a853] mx-auto mb-4" strokeWidth={1.5} />
          <h2 className="text-2xl font-bold text-white mb-3">Ready to Discover Great Movies?</h2>
          <p className="text-[#9ca3af] mb-6 max-w-md mx-auto">Join our community of film lovers and let AI-powered insights guide your next movie night.</p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/browse" className="inline-flex items-center justify-center bg-[#d4a853] hover:bg-[#b8922e] text-white font-semibold px-6 py-3 rounded-lg text-sm transition-colors">Browse Movies</Link>
            <Link href="/signup" className="inline-flex items-center justify-center border border-white/20 bg-transparent text-white hover:bg-white/10 font-semibold px-6 py-3 rounded-lg text-sm transition-colors">Create Account</Link>
          </div>
        </div>

      </div>
    </div>
  );
}
