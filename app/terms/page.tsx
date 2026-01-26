"use client";

import { ArrowLeftIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 sm:mb-8 text-sm font-medium"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl ring-1 ring-black/5 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 sm:px-8 py-8 sm:py-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-white/20 backdrop-blur grid place-items-center">
                <DocumentTextIcon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                  Terms of Service
                </h1>
                <p className="text-blue-100 text-sm sm:text-base mt-1">
                  Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 sm:px-8 py-8 sm:py-10">
            <div className="prose prose-sm sm:prose-base max-w-none">
              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-blue-900 mb-4">1. Acceptance of Terms</h2>
                <p className="text-gray-700 leading-relaxed">
                  By accessing and using ZamboVet ("the Platform"), you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to these terms, please do not use the Platform.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-blue-900 mb-4">2. Description of Service</h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  ZamboVet is a veterinary appointment booking and management platform that connects pet owners with licensed veterinarians in Zamboanga, Philippines. The Platform provides:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li>Online appointment scheduling and management</li>
                  <li>Veterinary clinic information and location services</li>
                  <li>Pet health record management</li>
                  <li>Communication between pet owners and veterinarians</li>
                  <li>Consultation documentation and medical records</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-blue-900 mb-4">3. User Accounts</h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account.
                </p>
                <p className="text-gray-700 leading-relaxed mb-3">
                  You are responsible for:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li>Safeguarding your password and maintaining account security</li>
                  <li>All activities that occur under your account</li>
                  <li>Notifying us immediately of any unauthorized use</li>
                  <li>Ensuring your contact information is up to date</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-blue-900 mb-4">4. Veterinary Services</h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  <strong>Important Notice:</strong> ZamboVet is a platform that facilitates connections between pet owners and veterinarians. We do not provide veterinary services directly.
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li>All veterinary services are provided by licensed, independent veterinarians</li>
                  <li>Veterinarians are responsible for their own professional conduct and medical decisions</li>
                  <li>ZamboVet does not guarantee the quality, accuracy, or outcomes of veterinary services</li>
                  <li>Medical advice and treatment are solely the responsibility of the attending veterinarian</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-blue-900 mb-4">5. Appointments and Cancellations</h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  Appointments are subject to availability and confirmation by the veterinarian or clinic. By booking an appointment:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li>You agree to arrive on time for scheduled appointments</li>
                  <li>You understand that cancellation policies may vary by clinic</li>
                  <li>You will review individual clinic policies before booking</li>
                  <li>Late cancellations or no-shows may result in fees as determined by the clinic</li>
                  <li>Emergency situations may require rescheduling without penalty</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-blue-900 mb-4">6. User Conduct</h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  You agree not to:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li>Use the Platform for any unlawful purpose</li>
                  <li>Impersonate any person or entity</li>
                  <li>Interfere with or disrupt the Platform's operation</li>
                  <li>Attempt to gain unauthorized access to any part of the Platform</li>
                  <li>Upload or transmit viruses or malicious code</li>
                  <li>Harass, abuse, or harm other users or veterinarians</li>
                  <li>Post false, misleading, or fraudulent information</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-blue-900 mb-4">7. Intellectual Property</h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  The Platform and its original content, features, and functionality are owned by ZamboVet and are protected by international copyright, trademark, and other intellectual property laws.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  You may not modify, copy, distribute, transmit, display, reproduce, or create derivative works from the Platform without our express written permission.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-blue-900 mb-4">8. Limitation of Liability</h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  To the maximum extent permitted by law, ZamboVet shall not be liable for:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li>Any indirect, incidental, special, consequential, or punitive damages</li>
                  <li>Loss of profits, revenue, data, or use</li>
                  <li>Damages arising from veterinary services provided by third-party veterinarians</li>
                  <li>Interruption of service or system failures</li>
                  <li>Errors or omissions in content</li>
                </ul>
                <p className="text-gray-700 leading-relaxed mt-3">
                  The Platform is provided "as is" and "as available" without warranties of any kind, either express or implied.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-blue-900 mb-4">9. Indemnification</h2>
                <p className="text-gray-700 leading-relaxed">
                  You agree to indemnify, defend, and hold harmless ZamboVet, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from your use of the Platform or violation of these Terms.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-blue-900 mb-4">10. Privacy and Data Protection</h2>
                <p className="text-gray-700 leading-relaxed">
                  Your use of ZamboVet is also governed by our Privacy Policy. Please review our{" "}
                  <Link href="/privacy" className="text-blue-600 hover:text-blue-700 font-medium underline">
                    Privacy Policy
                  </Link>{" "}
                  to understand our practices regarding your personal information and medical records.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-blue-900 mb-4">11. Modifications to Terms</h2>
                <p className="text-gray-700 leading-relaxed">
                  ZamboVet reserves the right to modify or replace these Terms at any time. We will provide notice of significant changes by posting the new Terms on the Platform and updating the "Last updated" date. Your continued use of the Platform after such modifications constitutes acceptance of the updated Terms.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-blue-900 mb-4">12. Termination</h2>
                <p className="text-gray-700 leading-relaxed">
                  We may terminate or suspend your account and access to the Platform immediately, without prior notice or liability, for any reason, including breach of these Terms. Upon termination, your right to use the Platform will immediately cease.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-blue-900 mb-4">13. Governing Law</h2>
                <p className="text-gray-700 leading-relaxed">
                  These Terms shall be governed by and construed in accordance with the laws of the Republic of the Philippines, without regard to its conflict of law provisions. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts of Zamboanga City, Philippines.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-blue-900 mb-4">14. Contact Information</h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  If you have any questions about these Terms of Service, please contact us:
                </p>
                <div className="bg-blue-50 rounded-xl p-4 sm:p-6">
                  <p className="text-gray-700 mb-2">
                    <strong>Email:</strong>{" "}
                    <a href="mailto:vetzambo@gmail.com" className="text-blue-600 hover:text-blue-700">
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
                  By using ZamboVet, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
