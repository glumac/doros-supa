export default function TocPrivacy() {
  return (
    <div className="toc-privacy-container min-h-screen bg-gray-50 py-10 px-5">
      <div className="max-w-3xl mx-auto">
        <h1 className="toc-privacy-title text-3xl font-bold mb-8 text-center">
          CRUSH QUEST - Terms of Service & Privacy Policy
        </h1>

        {/* Privacy Policy Section */}
        <div className="toc-privacy-section bg-white rounded-xl p-6 shadow-md mb-6">
          <h2 className="toc-privacy-section-title text-xl font-semibold mb-4">
            Privacy Policy
          </h2>

          <div className="toc-privacy-content text-gray-800 text-sm leading-relaxed">
            <p className="mb-4">
              <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
            </p>

            <p className="mb-4">
              This application is provided free of charge. We are committed to protecting your privacy and personal information.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-3">
              Data Collection and Usage
            </h3>
            <p className="mb-4">
              We collect only the information necessary to provide the service. This includes your name, email address, and profile picture.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-3">
              Data Sharing and Selling
            </h3>
            <p className="mb-4">
              <strong>We do not sell, rent, or share your personal data with third parties.</strong> Your information is used solely to provide and improve the service.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-3">
              Data Security
            </h3>
            <p className="mb-4">
              We implement reasonable security measures to protect your information. However, no method of transmission over the internet is 100% secure.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-3">
              Your Rights
            </h3>
            <p className="mb-4">
              You have the right to access, modify, or delete your personal information at any time through the application settings or by contacting us.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-3">
              Changes to This Policy
            </h3>
            <p className="mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
            </p>
          </div>
        </div>

        {/* Terms of Service Section */}
        <div className="toc-privacy-section bg-white rounded-xl p-6 shadow-md">
          <h2 className="toc-privacy-section-title text-xl font-semibold mb-4">
            Terms of Service
          </h2>

          <div className="toc-privacy-content text-gray-800 text-sm leading-relaxed">
            <p className="mb-4">
              <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
            </p>

            <p className="mb-4">
              By accessing and using this application, you agree to be bound by these Terms of Service.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-3">
              Free Service
            </h3>
            <p className="mb-4">
              This application is provided free of charge. There are no fees associated with using the basic features of this service.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-3">
              As-Is Service
            </h3>
            <p className="mb-4">
              <strong>This application is provided "as-is" without any warranties, express or implied.</strong> We do not guarantee that the service will be uninterrupted, error-free, or meet your specific requirements.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-3">
              Limitation of Liability
            </h3>
            <p className="mb-4">
              To the fullest extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your use of the service.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-3">
              User Conduct
            </h3>
            <p className="mb-4">
              You agree to use the service only for lawful purposes and in accordance with these Terms. You agree not to use the service in any way that could damage, disable, overburden, or impair the service or interfere with any other party's use of the service.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-3">
              Account Responsibility
            </h3>
            <p className="mb-4">
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-3">
              Service Modifications
            </h3>
            <p className="mb-4">
              We reserve the right to modify, suspend, or discontinue the service at any time, with or without notice, for any reason.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-3">
              Changes to Terms
            </h3>
            <p className="mb-4">
              We may update these Terms of Service from time to time. We will notify you of any changes by posting the new Terms of Service on this page and updating the "Last Updated" date. Your continued use of the service after any changes constitutes acceptance of the new Terms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

