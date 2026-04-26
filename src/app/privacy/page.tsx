'use client';
import Link from 'next/link';
import { Shield, ChevronRight } from 'lucide-react';

const sections = [
  { title: '1. Information We Collect', content: `We collect information you provide directly to us, such as when you create an account, submit a review, add a movie to your watchlist, or contact us for support. This includes your display name, email address, and any content you post on the platform.

We also collect certain information automatically when you use our service, including your IP address, browser type, operating system, referring URLs, and information about how you interact with the service (such as pages viewed, links clicked, and features used). We use cookies and similar technologies to collect this information. You can learn more in our Cookie Policy.` },
  { title: '2. How We Use Your Information', content: `We use the information we collect to provide, maintain, and improve our movie review services; send you technical notices, updates, and support messages; respond to your comments, questions, and requests; personalize your experience, including movie recommendations; monitor and analyze trends, usage, and activities; detect, investigate, and prevent fraudulent or unauthorized activities; and comply with legal obligations.

We may also use aggregated, non-personally identifiable information for analytical purposes to improve our platform and user experience.` },
  { title: '3. Information Sharing', content: `We do not sell, trade, or rent your personal information to third parties. We may share your information in the following circumstances: with your consent or at your direction; with service providers who assist us in operating our platform; to comply with legal obligations or protect our rights; and in connection with a merger, acquisition, or sale of assets.

When you post reviews or comments publicly on our platform, that information is visible to other users in accordance with your privacy settings.` },
  { title: '4. Data Security', content: `We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.

We regularly review our security practices and update them as needed to address new threats and vulnerabilities. We encourage you to use strong passwords and to never share your login credentials with others.` },
  { title: '5. Your Rights', content: `You have the right to access, update, or delete your personal information at any time through your account settings. You may also opt out of receiving promotional communications from us. If you wish to have your account deleted, please contact us at privacy@typescribe.com.

Depending on your jurisdiction, you may have additional rights such as the right to data portability, the right to restrict processing, and the right to object to certain uses of your data.` },
  { title: '6. Cookies', content: `We use cookies and similar tracking technologies to track activity on our service and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. For more details, please see our Cookie Policy.` },
  { title: '7. Third-Party Services', content: `Our platform may contain links to third-party websites or services, including streaming providers and social media platforms. We are not responsible for the privacy practices of these third parties. We encourage you to read their privacy policies before sharing any personal information with them.` },
  { title: '8. Children Privacy', content: `Typescribe is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected personal information from a child under 13, we will take steps to delete that information.` },
  { title: '9. Changes to This Policy', content: `We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. We encourage you to review this Privacy Policy periodically for any changes.` },
  { title: '10. Contact Us', content: `If you have any questions about this Privacy Policy, please contact us at our contact page or email privacy@typescribe.com.` },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-8 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-12 py-8">
        <nav className="flex items-center gap-2 text-sm text-[#6b6b7b] mb-6">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-[#a0a0b0]">Privacy Policy</span>
        </nav>

        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-7 h-7 text-[#e50914]" />
          <h1 className="text-3xl lg:text-4xl font-extrabold text-white">Privacy Policy</h1>
        </div>
        <p className="text-sm text-[#6b6b7b] mb-8">Last updated: April 22, 2026</p>

        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.title} className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-3">{section.title}</h2>
              {section.content.split('\n\n').map((paragraph, idx) => (
                <p key={idx} className="text-sm text-[#a0a0b0] leading-relaxed mb-3 last:mb-0">{paragraph}</p>
              ))}
            </div>
          ))}
        </div>

        {/* Quick Links */}
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/terms" className="px-4 py-2 bg-[#12121a] border border-[#2a2a35] rounded-lg text-sm text-[#a0a0b0] hover:text-white hover:border-[#3a3a45] transition-colors">Terms of Service</Link>
          <Link href="/cookies" className="px-4 py-2 bg-[#12121a] border border-[#2a2a35] rounded-lg text-sm text-[#a0a0b0] hover:text-white hover:border-[#3a3a45] transition-colors">Cookie Policy</Link>
          <Link href="/contact" className="px-4 py-2 bg-[#12121a] border border-[#2a2a35] rounded-lg text-sm text-[#a0a0b0] hover:text-white hover:border-[#3a3a45] transition-colors">Contact Us</Link>
        </div>
      </div>
    </div>
  );
}
