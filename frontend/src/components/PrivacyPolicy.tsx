import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PrivacyPolicy() {
  const lastUpdated = 'January 22, 2026';
  const contactEmail = 'popmapco@gmail.com';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to PopMap
            </Link>
          </Button>
        </div>

        <article className="prose prose-slate dark:prose-invert max-w-none">
          <h1>Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: {lastUpdated}</p>

          <section>
            <h2>Introduction</h2>
            <p>
              PopMap ("we," "our," or "us") operates the PopMap platform, which helps users discover
              local popup events and enables businesses to promote their events. This Privacy Policy
              explains how we collect, use, disclose, and safeguard your information when you use our
              website and services.
            </p>
            <p>
              By using PopMap, you agree to the collection and use of information in accordance with
              this policy. If you do not agree with our policies and practices, please do not use our services.
            </p>
          </section>

          <section>
            <h2>Information We Collect</h2>

            <h3>Information You Provide Directly</h3>
            <ul>
              <li><strong>Account Information:</strong> When you create an account, we collect your name, email address, and password (if not using social login).</li>
              <li><strong>Profile Information:</strong> Business owners may provide business name, description, contact information, and social media links.</li>
              <li><strong>Event Information:</strong> Details about events you create, including location, date, time, and descriptions.</li>
              <li><strong>RSVP Information:</strong> When you RSVP to events, we record your interest level and associated event.</li>
              <li><strong>Payment Information:</strong> For premium subscriptions, payment details are processed securely by Stripe. We do not store your full credit card number.</li>
            </ul>

            <h3>Information from Social Login Providers</h3>
            <p>
              When you choose to sign up or log in using a social account (Google or Facebook), we receive:
            </p>
            <ul>
              <li><strong>From Google:</strong> Your name, email address, and profile picture URL.</li>
              <li><strong>From Facebook:</strong> Your name and email address (public_profile and email permissions).</li>
            </ul>
            <p>
              We use this information solely to create and manage your PopMap account. We do not post
              to your social media accounts or access your friends list.
            </p>

            <h3>Information Collected Automatically</h3>
            <ul>
              <li><strong>Location Data:</strong> With your permission, we access your device's location to show nearby events on the map. This data is used in real-time and is not stored on our servers.</li>
              <li><strong>Usage Analytics:</strong> We collect anonymized data about how you interact with PopMap, including pages visited, events viewed, and features used.</li>
              <li><strong>Device Information:</strong> Browser type, operating system, and device type for compatibility and analytics purposes.</li>
              <li><strong>Referral Data:</strong> How you arrived at PopMap (e.g., search engine, social media link).</li>
            </ul>
          </section>

          <section>
            <h2>How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide, maintain, and improve the PopMap platform</li>
              <li>Create and manage your account</li>
              <li>Process RSVPs and send event reminders (with your consent)</li>
              <li>Process subscription payments</li>
              <li>Send important service-related communications</li>
              <li>Personalize your experience by showing relevant events</li>
              <li>Analyze usage patterns to improve our services</li>
              <li>Prevent fraud and ensure platform security</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2>Legal Basis for Processing (GDPR)</h2>
            <p>If you are in the European Economic Area (EEA), we process your data based on:</p>
            <ul>
              <li><strong>Contractual Necessity:</strong> To provide our services when you create an account or subscribe.</li>
              <li><strong>Legitimate Interest:</strong> For analytics, security, and service improvement.</li>
              <li><strong>Consent:</strong> For location access, email notifications, and marketing communications.</li>
              <li><strong>Legal Obligation:</strong> For compliance with applicable laws.</li>
            </ul>
          </section>

          <section>
            <h2>Information Sharing</h2>
            <p>We do not sell your personal information. We may share your information with:</p>
            <ul>
              <li><strong>Service Providers:</strong> Third parties that help us operate our platform:
                <ul>
                  <li>Amazon Web Services (AWS) - hosting and authentication (Cognito)</li>
                  <li>Stripe - payment processing</li>
                  <li>Email service providers - for notifications and reminders</li>
                </ul>
              </li>
              <li><strong>Business Owners:</strong> If you RSVP to an event, the business hosting that event may see your name and email to manage attendance (premium feature).</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and safety.</li>
            </ul>
          </section>

          <section>
            <h2>Your Rights and Choices</h2>

            <h3>All Users</h3>
            <ul>
              <li><strong>Access:</strong> Request a copy of your personal data.</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information.</li>
              <li><strong>Deletion:</strong> Request deletion of your account and associated data.</li>
              <li><strong>Email Preferences:</strong> Opt out of event reminders and marketing emails.</li>
              <li><strong>Location Access:</strong> Revoke location permissions through your browser settings.</li>
            </ul>

            <h3>Additional Rights for EEA Residents (GDPR)</h3>
            <ul>
              <li><strong>Data Portability:</strong> Receive your data in a machine-readable format.</li>
              <li><strong>Restriction:</strong> Request limitation of processing in certain circumstances.</li>
              <li><strong>Object:</strong> Object to processing based on legitimate interests.</li>
              <li><strong>Withdraw Consent:</strong> Withdraw previously given consent at any time.</li>
              <li><strong>Lodge Complaint:</strong> File a complaint with your local data protection authority.</li>
            </ul>

            <p>
              To exercise any of these rights, please contact us at{' '}
              <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
            </p>
          </section>

          <section>
            <h2>Data Retention</h2>
            <ul>
              <li><strong>Active Accounts:</strong> We retain your data while your account is active.</li>
              <li><strong>Deleted Accounts:</strong> Upon account deletion, we remove your personal data within 30 days, except where retention is required by law.</li>
              <li><strong>RSVP History:</strong> Deleted when you delete your account or upon request.</li>
              <li><strong>Payment Records:</strong> Retained as required for tax and legal compliance.</li>
              <li><strong>Analytics Data:</strong> Anonymized data may be retained indefinitely for statistical purposes.</li>
            </ul>
          </section>

          <section>
            <h2>Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal
              information, including:
            </p>
            <ul>
              <li>Encryption of data in transit (HTTPS/TLS)</li>
              <li>Encryption of sensitive data at rest</li>
              <li>Secure authentication through AWS Cognito</li>
              <li>Regular security assessments</li>
              <li>Access controls limiting employee access to personal data</li>
            </ul>
            <p>
              However, no method of transmission over the Internet is 100% secure. While we strive to
              protect your information, we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2>Cookies and Tracking</h2>
            <p>
              PopMap uses essential cookies for authentication and session management. We also use
              analytics tools to understand how users interact with our platform.
            </p>
            <p>
              You can control cookie preferences through your browser settings. Disabling cookies may
              affect certain features of our service.
            </p>
          </section>

          <section>
            <h2>Children's Privacy</h2>
            <p>
              PopMap is not intended for users under 16 years of age. We do not knowingly collect
              personal information from children. If you believe we have collected information from
              a child, please contact us immediately.
            </p>
          </section>

          <section>
            <h2>International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your own,
              including the United States where our servers are located. We ensure appropriate
              safeguards are in place, including Standard Contractual Clauses where required.
            </p>
          </section>

          <section>
            <h2>Third-Party Links</h2>
            <p>
              PopMap may contain links to third-party websites or services. We are not responsible
              for the privacy practices of these external sites. We encourage you to review their
              privacy policies.
            </p>
          </section>

          <section>
            <h2>Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant
              changes by posting a notice on our platform or sending you an email. Your continued use
              of PopMap after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2>Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <ul>
              <li>Email: <a href={`mailto:${contactEmail}`}>{contactEmail}</a></li>
            </ul>
          </section>

          <section>
            <h2>California Privacy Rights (CCPA)</h2>
            <p>
              If you are a California resident, you have the right to:
            </p>
            <ul>
              <li>Know what personal information we collect and how it's used</li>
              <li>Request deletion of your personal information</li>
              <li>Opt out of the sale of personal information (we do not sell your data)</li>
              <li>Non-discrimination for exercising your privacy rights</li>
            </ul>
          </section>
        </article>

        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>
            <Link to="/terms" className="hover:underline">Terms of Service</Link>
            {' | '}
            <Link to="/" className="hover:underline">Return to PopMap</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
