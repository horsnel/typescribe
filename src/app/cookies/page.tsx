'use client';
import Link from 'next/link';
import { Cookie, ChevronRight } from 'lucide-react';

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-[#050507] pt-8 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-12 py-8">
        <nav className="flex items-center gap-2 text-sm text-[#6b7280] mb-6">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-[#9ca3af]">Cookie Policy</span>
        </nav>
        <div className="flex items-center gap-3 mb-2">
          <Cookie className="w-7 h-7 text-[#e50914]" />
          <h1 className="text-3xl lg:text-4xl font-extrabold text-white">Cookie Policy</h1>
        </div>
        <p className="text-sm text-[#6b7280] mb-8">Last updated: April 22, 2026</p>

        <div className="space-y-6">
          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">1. What Are Cookies</h2>
            <p className="text-sm text-[#9ca3af] leading-relaxed">Cookies are small text files that are stored on your device when you visit a website. They are widely used to make websites work more efficiently, provide a better browsing experience, and supply information to the owners of the site. Cookies help websites remember your preferences, understand how you use the site, and improve your overall experience. Similar technologies like web beacons, pixel tags, and local storage may also be used for these purposes.</p>
          </div>

          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">2. How We Use Cookies</h2>
            <p className="text-sm text-[#9ca3af] leading-relaxed mb-3">We use cookies for several purposes: Essential cookies are necessary for the basic functionality of Typescribe, such as keeping you logged in and remembering your session. Analytics cookies help us understand how visitors interact with our platform, which pages are most popular, and where users encounter issues. Preference cookies remember your settings and choices, such as your preferred genre filters, display preferences, and notification settings.</p>
            <p className="text-sm text-[#9ca3af] leading-relaxed">We also use cookies to deliver personalized content and movie recommendations based on your browsing history, watchlist, and review activity. These cookies help us tailor the Typescribe experience to your unique tastes and interests.</p>
          </div>

          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">3. Third-Party Cookies</h2>
            <p className="text-sm text-[#9ca3af] leading-relaxed">Some cookies are placed by third-party services that appear on our pages. These include analytics providers like Google Analytics, which help us understand traffic patterns and user behavior. Embedded content from video platforms like YouTube for movie trailers may also set cookies. We do not control these third-party cookies and recommend reviewing the privacy policies of these providers for more information about their cookie practices.</p>
          </div>

          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">4. Managing Cookies</h2>
            <p className="text-sm text-[#9ca3af] leading-relaxed">You can control and manage cookies in your browser settings. Most browsers allow you to refuse or accept cookies, delete existing cookies, and set preferences for certain types of cookies. Please note that if you disable essential cookies, some features of Typescribe may not function properly. For example, you may not be able to stay logged in or save your watchlist. You can typically find cookie settings in the "Preferences" or "Settings" menu of your browser.</p>
          </div>

          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">5. Cookie Duration</h2>
            <p className="text-sm text-[#9ca3af] leading-relaxed">Session cookies are temporary and expire when you close your browser. Persistent cookies remain on your device for a set period or until you manually delete them. Our session cookies are used to maintain your logged-in state during a single visit, while persistent cookies may last anywhere from a few days to a year depending on their purpose. You can clear persistent cookies at any time through your browser settings.</p>
          </div>

          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">6. Changes to This Policy</h2>
            <p className="text-sm text-[#9ca3af] leading-relaxed">We may update this Cookie Policy from time to time to reflect changes in technology, legislation, or our data practices. We will notify you of any material changes by posting the updated policy on this page with a revised "Last updated" date. We encourage you to review this policy periodically to stay informed about how we use cookies.</p>
          </div>

          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">7. Contact Us</h2>
            <p className="text-sm text-[#9ca3af] leading-relaxed">If you have any questions about our use of cookies or this Cookie Policy, please contact us at <Link href="/contact" className="text-[#e50914] hover:underline">our contact page</Link> or email privacy@typescribe.com.</p>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/privacy" className="px-4 py-2 bg-[#0c0c10] border border-[#1e1e28] rounded-lg text-sm text-[#9ca3af] hover:text-white hover:border-[#3a3a45] transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="px-4 py-2 bg-[#0c0c10] border border-[#1e1e28] rounded-lg text-sm text-[#9ca3af] hover:text-white hover:border-[#3a3a45] transition-colors">Terms of Service</Link>
          <Link href="/accessibility" className="px-4 py-2 bg-[#0c0c10] border border-[#1e1e28] rounded-lg text-sm text-[#9ca3af] hover:text-white hover:border-[#3a3a45] transition-colors">Accessibility</Link>
        </div>
      </div>
    </div>
  );
}
