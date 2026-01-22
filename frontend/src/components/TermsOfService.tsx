import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function TermsOfService() {
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
          <h1>Terms of Service</h1>
          <p className="text-muted-foreground">Last updated: {lastUpdated}</p>

          <section>
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using PopMap ("the Service"), you agree to be bound by these Terms of
              Service ("Terms"). If you do not agree to these Terms, you may not use the Service.
            </p>
            <p>
              We may modify these Terms at any time. Continued use of the Service after changes
              constitutes acceptance of the modified Terms.
            </p>
          </section>

          <section>
            <h2>2. Description of Service</h2>
            <p>
              PopMap is a platform that connects users with local popup events and enables businesses
              to promote their events. The Service includes:
            </p>
            <ul>
              <li>Event discovery through an interactive map</li>
              <li>RSVP functionality for attendees</li>
              <li>Event creation and management tools for businesses</li>
              <li>Business profile pages</li>
              <li>Premium subscription features</li>
            </ul>
          </section>

          <section>
            <h2>3. User Accounts</h2>

            <h3>3.1 Account Creation</h3>
            <p>
              To access certain features, you must create an account. You may register using your email
              address or through social login providers (Google, Facebook). You agree to:
            </p>
            <ul>
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Accept responsibility for all activities under your account</li>
            </ul>

            <h3>3.2 Account Types</h3>
            <ul>
              <li><strong>Attendee Accounts:</strong> For users who want to discover and RSVP to events.</li>
              <li><strong>Business Owner Accounts:</strong> For businesses that want to create events and manage their presence on PopMap.</li>
            </ul>

            <h3>3.3 Account Termination</h3>
            <p>
              You may delete your account at any time. We may suspend or terminate accounts that
              violate these Terms or for any reason at our discretion.
            </p>
          </section>

          <section>
            <h2>4. User Conduct</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use the Service for any unlawful purpose</li>
              <li>Post false, misleading, or fraudulent content</li>
              <li>Impersonate any person or entity</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Post content that infringes on intellectual property rights</li>
              <li>Attempt to gain unauthorized access to the Service</li>
              <li>Use automated systems to access the Service without permission</li>
              <li>Interfere with the proper functioning of the Service</li>
              <li>Post spam, advertisements, or promotional content (except through designated features)</li>
            </ul>
          </section>

          <section>
            <h2>5. Content</h2>

            <h3>5.1 User Content</h3>
            <p>
              You retain ownership of content you post on PopMap ("User Content"). By posting content,
              you grant us a non-exclusive, worldwide, royalty-free license to use, display, reproduce,
              and distribute your content in connection with the Service.
            </p>

            <h3>5.2 Content Responsibility</h3>
            <p>
              You are solely responsible for your User Content. You represent that you have all
              necessary rights to post your content and that it does not violate any laws or
              third-party rights.
            </p>

            <h3>5.3 Content Removal</h3>
            <p>
              We reserve the right to remove any content that violates these Terms or that we deem
              inappropriate, without prior notice.
            </p>
          </section>

          <section>
            <h2>6. Events and RSVPs</h2>

            <h3>6.1 Event Information</h3>
            <p>
              Business owners are responsible for the accuracy of event information they post. PopMap
              does not guarantee the accuracy, completeness, or reliability of any event listings.
            </p>

            <h3>6.2 Attendance</h3>
            <p>
              RSVPs are non-binding expressions of interest. PopMap is not responsible for event
              cancellations, changes, or any issues arising from event attendance.
            </p>

            <h3>6.3 Business Responsibility</h3>
            <p>
              Businesses are solely responsible for their events, including compliance with local laws,
              permits, safety regulations, and any disputes with attendees.
            </p>
          </section>

          <section>
            <h2>7. Subscriptions and Payments</h2>

            <h3>7.1 Premium Features</h3>
            <p>
              Certain features require a paid subscription. Subscription terms and pricing are
              displayed at the time of purchase.
            </p>

            <h3>7.2 Billing</h3>
            <p>
              Subscriptions are billed in advance on a recurring basis. You authorize us to charge
              your payment method for all fees.
            </p>

            <h3>7.3 Cancellation</h3>
            <p>
              You may cancel your subscription at any time. Cancellation takes effect at the end of
              the current billing period. No refunds are provided for partial periods.
            </p>

            <h3>7.4 Price Changes</h3>
            <p>
              We may change subscription prices with 30 days' notice. Continued use after price
              changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2>8. Intellectual Property</h2>
            <p>
              The Service and its original content (excluding User Content), features, and
              functionality are owned by PopMap and are protected by copyright, trademark, and
              other intellectual property laws.
            </p>
            <p>
              You may not copy, modify, distribute, sell, or lease any part of the Service without
              our written permission.
            </p>
          </section>

          <section>
            <h2>9. Third-Party Services</h2>
            <p>
              The Service may contain links to or integrate with third-party services (e.g., Google
              Maps, payment processors, social media platforms). We are not responsible for the
              content, privacy policies, or practices of these third parties.
            </p>
          </section>

          <section>
            <h2>10. Disclaimer of Warranties</h2>
            <p>
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
              EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY,
              FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
            <p>
              We do not warrant that the Service will be uninterrupted, secure, or error-free, or
              that any defects will be corrected.
            </p>
          </section>

          <section>
            <h2>11. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, POPMAP SHALL NOT BE LIABLE FOR ANY INDIRECT,
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR
              REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL,
              OR OTHER INTANGIBLE LOSSES.
            </p>
            <p>
              OUR TOTAL LIABILITY FOR ANY CLAIMS ARISING FROM OR RELATED TO THE SERVICE SHALL NOT
              EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
            </p>
          </section>

          <section>
            <h2>12. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless PopMap and its officers, directors, employees,
              and agents from any claims, damages, losses, liabilities, and expenses (including
              attorney's fees) arising from:
            </p>
            <ul>
              <li>Your use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any third-party rights</li>
              <li>Your User Content</li>
            </ul>
          </section>

          <section>
            <h2>13. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the
              State of California, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2>14. Dispute Resolution</h2>
            <p>
              Any disputes arising from these Terms or the Service shall first be attempted to be
              resolved through good-faith negotiation. If negotiation fails, disputes shall be
              resolved through binding arbitration in accordance with the rules of the American
              Arbitration Association.
            </p>
          </section>

          <section>
            <h2>15. Severability</h2>
            <p>
              If any provision of these Terms is found to be unenforceable, the remaining provisions
              shall continue in full force and effect.
            </p>
          </section>

          <section>
            <h2>16. Entire Agreement</h2>
            <p>
              These Terms, together with our Privacy Policy, constitute the entire agreement between
              you and PopMap regarding the Service.
            </p>
          </section>

          <section>
            <h2>17. Contact Us</h2>
            <p>
              If you have questions about these Terms, please contact us:
            </p>
            <ul>
              <li>Email: <a href={`mailto:${contactEmail}`}>{contactEmail}</a></li>
            </ul>
          </section>
        </article>

        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>
            <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
            {' | '}
            <Link to="/" className="hover:underline">Return to PopMap</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
