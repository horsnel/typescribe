'use client';
import { useState } from 'react';
import { Mail, MessageSquare, Send, Loader2, ChevronDown, ChevronUp, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const faqs = [
  { q: 'How are AI reviews generated?', a: 'Our AI reviews are generated using advanced natural language processing models trained on curated film criticism. Each review analyzes plot structure, performances, cinematography, pacing, and thematic depth. All AI reviews are clearly labeled and should not replace professional criticism.' },
  { q: 'Can I contribute my own reviews?', a: 'Absolutely! Once you create a free account, you can rate and review any movie in our library. Your reviews help other users make informed decisions and contribute to our community-driven ratings.' },
  { q: 'How do you aggregate ratings?', a: 'We pull ratings from multiple trusted sources including IMDb, Rotten Tomatoes, and Metacritic, then combine them with our AI score and community ratings to give you the most complete picture of a film\'s quality.' },
  { q: 'Is Typescribe free to use?', a: 'Yes! Browsing movies, reading AI and community reviews, and creating an account are all completely free. We believe great film discovery should be accessible to everyone.' },
  { q: 'How do I report an error or outdated information?', a: 'Please use the contact form on this page to report any errors. We regularly update our database, but with thousands of movies, community feedback is invaluable in keeping our information accurate.' },
  { q: 'Can I suggest a movie to be added?', a: 'Of course! Send us the movie title through the contact form and we will add it to our review queue. We are constantly expanding our library based on user suggestions and new releases.' },
];

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [subject, setSubject] = useState('general');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {
      const response = await fetch('https://formspree.io/f/xreawkow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          ...data,
          _subject: `Typescribe Contact: ${data.subject || 'General Inquiry'}`,
        }),
      });

      if (response.ok) {
        setSent(true);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050507] pt-8 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-12 py-8">

        <h1 className="text-3xl lg:text-4xl font-extrabold text-white mb-2">Contact Us</h1>
        <p className="text-[#6b7280] mb-10 max-w-xl">Have a question, feedback, or want to suggest a movie? We would love to hear from you. Our team typically responds within 24 hours.</p>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10 mb-16">
          {/* Contact Form */}
          <div>
            {sent ? (
              <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-10 text-center">
                <Mail className="w-14 h-14 text-[#d4a853] mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Message Sent!</h2>
                <p className="text-[#9ca3af] mb-1">Thank you for reaching out. We will get back to you as soon as possible.</p>
                <p className="text-sm text-[#6b7280]">Typical response time: within 24 hours</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
                {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">{error}</div>}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-white mb-1.5 block">Name</label>
                    <input name="name" type="text" required className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg py-2.5 px-3 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#d4a853]" placeholder="Your name" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-white mb-1.5 block">Email</label>
                    <input name="email" type="email" required className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg py-2.5 px-3 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#d4a853]" placeholder="you@example.com" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-white mb-1.5 block">Subject</label>
                  <select name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-[#d4a853]">
                    <option value="general">General Inquiry</option>
                    <option value="feedback">Feedback & Suggestions</option>
                    <option value="bug">Bug Report</option>
                    <option value="movie-request">Movie Request</option>
                    <option value="partnership">Partnership</option>
                    <option value="press">Press & Media</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-white mb-1.5 block">Message</label>
                  <textarea name="message" rows={6} required className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg py-2.5 px-3 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#d4a853] resize-none" placeholder="Tell us what's on your mind..." />
                </div>

                <Button type="submit" disabled={loading} className="bg-[#d4a853] hover:bg-[#b8922e] text-white gap-2 disabled:opacity-60">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send Message
                </Button>
              </form>
            )}
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Get in Touch</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-[#d4a853] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-white font-medium">Email</p>
                    <p className="text-xs text-[#6b7280]">hello@typescribe.com</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-[#d4a853] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-white font-medium">Response Time</p>
                    <p className="text-xs text-[#6b7280]">Usually within 24 hours</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#d4a853] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-white font-medium">Location</p>
                    <p className="text-xs text-[#6b7280]">San Francisco, CA & Remote</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Specific Inquiries</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-[#1e1e28]">
                  <span className="text-[#9ca3af]">Press & Media</span>
                  <span className="text-white">press@typescribe.com</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#1e1e28]">
                  <span className="text-[#9ca3af]">Partnerships</span>
                  <span className="text-white">partners@typescribe.com</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#1e1e28]">
                  <span className="text-[#9ca3af]">DMCA / Legal</span>
                  <span className="text-white">dmca@typescribe.com</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-[#9ca3af]">Privacy</span>
                  <span className="text-white">privacy@typescribe.com</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-2xl lg:text-3xl font-extrabold text-white mb-8">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-[#111118] transition-colors"
                >
                  <span className="text-sm font-medium text-white pr-4">{faq.q}</span>
                  {openFaq === i ? <ChevronUp className="w-4 h-4 text-[#d4a853] flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-[#6b7280] flex-shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 pt-0">
                    <p className="text-sm text-[#9ca3af] leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
