function matchCategory(category) {
  if (!category) return 'general';
  const c = String(category).toLowerCase();
  if (c.includes('home') || c.includes('kitchen')) return 'home';
  if (c.includes('pet')) return 'pet';
  if (c.includes('book') || c.includes('stationery') || c.includes('stationary')) return 'stationery';
  if (c.includes('automotive') || c.includes('auto') || c.includes('car')) return 'automotive';
  if (c.includes('beauty') || c.includes('personal') || c.includes('cosmetic')) return 'beauty';
  if (c.includes('electronic') || c.includes('phone') || c.includes('laptop') || c.includes('camera') || c.includes('headphone') || c.includes('tv') || c.includes('tech')) return 'electronics';
  if (c.includes('fashion') || c.includes('clothing') || c.includes('shoe') || c.includes('apparel')) return 'fashion';
  if (c.includes('toy') || c.includes('game')) return 'toys';
  if (c.includes('sport') || c.includes('outdoor') || c.includes('fitness') || c.includes('camping')) return 'sports';
  if (c.includes('grocery') || c.includes('food') || c.includes('drink')) return 'groceries';
  return 'general';
}

const PROFILES = {
  home: {
    key: 'home',
    label: 'Home & Kitchen',
    focusAreas: [
      { key: 'buildQuality', label: 'Build quality and materials' },
      { key: 'cleanability', label: 'Ease of cleaning and maintenance' },
      { key: 'fitAndSize', label: 'Fit, size and space requirements' },
      { key: 'longevity', label: 'Durability under daily use' },
      { key: 'value', label: 'Price relative to expected lifetime' },
    ],
    whatMatters: 'Daily-use household items live or die on build quality and how easy they are to clean. Reviews tend to punish anything that degrades after a few months of normal use.',
    commonConcerns: ['cheap materials', 'arrives damaged', 'difficult to clean', 'smaller than expected', 'stops working'],
    timing: 'Home goods rarely follow seasonal price cycles, but demand spikes around festive and holiday gifting periods.',
    valueRetention: 'Not an investment — value comes from usable lifespan. A slightly pricier item that lasts years usually beats a cheap one that needs replacing.',
    decisionLens: 'prioritize longevity and material quality over minor price differences',
    weights: { price: 0.25, reviews: 0.3, risk: 0.2, trend: 0.1, popularity: 0.15 },
  },
  pet: {
    key: 'pet',
    label: 'Pet Supplies',
    focusAreas: [
      { key: 'safety', label: 'Safety for the animal' },
      { key: 'durability', label: 'Durability against chewing, scratching, weather' },
      { key: 'cleanup', label: 'Clean-up and hygiene burden' },
      { key: 'sizeFit', label: 'Correct sizing for the pet' },
    ],
    whatMatters: 'Owners are unusually loyal to products that keep pets safe and survive enthusiastic use. Safety concerns dominate negative reviews.',
    commonConcerns: ['chewed through', 'too small', 'toxic or sharp', 'hard to clean', 'did not last'],
    timing: 'No strong seasonal pricing; refillable consumables recur on schedules worth planning for.',
    valueRetention: 'Few pet products hold resale value. Value = durability + safety, not name recognition.',
    decisionLens: 'weight safety and real-world durability above styling and brand',
    weights: { price: 0.2, reviews: 0.3, risk: 0.25, trend: 0.1, popularity: 0.15 },
  },
  stationery: {
    key: 'stationery',
    label: 'Books & Stationery',
    focusAreas: [
      { key: 'paperQuality', label: 'Paper and print quality' },
      { key: 'binding', label: 'Binding and long-term wear' },
      { key: 'usability', label: 'Everyday usability and layout' },
      { key: 'price', label: 'Price vs page count or content' },
    ],
    whatMatters: 'Reviewers care about physical quality — paper feel, print clarity, binding — and whether the content matches expectations.',
    commonConcerns: ['pages falling out', 'ink bleeding', 'arrived bent', 'small print'],
    timing: 'Back-to-school seasons drive temporary price lifts; expect discounts before academic terms.',
    valueRetention: 'Classic books and quality stationery can hold value well; mass-market editions depreciate fast.',
    decisionLens: 'judge physical quality and content match more than brand name',
    weights: { price: 0.25, reviews: 0.3, risk: 0.15, trend: 0.1, popularity: 0.2 },
  },
  automotive: {
    key: 'automotive',
    label: 'Automotive',
    focusAreas: [
      { key: 'compatibility', label: 'Exact fit and compatibility' },
      { key: 'install', label: 'Installation difficulty' },
      { key: 'durability', label: 'Durability in heat, cold, vibration' },
      { key: 'warranty', label: 'Warranty and return policy' },
    ],
    whatMatters: 'Fitment is everything. A part that is 2mm off can be useless, so compatibility confirmations and warranty terms matter more than flashy specs.',
    commonConcerns: ['does not fit', 'bad instructions', 'failed quickly', 'no warranty support'],
    timing: 'Tire, battery, and winter-gear pricing shifts seasonally; maintenance items follow car-parks aging cycles.',
    valueRetention: 'OEM and quality aftermarket parts hold utility value; cheap no-name parts fail fast and cost more overall.',
    decisionLens: 'verification of fit, warranty, and install ease before price',
    weights: { price: 0.2, reviews: 0.25, risk: 0.3, trend: 0.1, popularity: 0.15 },
  },
  beauty: {
    key: 'beauty',
    label: 'Beauty & Personal Care',
    focusAreas: [
      { key: 'effectiveness', label: 'Actual results and effectiveness' },
      { key: 'skinCompatibility', label: 'Skin/hair compatibility and reactions' },
      { key: 'value', label: 'Cost per use and longevity' },
      { key: 'formula', label: 'Texture, scent and application' },
    ],
    whatMatters: 'Personal-care products are deeply subjective — the same product can be a holy grail for one person and a reaction risk for another. Review volume and spread matter more than the raw average.',
    commonConcerns: ['caused breakouts', 'strong smell', 'did nothing', 'too small for price', 'greasy'],
    timing: 'Beauty drops frequent discounts; refillable daily-use items rarely benefit from waiting.',
    valueRetention: 'None. Value is entirely in the experience and outcome, so per-use cost is the honest metric.',
    decisionLens: 'read the spread of opinions and per-use cost, not just the star average',
    weights: { price: 0.25, reviews: 0.35, risk: 0.2, trend: 0.05, popularity: 0.15 },
  },
  electronics: {
    key: 'electronics',
    label: 'Electronics',
    focusAreas: [
      { key: 'performance', label: 'Real-world performance' },
      { key: 'battery', label: 'Battery life and charging' },
      { key: 'software', label: 'Software and update support' },
      { key: 'durability', label: 'Build durability and repairability' },
      { key: 'valueRetention', label: 'Depreciation and replacement cycle' },
      { key: 'accessories', label: 'Required accessories and hidden costs' },
    ],
    whatMatters: 'Electronics depreciate on a fast replacement cycle. The two questions that decide satisfaction are whether performance matches the price tier and whether the device will still be well-supported in two years.',
    commonConcerns: ['battery drains', 'heats up', 'software bugs', 'stops working', 'poor support', 'dated quickly'],
    timing: 'Major sale events and launch cycles create predictable windows — mid-cycle is usually the worst time to pay full price.',
    valueRetention: 'Drops fastest of all categories; buy only what fits the actual usage, not the aspirational one.',
    decisionLens: 'balance current performance against how soon it will feel outdated',
    weights: { price: 0.25, reviews: 0.25, risk: 0.2, trend: 0.15, popularity: 0.15 },
  },
  fashion: {
    key: 'fashion',
    label: 'Fashion',
    focusAreas: [
      { key: 'fit', label: 'Fit and sizing accuracy' },
      { key: 'comfort', label: 'Comfort and fabric feel' },
      { key: 'durability', label: 'Washability and durability' },
      { key: 'style', label: 'Style match and versatility' },
    ],
    whatMatters: 'Fit is the single biggest source of fashion dissatisfaction. Sizing charts lie; verified-purchase feedback is the ground truth. Fabric and wash-behavior decide whether an item still looks good after a season.',
    commonConcerns: ['runs small', 'runs large', 'fabric cheap', 'shrinks', 'color differs'],
    timing: 'End-of-season clearance is the reliable discount window; new arrivals carry a premium for the first weeks.',
    valueRetention: 'Fast fashion depreciates to near zero; quality basics and classic cuts retain the most utility.',
    decisionLens: 'trust verified fit feedback and fabric reviews over brand labels',
    weights: { price: 0.25, reviews: 0.3, risk: 0.2, trend: 0.1, popularity: 0.15 },
  },
  toys: {
    key: 'toys',
    label: 'Toys & Games',
    focusAreas: [
      { key: 'engagement', label: 'Engagement and replay value' },
      { key: 'safety', label: 'Safety and age-appropriateness' },
      { key: 'durability', label: 'Durability through rough play' },
      { key: 'value', label: 'Value for the experience delivered' },
    ],
    whatMatters: 'Toys succeed on sustained engagement, not first impressions. Parent reviews reveal what survives rough play and what gets abandoned in a week.',
    commonConcerns: ['breaks easily', 'small parts', 'boring quickly', 'overpriced for what it is'],
    timing: 'Holiday and gifting seasons lift prices; post-holiday clearance is the buying window.',
    valueRetention: 'None to speak of — value is the hours of engagement per dollar.',
    decisionLens: 'prioritize replay value and safety feedback over hype',
    weights: { price: 0.3, reviews: 0.3, risk: 0.15, trend: 0.1, popularity: 0.15 },
  },
  sports: {
    key: 'sports',
    label: 'Sports & Outdoors',
    focusAreas: [
      { key: 'comfort', label: 'Comfort and support' },
      { key: 'durability', label: 'Durability under physical stress' },
      { key: 'weight', label: 'Weight and portability' },
      { key: 'grip', label: 'Grip and terrain performance' },
      { key: 'weather', label: 'Weather and waterproofing' },
    ],
    whatMatters: 'Active gear is judged under real physical stress. A shoe that fails at the 50km mark or a tent that leaks in drizzle earns brutal, specific feedback that an average score hides.',
    commonConcerns: ['wears out fast', 'uncomfortable', 'too heavy', 'slippery', 'not waterproof', 'sizing off'],
    timing: 'Outdoor gear pricing follows seasons — buy off-season for steep cuts, on-season for fit confidence.',
    valueRetention: 'Premium technical gear holds utility value across seasons; budget gear fails early and costs more per use.',
    decisionLens: 'match gear to the actual activity intensity, then weigh comfort and durability above price',
    weights: { price: 0.2, reviews: 0.3, risk: 0.2, trend: 0.15, popularity: 0.15 },
  },
  groceries: {
    key: 'groceries',
    label: 'Groceries & Food',
    focusAreas: [
      { key: 'freshness', label: 'Freshness and quality' },
      { key: 'price', label: 'Unit price and value' },
      { key: 'packaging', label: 'Packaging and portion size' },
      { key: 'repeatBuy', label: 'Repeat-buy likelihood' },
    ],
    whatMatters: 'Consumables are bought on repeat, so the honest metric is cost per use plus consistency of quality across batches. One bad batch can poison brand trust.',
    commonConcerns: ['stale', 'wrong quantity', 'short expiry', 'overpriced'],
    timing: 'Prices fluctuate with supply; bulk and subscription pricing often beat waiting for a sale.',
    valueRetention: 'None — this is pure consumption, so value is per-serving cost.',
    decisionLens: 'compare per-unit cost and batch consistency, not the headline price',
    weights: { price: 0.35, reviews: 0.25, risk: 0.1, trend: 0.15, popularity: 0.15 },
  },
  general: {
    key: 'general',
    label: 'General',
    focusAreas: [
      { key: 'quality', label: 'Overall quality and build' },
      { key: 'value', label: 'Value for money' },
      { key: 'durability', label: 'Durability and lifespan' },
      { key: 'usability', label: 'Everyday usability' },
    ],
    whatMatters: 'With no strong category signal, satisfaction hinges on basic quality, honest value, and whether the product matches its own claims.',
    commonConcerns: ['poor quality', 'overpriced', 'not as described', 'fragile'],
    timing: 'Timing depends on the specific item — no strong category pattern.',
    valueRetention: 'Varies widely; check the specific type of product.',
    decisionLens: 'rely on verified reviews and price-to-quality ratio',
    weights: { price: 0.25, reviews: 0.3, risk: 0.2, trend: 0.1, popularity: 0.15 },
  },
};

function getCategoryProfile(category) {
  return PROFILES[matchCategory(category)] || PROFILES.general;
}

module.exports = { getCategoryProfile, matchCategory, PROFILES };
