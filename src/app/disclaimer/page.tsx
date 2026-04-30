'use client';
import Link from 'next/link';
import { AlertTriangle, ChevronRight } from 'lucide-react';

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-[#050507] pt-8 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-12 py-8">
        <nav className="flex items-center gap-2 text-sm text-[#6b7280] mb-6">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" strokeWidth={1.5} />
          <span className="text-[#9ca3af]">Disclaimer</span>
        </nav>
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle className="w-7 h-7 text-[#d4a853]" strokeWidth={1.5} />
          <h1 className="text-3xl lg:text-4xl font-extrabold text-white">Disclaimer</h1>
        </div>
        <p className="text-sm text-[#6b7280] mb-8">Last updated: April 22, 2026</p>

        <div className="space-y-6">
          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">1. General Disclaimer</h2>
            <p className="text-sm text-[#9ca3af] leading-relaxed">The information provided on Typescribe is for general informational and entertainment purposes only. While we strive to provide accurate and up-to-date information about movies, ratings, and reviews, we make no representations or warranties of any kind, express or implied, about the completeness, accuracy, reliability, suitability, or availability of the information, products, services, or related graphics contained on the platform for any purpose.</p>
          </div>

          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">2. AI-Generated Content Disclaimer</h2>
            <p className="text-sm text-[#9ca3af] leading-relaxed">Typescribe uses artificial intelligence to generate movie reviews and analysis. These AI-generated reviews are automated assessments that may contain inaccuracies, biases, or misinterpretations. They are clearly labeled as AI-generated content and should not be treated as professional film criticism or authoritative evaluations. Users should consider AI reviews as one of many data points when forming their own opinions about a movie, and should always exercise their own judgment.</p>
          </div>

          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">3. Rating Aggregation Disclaimer</h2>
            <p className="text-sm text-[#9ca3af] leading-relaxed">Ratings displayed on Typescribe are aggregated from multiple third-party sources including IMDb, Rotten Tomatoes, and Metacritic, as well as our own AI scores and community ratings. These third-party ratings are sourced from their respective platforms and may not reflect the most current data. We do not independently verify the accuracy of third-party ratings and are not responsible for any discrepancies between the displayed ratings and the source platforms.</p>
          </div>

          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">4. No Professional Advice</h2>
            <p className="text-sm text-[#9ca3af] leading-relaxed">The content on Typescribe does not constitute professional film criticism, academic analysis, or expert advice of any kind. Our reviews, ratings, and recommendations are intended to assist with entertainment discovery and should not be relied upon as authoritative assessments of a film's artistic or commercial merit. Any reliance you place on information from Typescribe is strictly at your own risk.</p>
          </div>

          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">5. Third-Party Links</h2>
            <p className="text-sm text-[#9ca3af] leading-relaxed">Typescribe may contain links to external websites, including streaming services, news outlets, and social media platforms. We have no control over the nature, content, and availability of those sites. The inclusion of any links does not necessarily imply a recommendation or endorsement of the views expressed within them. We are not responsible for the content, privacy policies, or practices of any third-party websites.</p>
          </div>

          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">6. Accuracy of Information</h2>
            <p className="text-sm text-[#9ca3af] leading-relaxed">While we make every effort to ensure that movie information, cast details, release dates, and other data are accurate, errors may occur. Movie data may be incomplete or outdated at times due to the dynamic nature of film industry information. We encourage users to verify important details through official sources. If you notice an error, please report it through our contact page so we can correct it.</p>
          </div>

          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">7. Limitation of Liability</h2>
            <p className="text-sm text-[#9ca3af] leading-relaxed">In no event shall Typescribe, its directors, employees, partners, agents, suppliers, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the service, any conduct or content of any third party on the service, or any content obtained from the service.</p>
          </div>

          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">8. Contact Us</h2>
            <p className="text-sm text-[#9ca3af] leading-relaxed">If you have questions about this disclaimer, please reach out at <Link href="/contact" className="text-[#d4a853] hover:underline">our contact page</Link> or email legal@typescribe.com.</p>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/privacy" className="px-4 py-2 bg-[#0c0c10] border border-[#1e1e28] rounded-lg text-sm text-[#9ca3af] hover:text-white hover:border-[#3a3a45] transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="px-4 py-2 bg-[#0c0c10] border border-[#1e1e28] rounded-lg text-sm text-[#9ca3af] hover:text-white hover:border-[#3a3a45] transition-colors">Terms of Service</Link>
          <Link href="/dmca" className="px-4 py-2 bg-[#0c0c10] border border-[#1e1e28] rounded-lg text-sm text-[#9ca3af] hover:text-white hover:border-[#3a3a45] transition-colors">DMCA</Link>
        </div>
      </div>
    </div>
  );
}
