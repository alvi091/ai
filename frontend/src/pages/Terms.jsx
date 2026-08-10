import StaticPage from '../components/layout/StaticPage';

function Section({ title, children }) {
  return (
    <section className="card card-pad">
      <h2 className="font-display text-[15px] font-semibold text-white">{title}</h2>
      <div className="mt-3 space-y-2 text-[13px] leading-relaxed text-surface-500">{children}</div>
    </section>
  );
}

export default function Terms() {
  return (
    <StaticPage
      eyebrow="Legal"
      title="Terms & Conditions"
      description="Last updated: August 2026. By using Ayymus you agree to these terms. Read them carefully — they shape how the service works."
    >
      <div className="space-y-4">
        <Section title="1. The service">
          <p>Ayymus is an AI decision-support tool. It analyzes publicly available product pages and returns recommendations, scores, and reasoning. Recommendations are informational and do not constitute professional, financial, or legal advice.</p>
        </Section>

        <Section title="2. Accounts">
          <p>You must provide accurate account information and keep your credentials secure. You are responsible for all activity under your account. You may create one account for personal use and must not share it in ways that violate these terms.</p>
        </Section>

        <Section title="3. Acceptable use">
          <p>You agree not to: misuse or attempt to disrupt the service; scrape, resell, or repackage Ayymus data at scale; use the service for unlawful purposes; or submit content that is harmful, deceptive, or infringing.</p>
        </Section>

        <Section title="4. No guarantees on data accuracy">
          <p>Product data comes from third-party marketplaces we do not control. We aim for accuracy but do not guarantee that prices, availability, ratings, or reviews are complete, current, or correct. Always verify the final price and details on the store before buying.</p>
        </Section>

        <Section title="5. Recommendations are not advice">
          <p>Worth scores, verdicts, and price-fairness estimates are AI-generated opinions. They are not a promise of future value or performance. Your purchase decisions are your own.</p>
        </Section>

        <Section title="6. Intellectual property">
          <p>The Ayymus brand, interface, and software are owned by Ayymus. Product names, images, and trademarks belong to their respective owners. We do not claim ownership of marketplace content we display for your reference.</p>
        </Section>

        <Section title="7. Privacy">
          <p>Our handling of your data is described in the Privacy Policy, which forms part of these terms.</p>
        </Section>

        <Section title="8. Limitation of liability">
          <p>To the maximum extent permitted by law, Ayymus is not liable for indirect, incidental, or consequential damages arising from your use of the service or from acting on a recommendation. Our total liability for any claim is limited to the amounts you paid us in the 12 months before the claim.</p>
        </Section>

        <Section title="9. Changes to these terms">
          <p>We may update these terms from time to time. Material changes will be communicated within the app. Continued use after changes take effect means you accept the updated terms.</p>
        </Section>

        <Section title="10. Contact">
          <p>Questions about these terms? Contact legal@ayymus.com.</p>
        </Section>
      </div>
    </StaticPage>
  );
}
