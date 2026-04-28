'use client';
import Link from 'next/link';
import { Scale, ChevronRight } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#050507] pt-8 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-12 py-8">
        <nav className="flex items-center gap-2 text-sm text-[#6b7280] mb-6">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-[#9ca3af]">Terms of Service</span>
        </nav>
        <div className="flex items-center gap-3 mb-2">
          <Scale className="w-7 h-7 text-[#e50914]" />
          <h1 className="text-3xl lg:text-4xl font-extrabold text-white">Terms of Service</h1>
        </div>
        <p className="text-sm text-[#6b7280] mb-8">Last updated: April 22, 2026</p>

        <div className="space-y-6">
          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">1. Acceptance of Terms</h2>
            <p className="text-sm text-[#9ca3af] leading-relaxed">By accessing or using Typescribe, you agree to be bound by these Terms of Service. If you do not agree to all of these terms, please do not use our service. Your continued use of the platform following the posting of any changes constitutes acceptance of those changes. We recommend reviewing these terms periodically to stay informed of any updates.</p>
          </div>

          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">2. Description of Service</h2>
            <p className="text-sm text-[#9ca3af] leading-relaxed">Typescribe is an AI-powered movie review platform that provides AI-generated reviews, community ratings, watchlist features, and movie discovery tools. Our service aggregates ratings from multiple sources including IMDb, Rotten Tomatoes, and Metacritic, and combines them with AI analysis and user-generated content to help you make informed viewing decisions. We reserve the right to modify, suspend, or discontinue any aspect of the service at any time without prior notice.</p>
          </div>

          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">3. User Accounts</h2>
            <p className="text-sm text-[#9ca3af] leading-relaxed">You must create an account to access certain features of Typescribe, including writing reviews, creating watchlists, and participating in discussions. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate and complete information when creating your account and update it as necessary. You must be at least 13 years old to create an account.</p>
          </div>

          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">4. User Content</h2>
            <p className="text-sm text-[#9ca3af] leading-relaxed">You retain ownership of the content you submit to Typescribe, including reviews, comments, and other contributions. By posting content on our platform, you grant Typescribe a non-exclusive, worldwide, royalty-free license to use, reproduce, modify, display, and distribute that content in connection with our service. You represent that you have all rights necessary to grant us this license, and you are responsible for ensuring your content does not violate any third-party rights.</p>
          </div>

          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">5. Acceptable Use</h2>
            <p className="text-sm text-[#9ca3af] leading-relaxed">You agree not to misuse the Typescribe service or help anyone else do so. This includes posting harmful, threatening, abusive, or defamatory content; spamming or flooding the platform with repetitive content; impersonating other users or individuals; attempting to gain unauthorized access to our systems; violating any applicable laws or regulations; and using automated tools to scrape or collect data from our platform without permission. We reserve the right to remove any content that violates these terms.</p>
          </div>

          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">6. AI-Generated Content</h2>
            <p className="text-sm text-[#9ca3af] leading-relaxed">Typescribe uses artificial intelligence to generate movie reviews and other content. All AI-generated content is clearly labeled as such. Our AI reviews are provided for informational and entertainment purposes only and should not replace professional film criticism. While we strive for accuracy and quality in our AI-generated content, we cannot guarantee that it is free from errors, biases, or inaccuracies. You should not rely solely on AI-generated reviews when making viewing decisions.</p>
          </div>

          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">7. Intellectual Property</h2>
            <p className="text-sm text-[#9ca3af] leading-relaxed">Typescribe's original content, features, functionality, and software are owned by us and are protected by international copyright, trademark, patent, and other intellectual property laws. Movie posters, images, and related media are the property of their respective owners and are used under fair use or with permission for review and commentary purposes. You may not reproduce, distribute, or create derivative works from our content without explicit written permission.</p>
          </div>

          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">8. Limitation of Liability</h2>
            <p className="text-sm text-[#9ca3af] leading-relaxed">Typescribe is provided on an "as-is" and "as-available" basis without warranties of any kind. We do not guarantee the accuracy, completeness, or reliability of any content on the platform. To the fullest extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service, including but not limited to damages for loss of profits, data, or other intangible losses.</p>
          </div>

          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">9. Termination</h2>
            <p className="text-sm text-[#9ca3af] leading-relaxed">We may suspend or terminate your account at any time for violation of these terms or for any other reason at our discretion. Upon termination, your right to use the service will immediately cease. You may also terminate your account at any time by contacting us or through your account settings. Provisions of these terms that by their nature should survive termination shall remain in effect.</p>
          </div>

          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">10. Changes to Terms</h2>
            <p className="text-sm text-[#9ca3af] leading-relaxed">We may update these Terms of Service from time to time. We will notify you of material changes by posting the updated terms on our website and updating the "Last updated" date. Your continued use of the service after changes are posted constitutes your acceptance of the revised terms. We encourage you to review these terms periodically.</p>
          </div>

          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">11. Contact Us</h2>
            <p className="text-sm text-[#9ca3af] leading-relaxed">If you have any questions about these Terms of Service, please contact us at <Link href="/contact" className="text-[#e50914] hover:underline">our contact page</Link> or email legal@typescribe.com. We aim to respond to all inquiries within 48 hours.</p>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/privacy" className="px-4 py-2 bg-[#0c0c10] border border-[#1e1e28] rounded-lg text-sm text-[#9ca3af] hover:text-white hover:border-[#3a3a45] transition-colors">Privacy Policy</Link>
          <Link href="/cookies" className="px-4 py-2 bg-[#0c0c10] border border-[#1e1e28] rounded-lg text-sm text-[#9ca3af] hover:text-white hover:border-[#3a3a45] transition-colors">Cookie Policy</Link>
          <Link href="/dmca" className="px-4 py-2 bg-[#0c0c10] border border-[#1e1e28] rounded-lg text-sm text-[#9ca3af] hover:text-white hover:border-[#3a3a45] transition-colors">DMCA</Link>
          <Link href="/disclaimer" className="px-4 py-2 bg-[#0c0c10] border border-[#1e1e28] rounded-lg text-sm text-[#9ca3af] hover:text-white hover:border-[#3a3a45] transition-colors">Disclaimer</Link>
        </div>
      </div>
    </div>
  );
}
