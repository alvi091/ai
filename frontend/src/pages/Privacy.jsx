import StaticPage from '../components/layout/StaticPage';

function Section({ title, children }) {
  return (
    <section className="card card-pad">
      <h2 className="font-display text-[15px] font-semibold text-white">{title}</h2>
      <div className="mt-3 space-y-2 text-[13px] leading-relaxed text-surface-500">{children}</div>
    </section>
  );
}

export default function Privacy() {
  return (
    <StaticPage
      eyebrow="Legal"
      title="Privacy Policy"
      description="Last updated: August 2026. This policy explains what Ayymus collects, why we collect it, and how you stay in control."
    >
      <div className="space-y-4">
        <Section title="1. Information we collect">
          <p>• Account data: name, email, and password (hashed) when you create an account.</p>
          <p>• Shopping activity: your searches, saved items, comparisons, and browsing inside Ayymus — used to personalize recommendations.</p>
          <p>• Usage data: basic analytics about how you interact with the app, kept anonymous where possible.</p>
          <p>• Product data: the URLs and pages you ask us to analyze. We store only structured metadata (name, price, reviews) — never your identity with it.</p>
        </Section>

        <Section title="2. How we use your data">
          <p>• To run the decision engine and personalize your recommendations.</p>
          <p>• To remember your preferences, wishlist, and comparison history.</p>
          <p>• To improve accuracy, fix bugs, and measure feature health.</p>
          <p>• We do not sell your personal data. We never use your data to profile you beyond your Ayymus experience.</p>
        </Section>

        <Section title="3. Data we fetch from product pages">
          <p>When you paste a product link, our servers fetch that public page on your behalf to extract reviews, price, and specifications. We respect a store\u2019s anti-bot and access rules; if a page is blocked or sparse, we tell you honestly instead of fabricating data.</p>
        </Section>

        <Section title="4. Cookies & local storage">
          <p>We use local storage and cookies for authentication and remembering your preferences. No third-party advertising cookies are used.</p>
        </Section>

        <Section title="5. Sharing">
          <p>We only share data with service providers essential to operating the app (hosting, databases, and AI inference) under data-processing agreements. We may disclose data if required by law or to protect the rights and safety of our users and services.</p>
        </Section>

        <Section title="6. Data retention & deletion">
          <p>You can delete your account and associated data at any time from your settings. We delete or anonymize analytics data within 12 months. Contact us and we will action a deletion request within 30 days.</p>
        </Section>

        <Section title="7. Security">
          <p>Passwords are hashed, connections are encrypted (TLS), and access to production data is restricted and audited. No system is perfect — if a breach occurs, we notify affected users without undue delay.</p>
        </Section>

        <Section title="8. Your rights">
          <p>Depending on your location, you may have the right to access, correct, export, or delete your personal data. Email us to exercise any of these rights.</p>
        </Section>

        <Section title="9. Contact">
          <p>Questions about this policy? Contact privacy@ayymus.com.</p>
        </Section>
      </div>
    </StaticPage>
  );
}
