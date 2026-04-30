'use client';
import Link from 'next/link';
import { ShieldAlert, ChevronRight } from 'lucide-react';

export default function DMCAPage() {
  return (
    <div className="min-h-screen bg-[#050507] pt-8 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-12 py-8">
        <nav className="flex items-center gap-2 text-sm text-[#6b7280] mb-6">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" strokeWidth={1.5} />
          <span className="text-[#9ca3af]">DMCA</span>
        </nav>
        <div className="flex items-center gap-3 mb-2">
          <ShieldAlert className="w-7 h-7 text-[#d4a853]" strokeWidth={1.5} />
          <h1 className="text-3xl lg:text-4xl font-extrabold text-white">DMCA & Copyright</h1>
        </div>
        <p className="text-sm text-[#6b7280] mb-8">Last updated: April 22, 2026</p>

        <div className="space-y-6">
          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">1. Copyright Policy</h2>
            <p className="text-sm text-[#9ca3af] leading-relaxed">Typescribe respects the intellectual property rights of others and expects our users to do the same. We are committed to complying with the Digital Millennium Copyright Act (DMCA) and other applicable copyright laws. We will respond to clear notices of alleged copyright infringement that comply with the DMCA's requirements. This policy outlines the procedures for reporting copyright infringement and the process for submitting counter-notifications.</p>
          </div>

          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">2. Reporting Copyright Infringement</h2>
            <p className="text-sm text-[#9ca3af] leading-relaxed mb-3">If you believe that your copyrighted work has been copied in a way that constitutes copyright infringement and is accessible on Typescribe, you may notify our designated copyright agent. To be effective, your notification must include the following: a physical or electronic signature of a person authorized to act on behalf of the owner of the exclusive right that is allegedly infringed; identification of the copyrighted work claimed to have been infringed; identification of the material that is claimed to be infringing and that is to be removed; your address, telephone number, and email address; a statement that you have a good faith belief that the use of the material is not authorized; and a statement that the information in the notification is accurate, and under penalty of perjury, that you are authorized to act on behalf of the owner.</p>
          </div>

          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">3. Counter-Notification Process</h2>
            <p className="text-sm text-[#9ca3af] leading-relaxed">If you believe that your content was removed in error, you may submit a counter-notification. Your counter-notification must include: your physical or electronic signature; identification of the material that has been removed and the location at which it previously appeared; a statement under penalty of perjury that you have a good faith belief that the material was removed as a result of mistake or misidentification; your name, address, telephone number, and a statement consenting to jurisdiction; and a statement that you will accept service of process from the person who submitted the original notification.</p>
          </div>

          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">4. Repeat Infringer Policy</h2>
            <p className="text-sm text-[#9ca3af] leading-relaxed">In accordance with the DMCA and other applicable law, Typescribe has adopted a policy of terminating, in appropriate circumstances and at our sole discretion, accounts of users who are deemed to be repeat infringers. We may also limit access to the service and/or terminate the accounts of any users who infringe any intellectual property rights of others, whether or not there is any repeat infringement. We will comply with the DMCA's requirements regarding notification and removal of infringing content.</p>
          </div>

          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">5. DMCA Contact Information</h2>
            <p className="text-sm text-[#9ca3af] leading-relaxed">Our designated DMCA agent for notice of alleged copyright infringement can be reached at:</p>
            <div className="mt-3 bg-[#050507] border border-[#1e1e28] rounded-lg p-4">
              <p className="text-sm text-white font-medium">Typescribe DMCA Agent</p>
              <p className="text-sm text-[#9ca3af] mt-1">Email: dmca@typescribe.com</p>
              <p className="text-sm text-[#9ca3af]">Mailing Address: 123 Cinema Blvd, Suite 400, San Francisco, CA 94102</p>
            </div>
          </div>

          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">6. General Contact</h2>
            <p className="text-sm text-[#9ca3af] leading-relaxed">For non-DMCA copyright questions or general inquiries, please reach out through <Link href="/contact" className="text-[#d4a853] hover:underline">our contact page</Link> or email legal@typescribe.com. We aim to respond to all legitimate inquiries within 48 hours.</p>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/privacy" className="px-4 py-2 bg-[#0c0c10] border border-[#1e1e28] rounded-lg text-sm text-[#9ca3af] hover:text-white hover:border-[#3a3a45] transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="px-4 py-2 bg-[#0c0c10] border border-[#1e1e28] rounded-lg text-sm text-[#9ca3af] hover:text-white hover:border-[#3a3a45] transition-colors">Terms of Service</Link>
          <Link href="/disclaimer" className="px-4 py-2 bg-[#0c0c10] border border-[#1e1e28] rounded-lg text-sm text-[#9ca3af] hover:text-white hover:border-[#3a3a45] transition-colors">Disclaimer</Link>
        </div>
      </div>
    </div>
  );
}
