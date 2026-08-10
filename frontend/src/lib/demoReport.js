// Static fixture matching the exact shape of `POST /api/analyze` success payloads.
// Used by the Analyze page's "Try a sample report" mode so the report dashboard
// can be verified without a live crawl (datacenter crawls often return sparse pages).

const SAMPLES = [
  {
    title: 'Asus VivoBook 16X (2024) — 3.2K OLED, Core Ultra 5, 16GB / 1TB',
    author: 'Rohit M',
    rating: 5,
    comment: 'The OLED panel is stunning for the price and the keyboard is comfortable for long typing sessions. Fans are near-silent on light work.',
    verified: true,
  },
  {
    title: 'Battery is the weak link',
    author: 'Priya K',
    rating: 3,
    comment: 'Gets about 6 hours on brightness ~70%. Good for a desktop replacement but not an all-day travel machine.',
    verified: true,
  },
  {
    title: 'Slightly heavy but very fast',
    author: 'Aman S',
    rating: 4,
    comment: 'Processor never feels slow even with 20+ browser tabs and a local build running. Weighs more than I expected though.',
    verified: false,
  },
];

const PROGRESS = [
  'Validated Amazon.in product page',
  'Fetched product page',
  'Extracted structured metadata',
  'Collected 1,243 review signals',
  'Scored worth, risk & timing',
  'Assembled decision report',
];

export const DEMO_REPORT = {
  ok: true,
  requestedUrl: 'https://demo.ayymus.ai/sample-laptop',
  resolvedUrl: 'https://www.amazon.in/dp/B0CQ7K2R2L',
  short: false,
  shortenedHost: null,
  site: { id: 'amazon', label: 'Amazon' },
  product: {
    title: 'ASUS Vivobook 16X OLED (2024) 16-inch 3.2K OLED Laptop, Intel Core Ultra 5 125H, 16GB RAM / 1TB SSD, Windows 11',
    brand: 'ASUS',
    price: 78990,
    originalPrice: 104990,
    currency: 'INR',
    image: null,
    rating: 4.4,
    ratingCount: 1243,
    reviewCount: 1243,
    availability: 'In Stock',
    category: 'Laptop',
    specifications: {
      Processor: 'Intel Core Ultra 5 125H',
      RAM: '16 GB',
      Storage: '1 TB SSD',
      Display: '16-inch 3.2K OLED',
      Battery: '70 Wh',
      Weight: '1.8 kg',
    },
  },
  reviews: SAMPLES,
  analytics: {
    worth: { score: 78, label: 'Strong', level: 'good', reasons: ['Good price-to-spec ratio', 'OLED display above price class'] },
    decision: { score: 74, label: 'Buy' },
    risk: { score: 32, label: 'Low' },
    suitability: { score: 71, label: 'Good fit', factors: ['Productivity workloads', 'Content creation'] },
  },
  report: {
    verdict: {
      key: 'BUY_NOW',
      label: 'Buy Now',
      decision: 'BUY_NOW',
      confidence: 78,
      rationale:
        'At ₹78,990 the VivoBook 16X undercuts most OLED ultrabooks by ₹15–25k while matching their core specs. Reviewers consistently praise the display, keyboard and multi-core performance; the two consistent complaints (battery endurance and average speakers) map to clear personas rather than quality defects. With a 25% discount already applied and the fall sale likely to hold or deepen slightly, it is a good buy now with modest upside to waiting.',
      factors: [
        { label: 'Price vs specs', direction: 'positive', detail: '3.2K OLED + Core Ultra 5 at 25% off sits below most rivals at this class.' },
        { label: 'Review signal', direction: 'positive', detail: '4.4/5 across 1,243 ratings; praise concentrates on display, keyboard and speed.' },
        { label: 'Battery endurance', direction: 'negative', detail: '~6 hours real-world is short for an all-day travel machine.' },
        { label: 'Speakers', direction: 'negative', detail: 'Tinny audio is the most repeated complaint.' },
      ],
    },
    sections: [
      {
        id: 'value',
        title: 'Is it worth it?',
        headline: 'Yes — strongest OLED value in this segment right now',
        confidence: 78,
        paragraphs: [
          'At ₹78,990 the VivoBook 16X lands ~20% below its launch price and undercuts OLED rivals from Dell, Lenovo and HP by ₹15–25k. You get a 3.2K OLED panel, Core Ultra 5 125H, 16GB RAM and a 1TB SSD — a combination that was reserved for ₹1L+ machines a year ago.',
          'The trade-offs are real but predictable: battery life sits around 6 hours and the speakers are mediocre. Neither is a defect for a desk-and-commute machine; both show up consistently in reviews.',
        ],
        evidence: ['₹104,990 → ₹78,990 (25% off)', '3.2K OLED in this price band is rare', '4.4/5 across 1,243 ratings'],
      },
      {
        id: 'timing',
        title: 'When should you buy?',
        headline: 'Good now, slightly better in the fall sales',
        confidence: 62,
        paragraphs: [
          'Electronics discounts typically deepen during October–November festive sales, so a further ₹3–5k drop is plausible on this SKU within ~2 months. If you need the machine now, the current price is already fair.',
        ],
        evidence: ['Seasonal electronics discounts peak Oct–Nov', '25% off already applied'],
      },
      {
        id: 'risk',
        title: 'Risks & gotchas',
        headline: 'Low risk, two known compromises',
        confidence: 74,
        paragraphs: [
          'The most repeated complaints are battery endurance (~6h) and average speakers. Some reviewers also note the metal chassis picks up fingerprints. No hardware-defect pattern or service-center red flags surfaced across the review sample.',
        ],
        evidence: ['Battery and speakers = recurring complaints', 'No defect/DOA pattern in sample', '1-year on-site warranty'],
      },
      {
        id: 'alternatives',
        title: 'What else should you consider?',
        headline: 'One strong alternative worth checking',
        confidence: 66,
        paragraphs: [
          'If battery matters more than the screen, the HP Pavilion Plus 14 (2.8K OLED, Ryzen 7) offers similar pricing with better endurance but a smaller panel. For pure CPU grunt, the Lenovo IdeaPad Slim 5 with Ryzen 7 trades the OLED for an IPS screen at a similar price.',
        ],
        evidence: ['HP Pavilion Plus 14: longer battery, smaller screen', 'IdeaPad Slim 5: more CPU, IPS instead of OLED'],
      },
      {
        id: 'price',
        title: 'Price trend',
        headline: 'Traded in a narrow band over the last two months',
        confidence: 70,
        paragraphs: [
          'Observed prices have moved between ₹76,990 and ₹84,990 with no sustained spike, which supports a "buy now is fine, waiting has modest upside" read.',
        ],
        evidence: ['Range: ₹76,990 – ₹84,990', 'Current: ₹78,990'],
      },
    ],
    summary: {
      paragraphs: [
        'The ASUS VivoBook 16X OLED is a strong value buy at ₹78,990 — its display and specs outclass the price band, and review sentiment is firmly positive.',
        'It is best suited to productivity and content work; pick something lighter or longer-lasting if you travel all day.',
        'Buy now for a fair price, or hold out for a possible ₹3–5k dip in the October–November sales.',
      ],
    },
    personalization: {
      present: true,
      text: 'This fits a developer or student wanting a big, colour-accurate screen and fast multi-core performance on a budget. If you mostly commute with the laptop, the ~6h battery may push you to an alternative.',
      confidence: 71,
    },
    dataQuality: { level: 'good', notes: [] },
    priceHistory: [
      { date: '2026-06-05', price: 84990 },
      { date: '2026-06-19', price: 83990 },
      { date: '2026-07-03', price: 80990 },
      { date: '2026-07-17', price: 78990 },
      { date: '2026-07-31', price: 76990 },
      { date: '2026-08-07', price: 78990 },
    ],
    priceCurrent: 78990,
    currency: 'INR',
    intelligence: {
      price: {
        current: 78990,
        original: 104990,
        discountPercent: 25,
        fairnessScore: 72,
        fairnessLabel: 'Fair',
        volatility: 'low',
        bestTimeToBuy: 'Festive sales (Oct–Nov) may shave another ₹3–5k; current price is already fair.',
        seasonality: { label: 'Electronics & gadgets', inSeason: false },
        priceTrend: null,
        savingsOpportunity: 26000,
        fairRange: [70000, 95000],
        confidence: 0.68,
        notes: ['Current price sits below the midpoint of the observed range', '25% off the list price already applied'],
        source: 'computed',
      },
      sentiment: {
        present: true,
        overall:
          'Owners are happy with the display, keyboard and raw speed; battery endurance and speakers are the two consistent let-downs. Overall the sentiment is clearly positive with a narrow, predictable downside.',
        positive: 76,
        neutral: 10,
        negative: 14,
        avgRating: 4.4,
        dimensions: {
          battery: { key: 'battery', label: 'Battery life', score: 58, summary: 'Mostly 6-hour real-world endurance; a common but not deal-breaking complaint.' },
          build: { key: 'build', label: 'Build & materials', score: 76, summary: 'Rigid aluminium lid; attracts fingerprints.' },
          performance: { key: 'performance', label: 'Performance', score: 86, summary: 'Fast for heavy multitasking and builds; rarely feels slow.' },
          display: { key: 'display', label: 'Display quality', score: 90, summary: 'OLED colours and contrast praised repeatedly.' },
          value: { key: 'value', label: 'Value', score: 82, summary: 'Seen as strong value at the current discounted price.' },
          heating: { key: 'heating', label: 'Thermal behavior', score: 70, summary: 'Stays cool on light work; fans ramp under sustained load.' },
        },
      },
      personas: {
        shouldBuy: [
          { key: 'developer', label: 'Developers', icon: 'code', fit: 'high', why: 'Fast multi-core CPU, 1TB storage, colour-accurate OLED for long sessions.' },
          { key: 'student', label: 'Students', icon: 'book', fit: 'good', why: 'Big screen and value price for coursework; battery is adequate for campus days.' },
          { key: 'creator', label: 'Content creators', icon: 'video', fit: 'good', why: '3.2K OLED is a strong panel for photo/video work at this price.' },
        ],
        shouldAvoid: [
          { key: 'travel', label: 'Travelers', icon: 'plane', why: '~6h battery and 1.8kg weight are a poor fit for all-day commuting.' },
          { key: 'gamer', label: 'Gamers', icon: 'gamepad', why: 'Integrated graphics only; this is a work machine, not a gaming rig.' },
        ],
      },
      specExplained: [
        { key: 'display', label: 'Display', rawLabel: 'Display', value: '16-inch 3.2K OLED', explanation: '3.2K (3200×2000) OLED gives deep blacks and wide colour coverage — rare in this price band and ideal for media and creative work.' },
        { key: 'cpu', label: 'Processor', rawLabel: 'Processor', value: 'Intel Core Ultra 5 125H', explanation: 'A 14-core Meteor Lake chip with a capable NPU; comfortably fast for multitasking, compilation and light AI workloads.' },
        { key: 'ram', label: 'RAM', rawLabel: 'RAM', value: '16 GB', explanation: 'Enough for heavy browser, office and coding use; not upgradable on some configs, so 16GB is the safe pick.' },
        { key: 'storage', label: 'Storage', rawLabel: 'Storage', value: '1 TB SSD', explanation: 'PCIe SSD with 1TB means no need to add a drive early; expansion slot available on this model.' },
        { key: 'battery', label: 'Battery', rawLabel: 'Battery', value: '70 Wh', explanation: 'Rated ~10h, real-world ~6h on brightness 70% — the main compromise reviewers flag.' },
      ],
      reviewAnalysis: {
        positive: 76,
        neutral: 10,
        negative: 14,
        fakeRisk: 18,
        spamRemoved: 3,
        duplicatesRemoved: 1,
        avgRating: 4.4,
        starDistribution: [72, 12, 6, 4, 6],
        praiseCount: 12,
        complaintsCount: 4,
        recurringIssues: ['Battery life (~6h)', 'Average speakers'],
        positiveQuotes: [
          { comment: 'The OLED panel is stunning for the price and the keyboard is comfortable for long typing sessions.', author: 'Rohit M', rating: 5 },
          { comment: 'Processor never feels slow even with 20+ browser tabs and a local build running.', author: 'Aman S', rating: 4 },
        ],
        negativeQuotes: [
          { comment: 'Gets about 6 hours on brightness ~70%. Good for a desktop replacement but not an all-day travel machine.', author: 'Priya K', rating: 3 },
        ],
      },
    },
  },
  dataQuality: { level: 'good', notes: [] },
  extraction: {
    site: { id: 'amazon', label: 'Amazon' },
    sourceUrl: 'https://www.amazon.in/dp/B0CQ7K2R2L',
    progress: PROGRESS,
  },
  progress: PROGRESS,
};

export default DEMO_REPORT;
