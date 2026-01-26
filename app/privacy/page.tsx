"use client";

import { ArrowLeftIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 mb-6 sm:mb-8 text-sm font-medium"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl ring-1 ring-black/5 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 sm:px-8 py-8 sm:py-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-white/20 backdrop-blur grid place-items-center">
                <ShieldCheckIcon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                  Privacy Policy
                </h1>
                <p className="text-emerald-100 text-sm sm:text-base mt-1">
                  Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 sm:px-8 py-8 sm:py-10">
            <div className="prose prose-sm sm:prose-base max-w-none">
              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-emerald-900 mb-4">1. Introduction</h2>
                <p className="text-gray-700 leading-relaxed">
                  ZamboVet ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our veterinary appointment booking platform. Please read this policy carefully to understand our practices regarding your personal data.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-emerald-900 mb-4">2. Information We Collect</h2>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-4">2.1 Personal Information</h3>
                <p className="text-gray-700 leading-relaxed mb-3">
                  We collect information that you provide directly to us, including:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li><strong>Account Information:</strong> Name, email address, phone number, password</li>
                  <li><strong>Profile Information:</strong> Profile picture, address, date of birth</li>
                  <li><strong>Pet Information:</strong> Pet names, species, breeds, dates of birth, medical history, photos</li>
                  <li><strong>Appointment Information:</strong> Appointment dates, times, reasons for visits, clinic preferences</li>
                  <li><strong>Payment Information:</strong> Billing details (processed securely through third-party payment processors)</li>
                </ul>

                <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-6">2.2 Medical Records</h3>
                <p className="text-gray-700 leading-relaxed mb-3">
                  With your consent, we store:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li>Consultation notes and diagnoses</li>
                  <li>Prescriptions and treatment plans</li>
                  <li>Vital signs and health measurements</li>
                  <li>Pet health diary entries</li>
                  <li>Medical documents and test results</li>
                </ul>

                <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-6">2.3 Automatically Collected Information</h3>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li><strong>Usage Data:</strong> Pages visited, features used, time spent on platform</li>
                  <li><strong>Device Information:</strong> Browser type, operating system, device identifiers</li>
                  <li><strong>Location Data:</strong> IP address, general location (for clinic recommendations)</li>
                  <li><strong>Cookies:</strong> Authentication tokens, session data, preferences</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-emerald-900 mb-4">3. How We Use Your Information</h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  We use the collected information for:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li><strong>Service Delivery:</strong> Facilitating appointments, managing bookings, connecting you with veterinarians</li>
                  <li><strong>Communication:</strong> Sending appointment reminders, notifications, and service updates</li>
                  <li><strong>Record Keeping:</strong> Maintaining pet health records and consultation history</li>
                  <li><strong>Platform Improvement:</strong> Analyzing usage patterns to enhance user experience</li>
                  <li><strong>Security:</strong> Detecting and preventing fraud, abuse, and security incidents</li>
                  <li><strong>Legal Compliance:</strong> Meeting regulatory requirements and responding to legal requests</li>
                  <li><strong>Customer Support:</strong> Responding to inquiries and resolving issues</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-emerald-900 mb-4">4. Information Sharing and Disclosure</h2>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-4">4.1 With Veterinarians and Clinics</h3>
                <p className="text-gray-700 leading-relaxed">
                  We share your information with veterinarians and clinics you book appointments with, including pet information, medical history, and appointment details necessary for providing veterinary services.
                </p>

                <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-6">4.2 Service Providers</h3>
                <p className="text-gray-700 leading-relaxed mb-3">
                  We may share information with third-party service providers who assist us with:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li>Cloud hosting and data storage (Supabase, Vercel)</li>
                  <li>Email and SMS notifications</li>
                  <li>Payment processing</li>
                  <li>Analytics and performance monitoring</li>
                </ul>

                <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-6">4.3 Legal Requirements</h3>
                <p className="text-gray-700 leading-relaxed">
                  We may disclose information when required by law, court order, or government request, or to protect our rights, property, or safety.
                </p>

                <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-6">4.4 We Do Not Sell Your Data</h3>
                <p className="text-gray-700 leading-relaxed">
                  We do not sell, rent, or trade your personal information to third parties for marketing purposes.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-emerald-900 mb-4">5. Data Security</h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  We implement reasonable security measures to protect your information:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li><strong>Encryption:</strong> Data transmitted over HTTPS/TLS encryption</li>
                  <li><strong>Access Controls:</strong> Role-based access and authentication requirements</li>
                  <li><strong>Secure Storage:</strong> Data stored in secure, encrypted databases</li>
                  <li><strong>Regular Audits:</strong> Periodic security assessments and updates</li>
                  <li><strong>Password Protection:</strong> Secure password hashing and storage</li>
                </ul>
                <p className="text-gray-700 leading-relaxed mt-3">
                  However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security of your data.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-emerald-900 mb-4">6. Your Rights and Choices</h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  You have the following rights regarding your personal information:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li><strong>Access:</strong> Request a copy of your personal data</li>
                  <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                  <li><strong>Deletion:</strong> Request deletion of your account and data (subject to legal retention requirements)</li>
                  <li><strong>Data Portability:</strong> Receive your data in a structured, machine-readable format</li>
                  <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications</li>
                  <li><strong>Cookie Control:</strong> Manage cookie preferences in your browser settings</li>
                </ul>
                <p className="text-gray-700 leading-relaxed mt-3">
                  To exercise these rights, please contact us at{" "}
                  <a href="mailto:vetzambo@gmail.com" className="text-emerald-600 hover:text-emerald-700 font-medium">
                    vetzambo@gmail.com
                  </a>
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-emerald-900 mb-4">7. Data Retention</h2>
                <p className="text-gray-700 leading-relaxed">
                  We retain your personal information for as long as necessary to provide our services and comply with legal obligations. Medical records are retained according to Philippine healthcare regulations. After account deletion, we may retain certain information for legal, regulatory, or legitimate business purposes.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-emerald-900 mb-4">8. Children's Privacy</h2>
                <p className="text-gray-700 leading-relaxed">
                  ZamboVet is not intended for children under 18. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-emerald-900 mb-4">9. Cookies and Tracking Technologies</h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  We use cookies and similar technologies for:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li><strong>Essential Cookies:</strong> Required for authentication and platform functionality</li>
                  <li><strong>Analytics Cookies:</strong> Help us understand how users interact with the platform</li>
                  <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
                </ul>
                <p className="text-gray-700 leading-relaxed mt-3">
                  You can control cookies through your browser settings, but disabling certain cookies may affect platform functionality.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-emerald-900 mb-4">10. Third-Party Links</h2>
                <p className="text-gray-700 leading-relaxed">
                  Our platform may contain links to third-party websites or services. We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-emerald-900 mb-4">11. Changes to This Privacy Policy</h2>
                <p className="text-gray-700 leading-relaxed">
                  We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page and updating the "Last updated" date. Your continued use of the platform after changes constitutes acceptance of the updated policy.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-emerald-900 mb-4">12. Data Protection Officer</h2>
                <p className="text-gray-700 leading-relaxed">
                  For questions about data protection and privacy, you may contact our Data Protection Officer at{" "}
                  <a href="mailto:vetzambo@gmail.com" className="text-emerald-600 hover:text-emerald-700 font-medium">
                    vetzambo@gmail.com
                  </a>
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-emerald-900 mb-4">13. Contact Us</h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  If you have questions or concerns about this Privacy Policy or our data practices, please contact us:
                </p>
                <div className="bg-emerald-50 rounded-xl p-4 sm:p-6">
                  <p className="text-gray-700 mb-2">
                    <strong>Email:</strong>{" "}
                    <a href="mailto:vetzambo@gmail.com" className="text-emerald-600 hover:text-emerald-700">
                      vetzambo@gmail.com
                    </a>
                  </p>
                  <p className="text-gray-700 mb-2">
                    <strong>Platform:</strong> ZamboVet
                  </p>
                  <p className="text-gray-700">
                    <strong>Location:</strong> Zamboanga City, Philippines
                  </p>
                </div>
              </section>

              <div className="mt-10 pt-8 border-t border-gray-200">
                <p className="text-sm text-gray-500 text-center">
                  By using ZamboVet, you acknowledge that you have read and understood this Privacy Policy and consent to the collection, use, and disclosure of your information as described herein.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
