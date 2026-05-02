import React from 'react';

export const metadata = {
  title: 'Privacy Policy | VOICE Gurukul',
  description: 'Privacy Policy for VOICE Gurukul mobile application and website.',
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        
        <p className="text-gray-600 mb-6">
          Last updated: May 02, 2026
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">1. Introduction</h2>
          <p className="text-gray-600 mb-4">
            Welcome to <strong>VOICE Gurukul</strong>. We are committed to protecting your personal information and your right to privacy. 
            This Privacy Policy explains how we collect, use, and share your personal information when you use our mobile application and website.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">2. Information We Collect</h2>
          <p className="text-gray-600 mb-4">
            We collect personal information that you voluntarily provide to us when you register on the App, 
            express an interest in obtaining information about us or our products and services, or otherwise when you contact us.
          </p>
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            <li><strong>Personal Information:</strong> Name, email address, and profile picture (via Google Sign-In).</li>
            <li><strong>Usage Data:</strong> Information about your spiritual practices (Sadhana), event RSVPs, and interactions within the app.</li>
            <li><strong>Device Information:</strong> Device ID, push notification tokens, and browser type.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">3. How We Use Your Information</h2>
          <p className="text-gray-600 mb-4">
            We use the information we collect to:
          </p>
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            <li>Facilitate account creation and logon process.</li>
            <li>Track and manage spiritual practices and mentorship progress.</li>
            <li>Send push notifications regarding event updates and reminders.</li>
            <li>Improve our services and user experience.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">4. Sharing Your Information</h2>
          <p className="text-gray-600 mb-4">
            We only share information with your consent, to comply with laws, or to provide you with services. 
            We use third-party services like:
          </p>
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            <li><strong>Supabase:</strong> For database and authentication services.</li>
            <li><strong>Firebase:</strong> For sending push notifications.</li>
            <li><strong>Google OAuth:</strong> For secure sign-in.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">5. Data Security</h2>
          <p className="text-gray-600 mb-4">
            We implement appropriate technical and organizational security measures designed to protect the security of any personal information we process. 
            However, please also remember that we cannot guarantee that the internet itself is 100% secure.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">6. Your Rights</h2>
          <p className="text-gray-600 mb-4">
            You may review, change, or terminate your account at any time. If you wish to delete your data, 
            you can contact us through the application settings or at our support email.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">7. Contact Us</h2>
          <p className="text-gray-600">
            If you have questions or comments about this policy, you may email us at: <strong>manager@voicepune.com</strong>
          </p>
        </section>

        <div className="mt-12 pt-8 border-t border-gray-100 text-center">
          <a href="/" className="text-orange-600 hover:text-orange-700 font-medium transition-colors">
            Return to Home
          </a>
        </div>
      </div>
    </div>
  );
}
