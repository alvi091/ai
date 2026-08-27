const VERDICTS = {
  BUY_NOW: { key: 'BUY_NOW', label: 'Buy Now', color: 'green', icon: 'ThumbsUp' },
  BEST_IN_CATEGORY: { key: 'BEST_IN_CATEGORY', label: 'Best in Its Category', color: 'green', icon: 'Award' },
  EXCELLENT_LONG_TERM_VALUE: { key: 'EXCELLENT_LONG_TERM_VALUE', label: 'Excellent Long-Term Value', color: 'green', icon: 'TrendingUp' },
  PREMIUM_CHOICE: { key: 'PREMIUM_CHOICE', label: 'Premium Choice', color: 'blue', icon: 'Crown' },
  GREAT_ENTRY_LEVEL: { key: 'GREAT_ENTRY_LEVEL', label: 'Great Entry-Level Option', color: 'green', icon: 'Rocket' },
  BUY_DURING_SALE: { key: 'BUY_DURING_SALE', label: 'Buy During a Sale', color: 'yellow', icon: 'Percent' },
  WAIT: { key: 'WAIT', label: 'Wait', color: 'yellow', icon: 'Clock' },
  GOOD_FOR_SPECIFIC_USERS: { key: 'GOOD_FOR_SPECIFIC_USERS', label: 'Good for Specific Users', color: 'blue', icon: 'Users' },
  GOOD_BUT_OVERPRICED: { key: 'GOOD_BUT_OVERPRICED', label: 'Good, but Overpriced', color: 'orange', icon: 'Tag' },
  BETTER_ALTERNATIVES: { key: 'BETTER_ALTERNATIVES', label: 'Better Alternatives Available', color: 'orange', icon: 'GitCompare' },
  NOT_RECOMMENDED: { key: 'NOT_RECOMMENDED', label: 'Not Recommended', color: 'red', icon: 'ThumbsDown' },
};

const DEFAULT_VERDICT = VERDICTS.WAIT;

function pick(seed, arr) {
  if (!arr || arr.length === 0) return '';
  return arr[Math.abs(seed) % arr.length];
}

function c(signals, v) {
  if (v == null) return '';
  const sym = signals.currency === 'USD' ? '$' : '\u20B9';
  return `${sym}${Math.round(v).toLocaleString('en-IN')}`;
}

function decide(signals, seed = 0) {
  const {
    rating, negativePercent, positivePercent, reviewConfidence,
    worth, price, discountPercent,
    nearLow, nearHigh, positionPercent, trend, low, high,
    popularity, risk, suitability, durability, warranty,
    pricePercentile, betterAlternative, onSale, hasPriceData, hasReviewData,
  } = signals;

  const factors = [];
  const addFactor = (label, direction, impact, detail) =>
    factors.push({ label, direction, impact, detail });

  let baseConfidence = hasReviewData ? Math.max(55, Math.min(95, 55 + reviewConfidence * 0.4)) : 45;
  if (hasPriceData && signals.pricePoints > 3) baseConfidence = Math.min(95, baseConfidence + 8);

  // --- Hard reject: genuinely bad product ---
  if (rating > 0 && rating < 3.0) {
    addFactor('Star rating', 'negative', 'high', `${rating}/5 average from buyers`);
    if (negativePercent > 35) addFactor('Negative share', 'negative', 'high', `${negativePercent}% of reviews are 2-star or worse`);
    return verdict(VERDICTS.NOT_RECOMMENDED, pick(seed, [
      `A ${rating}/5 average with ${negativePercent}% negative reviews is a clear warning sign. Too many buyers left unhappy for this to be a rational purchase${price ? ` at ${c(signals, price)}` : ''}.`,
      `With ${rating}/5 and ${negativePercent}% of buyers scoring it 2 stars or below, the feedback is damning. Steer clear unless you have a very specific reason to risk it.`,
    ]), factors, Math.min(baseConfidence, 80));
  }

  if (rating >= 3 && rating < 3.5 && negativePercent > 40 && !(onSale && discountPercent >= 25)) {
    addFactor('Weak satisfaction', 'negative', 'high', `${negativePercent}% of reviews are 2-star or worse`);
    return verdict(VERDICTS.NOT_RECOMMENDED, pick(seed, [
      `Only ${rating}/5 with a heavy negative skew — the occasional praise is outweighed by widespread dissatisfaction. Even at a discount this is a coin flip.`,
      `${rating}/5 is below the acceptance bar, and with ${negativePercent}% of reviews hostile, the praise that exists is hard to trust.`,
    ]), factors, Math.min(baseConfidence, 75));
  }

  // --- Best in category: standout rating + strong adoption ---
  if (rating >= 4.5 && popularity.tier !== 'niche' && positivePercent >= 65) {
    addFactor('Outstanding rating', 'positive', 'high', `${rating}/5 from buyers`);
    addFactor('Broad adoption', 'positive', 'medium', `${popularity.tier} with ${popularity.reviewVolume} reviews`);
    if (nearLow) {
      return verdict(VERDICTS.BUY_NOW, pick(seed, [
        `This is a category standout — ${rating}/5 across ${popularity.reviewVolume} reviews — and the price is right at its recent floor (${c(signals, low)}). Little reason to hesitate.`,
        `A top-rated product (${rating}/5) now trading at its recent low (${c(signals, low)}). When quality this proven meets a price this low, waiting usually backfires.`,
      ]), factors, Math.min(95, baseConfidence + 3));
    }
    return verdict(VERDICTS.BEST_IN_CATEGORY, pick(seed, [
      `Among its category peers this is the clear leader: ${rating}/5 with ${positivePercent}% positive feedback. The main question is price timing, not quality.`,
      `${rating}/5 with ${positivePercent}% happy buyers puts this at the top of its category. If anything, the only open question is whether now is the cheapest moment to pay.`,
    ]), factors, Math.min(92, baseConfidence));
  }

  // --- Better alternatives exist ---
  if (betterAlternative && worth < 62) {
    addFactor('Superior alternatives', 'negative', 'high', `a comparable option rates higher for the same or less money`);
    return verdict(VERDICTS.BETTER_ALTERNATIVES, pick(seed, [
      `The product is acceptable, but a directly comparable option offers a stronger rating-to-price ratio. Unless a specific feature here matters to you, the alternative wins.`,
      `A rival at a comparable price outrates this on the evidence (${betterAlternative.name}, ${c(signals, betterAlternative.price)}). That tips the balance unless a feature here is non-negotiable for you.`,
    ]), factors, Math.min(80, baseConfidence));
  }

  // --- Premium positioning ---
  if (pricePercentile >= 85 && rating >= 4.3 && durability >= 60) {
    addFactor('Premium price position', 'neutral', 'medium', `sits in the top ${100 - pricePercentile}% of category pricing`);
    addFactor('Strong reviews', 'positive', 'medium', `${rating}/5 from buyers`);
    return verdict(VERDICTS.PREMIUM_CHOICE, pick(seed, [
      `This commands a premium price and, on the evidence, mostly earns it — strong reviews and solid durability. It is a quality-tier pick for buyers who want the best rather than the cheapest.`,
      `Priced at the top of its category (${c(signals, price)}) but backed by ${rating}/5 reviews and strong durability — a legitimate premium option, not just a pricey one.`,
    ]), factors, Math.min(85, baseConfidence));
  }

  // --- Entry-level / budget positioning ---
  if (pricePercentile <= 30 && rating >= 3.8 && worth >= 52) {
    addFactor('Budget positioning', 'positive', 'medium', `priced in the lowest third of its category`);
    return verdict(VERDICTS.GREAT_ENTRY_LEVEL, pick(seed, [
      `For an entry-tier price (${c(signals, price)}) this delivers better-than-expected ratings (${rating}/5). A sensible first buy in this category — just don't expect top-tier longevity.`,
      `This sits at the affordable end of its category (${c(signals, price)}) while still earning ${rating}/5. Great starting point; set expectations accordingly.`,
    ]), factors, Math.min(82, baseConfidence));
  }

  // --- Long-term value ---
  if (durability >= 65 && (warranty >= 60 || risk.regretProbability <= 35) && worth >= 70) {
    addFactor('Durability', 'positive', 'high', `durability scoring ${durability}/100`);
    addFactor('Buyer risk', 'positive', 'medium', `${risk.riskLabel || 'moderate risk'}`);
    const timing = nearLow ? ' and it is currently near its price floor' : ' even if you pay a little more now';
    return verdict(VERDICTS.EXCELLENT_LONG_TERM_VALUE, pick(seed, [
      `This is a buy-it-once purchase — durable build, low buyer regret risk, and solid reviews. Over a multi-year horizon it should cost less per year than a cheaper, fragile rival${timing}.`,
      `The durability and low-regret profile make this a keep-for-years buy. Spreading the ${c(signals, price)} cost across a long lifespan makes it cheaper than it looks${timing}.`,
    ]), factors, Math.min(88, baseConfidence));
  }

  // --- Clear buy signal: great price + good product ---
  if (nearLow && worth >= 68 && rating >= 3.8) {
    addFactor('Price at floor', 'positive', 'high', `at ${c(signals, price)} vs ${c(signals, low)} recent low`);
    addFactor('Worth', 'positive', 'medium', `worth score ${worth}/100`);
    const urgency = trend === 'upward' ? ' and the trend is turning up' : '';
    return verdict(VERDICTS.BUY_NOW, pick(seed, [
      `Price has reached its recent floor (${c(signals, low)}${hasPriceData ? ', 45-day low' : ''}) and the product itself holds up (${rating}/5, worth ${worth}/100)${urgency}. This is the pattern that historically rewards acting now.`,
      `At ${c(signals, price)} this is as cheap as it has been in the tracked window, and a ${rating}/5 rating backs the purchase${urgency}. When floor price meets solid reviews, the data says buy.`,
    ]), factors, Math.min(90, baseConfidence));
  }

  // --- On sale but not at floor ---
  if (onSale && discountPercent >= 15 && worth >= 60) {
    addFactor('Active discount', 'positive', 'high', `${discountPercent}% off`);
    addFactor('Not at floor', 'neutral', 'medium', `still ${positionPercent}% above its recent low`);
    const saleContext = hasPriceData ? `, which has gone as low as ${c(signals, low)} within the tracked window` : '';
    return verdict(VERDICTS.BUY_DURING_SALE, pick(seed, [
      `There's a real ${discountPercent}% discount live right now, but the price is not at its historical floor${saleContext}. If you need it now, the current sale is fair; if you can wait, there is precedent for lower.`,
      `A ${discountPercent}% cut is on the table today, yet history shows deeper lows are possible. It's a reasonable buy under the sale, not a steal — decide based on whether you need it soon.`,
      `Right now ${discountPercent}% is being shaved off, which is meaningful but not the deepest discount this product has seen. Decent value during the sale; better value during a deeper one.`,
      `This is a ${discountPercent}% discount sitting above the real floor${saleContext}. That makes it a good sale purchase, not a must-buy — the patience premium is a real discount you'd leave on the table.`,
    ]), factors, Math.min(78, baseConfidence));
  }

  // --- Overpriced ---
  if (pricePercentile >= 70 && !nearLow && worth < 60) {
    addFactor('Price above market', 'negative', 'high', `sits in the upper ${100 - pricePercentile}% of category pricing`);
    return verdict(VERDICTS.GOOD_BUT_OVERPRICED, pick(seed, [
      `The product is fine, but at ${c(signals, price)} you're paying above what the category and its reviews justify. Patience or a sale would change the calculus.`,
      `${c(signals, price)} is meaningfully above the category norm, and the reviews don't justify the premium. A discount is the only way this becomes a good buy.`,
    ]), factors, Math.min(80, baseConfidence));
  }

  // --- Waiting makes sense (only when worth is low) ---
  if (hasPriceData && trend === 'downward' && !nearLow && positionPercent > 40 && worth < 65) {
    addFactor('Falling price', 'positive', 'medium', `trend is down from ${c(signals, high)} to ${c(signals, low)}`);
    return verdict(VERDICTS.WAIT, pick(seed, [
      `The price is still falling — the recent trend runs from ${c(signals, high)} down to ${c(signals, low)}, and today sits well above the floor. Waiting a bit more is the historically smart play.`,
      `Prices have been sliding (${c(signals, high)} → ${c(signals, low)} over the window) and we're not at the bottom yet. The patient buyer gets a better number here.`,
    ]), factors, Math.min(80, baseConfidence));
  }

  if (nearHigh && worth < 65) {
    addFactor('Near recent high', 'negative', 'medium', `at ${c(signals, price)} vs ${c(signals, high)} peak`);
    return verdict(VERDICTS.WAIT, pick(seed, [
      `You'd be buying near the top of the recent range (${c(signals, high)} peak). The same product has been significantly cheaper within this window — waiting costs nothing.`,
      `At ${c(signals, price)} this is close to its recent peak (${c(signals, high)}). Buying now locks in near the worst price of the tracked period.`,
    ]), factors, Math.min(78, baseConfidence));
  }

  // --- Specific users ---
  if (suitability && suitability.score >= 70 && worth >= 60) {
    addFactor('Strong personal match', 'positive', 'high', `${suitability.score}% suitability for your needs`);
    return verdict(VERDICTS.GOOD_FOR_SPECIFIC_USERS, pick(seed, [
      `The data is lukewarm in places, but this product matches your specific requirements unusually well (${suitability.score}% suitability). For a buyer with your profile it is a reasonable pick — for general shoppers, less so.`,
      `This isn't a universal recommendation, but against what you asked for it scores ${suitability.score}% suitability — the best reason to buy is personal fit, not universal acclaim.`,
    ]), factors, Math.min(75, baseConfidence));
  }

  // --- Fallback by worth, with data-specific phrasing ---
  const weakReviewNote = !hasReviewData ? ' The review evidence is thin, so treat the rating as indicative.' : '';
  const midPriceNote = pricePercentile >= 55 ? ` It sits in the upper ${100 - pricePercentile}% of its category on price.` : '';
  const negNote = negativePercent > 25 ? ` And ${negativePercent}% of reviews are 2-star or worse, which deserves attention.` : '';

  if (worth >= 75 && pricePercentile <= 55) {
    addFactor('Overall worth', 'positive', 'high', `worth score ${worth}/100`);
    addFactor('Fair category price', 'positive', 'medium', `in the lower-mid of category pricing`);
    return verdict(VERDICTS.BUY_NOW, pick(seed, [
      `Worth score ${worth}/100 with pricing below the category mid-point — the fundamentals are comfortably in the buyer's favor, even if nothing dramatic is happening.${negNote}`,
      `Strong value signal: ${worth}/100 worth at a price that undercuts most of its category. No reason to delay for a discount that may not come.${negNote}`,
      `A ${worth}/100 worth score and below-average category pricing is about as green a light as the data gives.${weakReviewNote}${negNote}`,
      `Few products in this band look this clean: ${worth}/100 worth, price under the category midpoint.${midPriceNote}${negNote}`,
    ]), factors, Math.min(82, baseConfidence));
  }
  if (worth >= 70 && pricePercentile <= 60) {
    addFactor('Overall worth', 'positive', 'high', `worth score ${worth}/100`);
    const openers = [
      `Worth ${worth}/100 means the fundamentals outweigh the reservations.`,
      `A ${worth}/100 worth score keeps this comfortably in buy territory.`,
      `The data is broadly on your side here — ${worth}/100 worth, and nothing in reviews or pricing is disqualifying.`,
      `At ${worth}/100 worth, the evidence skews buy.`,
      `A ${worth}/100 composite with ${rating ? rating + '/5' : 'a thin rating'} behind it is enough for a confident buy at the current price.`,
    ];
    const closers = [
      `The price is reasonable relative to the category.${midPriceNote}${negNote}`,
      `Not a once-in-a-year deal, but a sound purchase at today's number.${negNote}`,
      `${weakReviewNote}${negNote}`,
      `${midPriceNote}${negNote}`,
    ];
    return verdict(VERDICTS.BUY_NOW, `${pick(seed, openers)} ${pick(seed + 3, closers)}`, factors, Math.min(78, baseConfidence));
  }
  if (worth >= 65) {
    addFactor('Overall worth', 'positive', 'medium', `worth score ${worth}/100`);
    const openers = [
      `On balance this is a defensible buy — worth score ${worth}/100 with no disqualifying signals.`,
      `A ${worth}/100 worth score keeps this in buy territory.`,
      `Worth ${worth}/100 with no red flags in the fundamentals.`,
      `The numbers clear the bar at ${worth}/100.`,
    ];
    const closers = [
      `Watch the price; a sale would make it a stronger deal.${weakReviewNote}${midPriceNote}`,
      `It's not a screaming deal at the current tag, so a discount would sweeten it further.${negNote}`,
      `A reasonable buy now, a better one if a sale lands.${midPriceNote}${negNote}`,
      `It isn't a bargain bin find, but it isn't overpriced either.${midPriceNote}${negNote}`,
    ];
    return verdict(VERDICTS.BUY_NOW, `${pick(seed, openers)} ${pick(seed + 4, closers)}`, factors, Math.min(72, baseConfidence));
  }
  if (worth >= 60) {
    addFactor('Overall worth', 'positive', 'medium', `worth score ${worth}/100`);
    const nearNote = nearLow ? ', and it is near its price floor' : '';
    return verdict(VERDICTS.BUY_NOW, pick(seed, [
      `Worth ${worth}/100 — solid fundamentals with no disqualifying signals. A sensible buy at the current price.${negNote}`,
      `The scorecard reads ${worth}/100 — good enough to buy with confidence${nearNote}.${negNote}`,
      `Nothing here is broken (worth ${worth}/100) and the price is fair. No compelling reason to wait.${midPriceNote}${negNote}`,
      `A ${worth}/100 worth score and ${rating ? rating + '/5' : 'unverified'} rating put this in buy territory.${negNote}`,
    ]), factors, Math.min(75, baseConfidence));
  }
  if (worth >= 50) {
    addFactor('Overall worth', 'negative', 'medium', `worth score ${worth}/100`);
    return verdict(VERDICTS.WAIT, pick(seed, [
      `Worth ${worth}/100 is below the threshold where buying is clearly rational.${negNote} Unless the price drops meaningfully, hold off.`,
      `The evidence stacks against an immediate purchase: worth ${worth}/100, with reviews and pricing both middling.${midPriceNote}${negNote}`,
      `At ${worth}/100, this is a product to keep an eye on, not one to buy today.${negNote} Wait for a better number.`,
    ]), factors, Math.min(68, baseConfidence));
  }

  addFactor('Overall worth', 'negative', 'high', `worth score only ${worth}/100`);
  return verdict(VERDICTS.NOT_RECOMMENDED, pick(seed, [
    `Across reviews, price and risk this simply doesn't clear the bar (worth ${worth}/100). There are better ways to spend the money.${negNote}`,
    `Worth ${worth}/100 means the evidence, when weighted, comes out against this purchase. Not worth chasing.${negNote}`,
    `With ${worth}/100 on the composite score and no compensating strengths, this fails the smell test for most buyers.${negNote}`,
    `The composite is ${worth}/100 — below the line where the data supports a buy.${negNote}`,
  ]), factors, Math.min(72, baseConfidence));
}

function verdict(v, rationale, factors, confidence) {
  // When confidence is 70+, upgrade non-buy verdicts to BUY NOW.
  const NON_BUY_KEYS = ['WAIT', 'BUY_DURING_SALE', 'GOOD_BUT_OVERPRICED', 'GOOD_FOR_SPECIFIC_USERS'];
  if (NON_BUY_KEYS.includes(v.key) && confidence >= 70) {
    return {
      verdict: VERDICTS.BUY_NOW.key,
      label: VERDICTS.BUY_NOW.label,
      color: VERDICTS.BUY_NOW.color,
      icon: VERDICTS.BUY_NOW.icon,
      confidence,
      rationale: String(rationale || '').replace(/\s+/g, ' ').trim(),
      factors,
    };
  }
  return {
    verdict: v.key,
    label: v.label,
    color: v.color,
    icon: v.icon,
    confidence,
    rationale: String(rationale || '').replace(/\s+/g, ' ').trim(),
    factors,
  };
}

module.exports = { decide, VERDICTS, DEFAULT_VERDICT };
