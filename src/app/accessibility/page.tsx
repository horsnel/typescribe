'use client';
import Link from 'next/link';
import { Accessibility, ChevronRight } from 'lucide-react';

export default function AccessibilityPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-8 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-12 py-8">
        <nav className="flex items-center gap-2 text-sm text-[#6b6b7b] mb-6">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-[#a0a0b0]">Accessibility</span>
        </nav>
        <div className="flex items-center gap-3 mb-2">
          <Accessibility className="w-7 h-7 text-[#e50914]" />
          <h1 className="text-3xl lg:text-4xl font-extrabold text-white">Accessibility Statement</h1>
        </div>
        <p className="text-sm text-[#6b6b7b] mb-8">Last updated: April 22, 2026</p>

        <div className="space-y-6">
          <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">1. Our Commitment</h2>
            <p className="text-sm text-[#a0a0b0] leading-relaxed">At Typescribe, we are committed to ensuring that our platform is accessible to all users, including those with disabilities. We believe that everyone should be able to discover, review, and discuss movies regardless of their abilities. We continuously work to improve the accessibility of our website and applications, and we welcome feedback from our users on how we can make Typescribe more inclusive and easier to use for everyone.</p>
          </div>

          <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">2. Standards and Guidelines</h2>
            <p className="text-sm text-[#a0a0b0] leading-relaxed">We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards, which are internationally recognized guidelines for making web content accessible to people with disabilities. These guidelines cover a wide range of recommendations for making content perceivable, operable, understandable, and robust. We regularly audit our platform against these standards and implement improvements to address any identified gaps in accessibility.</p>
          </div>

          <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">3. Accessibility Features</h2>
            <p className="text-sm text-[#a0a0b0] leading-relaxed mb-3">Typescribe includes several features designed to improve accessibility: Full keyboard navigation allows users to browse and interact with all features without a mouse. Screen reader compatibility ensures that our content is properly structured with semantic HTML and ARIA labels for assistive technology. High contrast design with our dark theme provides strong visual contrast between text and background elements. Focus indicators clearly show which element is currently selected when navigating by keyboard.</p>
            <p className="text-sm text-[#a0a0b0] leading-relaxed">We also provide alternative text for images where applicable, responsive design that adapts to different screen sizes and zoom levels, and consistent navigation patterns throughout the platform to help users build familiarity with the interface.</p>
          </div>

          <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">4. Known Limitations</h2>
            <p className="text-sm text-[#a0a0b0] leading-relaxed">Despite our best efforts, some areas of Typescribe may not yet be fully accessible. Third-party embedded content such as YouTube trailers may not meet our accessibility standards. Some interactive elements in the movie carousel and filtering system may have limited keyboard support. We are actively working to address these limitations and plan to make improvements in upcoming releases. We prioritize accessibility fixes based on user impact and feedback.</p>
          </div>

          <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">5. Feedback and Assistance</h2>
            <p className="text-sm text-[#a0a0b0] leading-relaxed">We welcome your feedback on the accessibility of Typescribe. If you encounter any barriers to accessing our content or using our features, please let us know. You can reach us at accessibility@typescribe.com or through <Link href="/contact" className="text-[#e50914] hover:underline">our contact page</Link>. We take all accessibility feedback seriously and will make reasonable efforts to address your concerns promptly. If you need assistance with any aspect of our service, our support team is happy to help.</p>
          </div>

          <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">6. Continuous Improvement</h2>
            <p className="text-sm text-[#a0a0b0] leading-relaxed">Accessibility is an ongoing commitment at Typescribe. We regularly conduct accessibility audits, train our development team on accessibility best practices, and incorporate accessibility requirements into our design and development processes. We are committed to making continuous improvements to ensure that Typescribe remains an inclusive platform where all movie lovers can participate. We appreciate your patience and support as we work toward this goal.</p>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/privacy" className="px-4 py-2 bg-[#12121a] border border-[#2a2a35] rounded-lg text-sm text-[#a0a0b0] hover:text-white hover:border-[#3a3a45] transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="px-4 py-2 bg-[#12121a] border border-[#2a2a35] rounded-lg text-sm text-[#a0a0b0] hover:text-white hover:border-[#3a3a45] transition-colors">Terms of Service</Link>
          <Link href="/contact" className="px-4 py-2 bg-[#12121a] border border-[#2a2a35] rounded-lg text-sm text-[#a0a0b0] hover:text-white hover:border-[#3a3a45] transition-colors">Contact Us</Link>
        </div>
      </div>
    </div>
  );
}
