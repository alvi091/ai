const AIService = require('../ai/AIService');

function hashCode(str) {
  let h = 0;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pick(seed, arr) {
  if (!arr || arr.length === 0) return '';
  return arr[seed % arr.length];
}

function money(v, currency) {
  if (v == null || isNaN(v)) return '';
  const sym = currency === 'USD' ? '$' : '\u20B9';
  return `${sym}${Math.round(v).toLocaleString('en-IN')}`;
}

function inr(v) {
  return money(v, 'INR');
}

function pct(v) {
  return v == null ? '' : `${Math.round(v)}%`;
}

/* ------------------------------------------------------------------ */
/* Section composers — each returns { headline, paragraphs, evidence } */
/* ------------------------------------------------------------------ */

function composePriceSection(a, seed) {
  const { price, trend } = a;
  const cur = a.product.currency;
  const p = price;
  const hasHistory = trend && trend.present;
  const paragraphs = [];
  const M = (v) => money(v, cur);

  const position = p.positionPercent != null
    ? (p.positionPercent <= 25 ? 'floor' : (p.positionPercent >= 75 ? 'ceiling' : 'middle'))
    : 'middle';

  const positionFrames = {
    floor: [
      `Priced at ${M(p.current)}, this is hugging the bottom of its recent range — the 45-day path ran from ${M(p.low)} up to ${M(p.high)}, and today is near that floor.`,
      `At ${M(p.current)} the price is effectively at its recent low (${M(p.low)} vs a ${M(p.high)} peak). Buyers who paid much more in the last month and a half got the same item for extra money.`,
    ],
    middle: [
      `At ${M(p.current)} this sits between its ${M(p.low)} floor and ${M(p.high)} ceiling — roughly the middle of the recent trading range.`,
      `The current ${M(p.current)} is neither the giveaway nor the peak: the range has been ${M(p.low)} to ${M(p.high)} over the tracked window.`,
    ],
    ceiling: [
      `At ${M(p.current)} this is near the top of its recent price band (${M(p.low)}–${M(p.high)}). You are paying close to the most anyone has paid for it in the tracked period.`,
      `Today's ${M(p.current)} sits uncomfortably close to the ${M(p.high)} high mark, far from the ${M(p.low)} low it has touched.`,
    ],
  };
  paragraphs.push(pick(seed, positionFrames[position]));

  if (hasHistory && trend.direction === 'downward') {
    paragraphs.push(pick(seed, [
      `The wider trend is a downward one — the price has fallen ${pct(trend.changePercent)}% across ${trend.windowDays} tracked days. Momentum still points down, so there's a real chance of a lower entry if you're patient.`,
      `What stands out is the direction: over ${trend.windowDays} days the price has drifted down ${pct(Math.abs(trend.changePercent))}%. That kind of descent tends to continue until something fundamental changes.`,
    ]));
  } else if (hasHistory && trend.direction === 'upward') {
    paragraphs.push(pick(seed, [
      `The opposite of a deal-in-waiting: the trend is up ${pct(trend.changePercent)}% over ${trend.windowDays} days. If this keeps climbing, the window to buy at a sane price is now, not later.`,
      `Prices have been marching upward (${pct(trend.changePercent)}% over ${trend.windowDays} days). Waiting usually means paying more with this kind of momentum.`,
    ]));
  } else if (hasHistory && trend.volatility === 'high') {
    paragraphs.push(pick(seed, [
      `The history is volatile — swinging between ${M(p.low)} and ${M(p.high)} repeatedly. This product rewards waiting for the dips; catching it at the top of a swing is how people overpay.`,
      `Price movement here is jumpy rather than smooth: ${M(p.low)} to ${M(p.high)} and back again. Timing matters more than it does for a stable-priced product.`,
    ]));
  } else if (hasHistory) {
    paragraphs.push(pick(seed, [
      `Price movement over the tracked window has been comparatively steady (${M(p.low)}–${M(p.high)}), so there's less of a timing game to play than with volatile products.`,
      `With a stable band of ${M(p.low)} to ${M(p.high)} behind it, the price isn't going to reward clever waiting the way a volatile product would.`,
    ]));
  }

  if (p.onSale && p.discountPercent > 0) {
    paragraphs.push(pick(seed, [
      `There's a live ${pct(p.discountPercent)} discount off the ${M(p.original)} reference price — the seller is actively trying to move this.`,
      `Currently marked down ${pct(p.discountPercent)} from ${M(p.original)}, so part of the deal is already baked into today's number.`,
    ]));
  }

  return {
    id: 'price',
    title: 'Price & Timing',
    headline: pick(seed + 1, [
      `What the numbers say about ${pct(position === 'floor' ? 'the price floor' : position === 'ceiling' ? 'the price ceiling' : 'the mid-range price')} of this product`,
      `Reading the price history for ${a.product.name.split(' ').slice(0, 2).join(' ')}`,
      `Is the current ${M(p.current)} tag justified?`,
    ]),
    paragraphs,
    evidence: [
      `Current ${M(p.current)}`,
      p.original ? `Reference ${M(p.original)}` : null,
      hasHistory ? `Range ${M(p.low)}–${M(p.high)} over ${trend.windowDays} days` : null,
      hasHistory ? `Net change ${pct(trend.changePercent)}` : null,
    ].filter(Boolean),
    confidence: hasHistory ? Math.min(90, trend.signalStrength + 10) : 35,
  };
}

function topicSentence(topic, direction, weight, seed) {
  const adverb = weight > 5 ? 'repeatedly' : weight > 2.5 ? 'frequently' : 'occasionally';
  const adjective = weight > 5 ? 'repeated' : weight > 2.5 ? 'frequent' : 'occasional';
  const mention = `appears ${adverb} in feedback`;
  if (direction === 'complained') {
    const fragments = {
      battery: `Battery life is the recurring sore spot — it ${mention} as draining faster than expected.`,
      comfort: `Comfort shows up as a complaint with ${adjective} regularity — enough to matter for anyone planning long sessions.`,
      durability: `Durability is the worry here: negative mentions about not holding up ${adverb} surface.`,
      performance: `Performance draws ${adjective} criticism — enough to temper expectations before buying.`,
      build: `Build quality is a common gripe, with ${adjective} complaints about materials or assembly.`,
      noise: `Noise is a repeated complaint — an issue that only grows with regular use.`,
      size: `Sizing and fit come up ${adverb} as a problem — a meaningful risk when buying sight-unseen.`,
      value: `Value-for-money doubt ${mention} in negative reviews, which matters for a purchase like this.`,
      software: `Software and connectivity issues ${mention} — the kind of thing firmware updates may or may not fix.`,
      design: `Design expectations are ${adverb} disappointed in negative feedback.`,
      easeOfUse: `Ease of use draws ${adjective} negative mentions — check the learning curve before committing.`,
      heating: `Heating under load is flagged ${adverb} — a real concern for sustained use.`,
      camera: `Camera performance disappoints ${adverb} in negative reviews.`,
      screen: `Display issues surface ${adverb} in negative feedback.`,
      waterproof: `Water resistance is doubted ${adverb} in reviews — don't rely on it unless confirmed.`,
      shipping: `Shipping and packaging problems ${mention} — mostly bad luck, but worth knowing.`,
      smell: `Smell is a ${adjective} complaint, which is a deal-breaker for some buyers.`,
      food: `Freshness and taste come up ${adverb} as inconsistent.`,
      fabric: `Fabric quality is ${adverb} criticized — inspect material claims carefully.`,
      repairability: `Repairability concerns surface ${adverb} — repair may be impractical when something fails.`,
      support: `Support and warranty experiences are ${adverb} poor in negative reviews.`,
    };
    return fragments[topic] || `${topic} draws ${adjective} negative feedback — weigh that against your tolerance.`;
  }
  const fragments = {
    battery: `Battery life is ${adverb} praised — a genuine strength for everyday use.`,
    comfort: `Comfort is a highlight, praised ${adverb} — one of the safer reasons to buy.`,
    durability: `Durability earns ${adverb} praise, suggesting it can take real use.`,
    performance: `Performance is ${adverb} commended — buyers feel it does the job well.`,
    build: `Build quality earns ${adverb} praise — it feels like money well spent.`,
    noise: `Quiet operation is ${adverb} appreciated.`,
    size: `Sizing and fit get ${adjective} positive mentions — sizing looks reliable.`,
    value: `Buyers ${adverb} call it good value for the price.`,
    software: `Software and connectivity are ${adverb} liked — a smooth experience overall.`,
    design: `Design is ${adverb} praised — one of its stronger points.`,
    easeOfUse: `Ease of use is ${adverb} appreciated — it works as expected out of the box.`,
    heating: `Thermals are ${adverb} complimented — it stays cool under load.`,
    camera: `Camera quality is ${adverb} praised in positive reviews.`,
    screen: `The display is ${adverb} complimented.`,
    waterproof: `Water resistance is ${adverb} confirmed in real-world use.`,
    shipping: `Delivery and packaging are ${adverb} noted positively.`,
    fabric: `Fabric feel is ${adverb} praised — it wears well.`,
    support: `Support experiences are ${adverb} positive.`,
  };
  return fragments[topic] || `${topic} is ${adverb} mentioned positively.`;
}

function composeReviewsSection(a, seed) {
  const r = a.reviews;
  const s = a.sentiment;
  const paragraphs = [];

  if (!r.present) {
    return {
      id: 'reviews',
      title: 'Review Evidence',
      headline: 'Limited review data — confidence is lower',
      paragraphs: [
        `There simply isn't enough verified buyer feedback to build a confident picture of ${a.product.name}. With so little evidence, treat the rating as indicative rather than decisive.`,
        `What little exists points to a ${r.averageRating ? r.averageRating.toFixed(1) + '/5' : 'unverified'} average — but with ${r.totalReviews} total reviews, the margin of error is wide.`,
      ],
      evidence: [`${r.totalReviews || 0} reviews on record`],
      confidence: r.reviewConfidence,
    };
  }

  const star = (n) => `${n}%`;
  const dist = r.distribution;
  const hasDist = dist && (Number(dist.p5) + Number(dist.p1) + Number(dist.p3) + Number(dist.p2) + Number(dist.p1)) > 0;
  const distStory = hasDist
    ? [
      `${pct(dist.p5)} of buyers gave five stars and ${pct(dist.p1)} gave one — a ${dist.p5 >= 60 ? 'clearly positive' : dist.p5 >= 40 ? 'mostly positive' : 'polarized'} spread.`,
      `The breakdown shows ${pct(dist.p5)} five-star vs ${pct(dist.p1)} one-star reviews. ${dist.p5 >= 2 * Math.max(1, dist.p1) ? 'That ratio skews strongly in the product\'s favor.' : dist.p1 > dist.p5 ? 'That is a red flag — more people hated it than loved it.' : 'A mixed bag, with no clear consensus.'}`,
    ]
    : [
      `No star-distribution breakdown is available, only the ${r.averageRating ? r.averageRating.toFixed(1) + '/5' : ''} headline average — so the spread of opinions is harder to judge.`,
    ];
  paragraphs.push(pick(seed, distStory));

  if (r.mostLoved.length > 0) {
    const top = r.mostLoved[0];
    paragraphs.push(topicSentence(top.key, 'loved', top.weight, seed + 1));
  }
  if (r.mostComplained.length > 0) {
    const top = r.mostComplained[0];
    paragraphs.push(topicSentence(top.key, 'complained', top.weight, seed + 2));
    if (r.mostComplained.length > 1) {
      const second = r.mostComplained[1];
      paragraphs.push(topicSentence(second.key, 'complained', second.weight, seed + 3));
    }
  }

  if (s.present && s.shift !== 'none') {
    const word = s.shift === 'improving' ? 'improving' : 'deteriorating';
    const arrow = s.shift === 'improving' ? 'above' : 'below';
    paragraphs.push(pick(seed + 4, [
      `Sentiment is ${word}: the most recent reviews average ${s.recentAvg.toFixed(1)}/5, ${arrow} the lifetime ${s.overallAvg.toFixed(1)}/5. That is a signal the product (or its support) has ${s.shift === 'improving' ? 'gotten better' : 'gotten worse'} recently.`,
      `A meaningful shift: recent buyers rate it ${s.recentAvg.toFixed(1)}/5 against a lifetime ${s.overallAvg.toFixed(1)}/5. ${s.shift === 'improving' ? 'The trend is upward — newer buyers are happier.' : 'The trend is downward — newer buyers are less impressed.'}`,
    ]));
  }

  const quote = (q, n) => {
    if (!q) return null;
    const text = String(q.comment || q.text || '').slice(0, 140);
    return `"${text}${text.length >= 140 ? '…' : ''}" — ${q.author || 'verified buyer'}, rated ${q.rating}/5${q.helpful_votes ? ` (${q.helpful_votes} found helpful)` : ''}`;
  };
  const posQuote = quote(r.positiveQuotes[0], seed);
  const negQuote = quote(r.negativeQuotes[0], seed);

  return {
    id: 'reviews',
    title: 'Review Evidence',
    headline: pick(seed + 5, [
      `What ${r.totalReviews} buyers actually reported about ${a.product.name}`,
      `Reading between the stars: the review story for this product`,
      `How real owners rate this — and what they complain about`,
    ]),
    paragraphs: [paragraphs[0], ...paragraphs.slice(1)],
    evidence: [
      r.averageRating ? `${r.totalReviews} reviews, ${r.averageRating.toFixed(1)}/5 average` : `${r.totalReviews} reviews on record`,
      hasDist ? `Positive ${pct(r.positivePercent)} · Neutral ${pct(r.neutralPercent)} · Negative ${pct(r.negativePercent)}` : null,
      hasDist ? `5-star ${star(dist.p5)} · 1-star ${star(dist.p1)}` : null,
      posQuote,
      negQuote,
      r.mostLoved.length ? `Loved: ${r.mostLoved.map((t) => t.topic).join(', ')}` : null,
      r.mostComplained.length ? `Complained: ${r.mostComplained.map((t) => t.topic).join(', ')}` : null,
      s.present ? `Recent 10 avg ${s.recentAvg.toFixed(1)}/5 vs lifetime ${s.overallAvg.toFixed(1)}/5` : null,
    ].filter(Boolean),
    confidence: r.reviewConfidence,
  };
}

function composeCategorySection(a, seed) { const M = (v) => money(v, a.product.currency);
  const c = a.category;
  const st = c.stats;
  if (!st || !st.count || st.count < 5) {
    return null;
  }
  const vs = (v, med, higherIsBetter) => {
    if (!med) return '';
    const diff = ((v - med) / med) * 100;
    const dir = Math.abs(diff) < 8 ? 'in line with' : diff > 0 ? 'above' : 'below';
    return `${dir} the category median`;
  };

  const paragraphs = [];
  paragraphs.push(pick(seed, [
    `In its category (${c.name}, ${st.count} tracked products), this product's ${M(a.price.current)} price sits around the ${st.pricePercentile <= 30 ? 'lower' : st.pricePercentile >= 70 ? 'upper' : 'middle'} part of the range — ${vs(a.price.current, st.medianPrice)} (${M(st.medianPrice)}).`,
    `Measured against ${st.count} comparable ${c.name} items, the ${M(a.price.current)} tag is ${st.pricePercentile <= 30 ? 'on the affordable end' : st.pricePercentile >= 70 ? 'on the premium end' : 'mid-pack'}; the category midpoint is ${M(st.medianPrice)}.`,
  ]));

  const ratingVs = a.rating ? `${a.rating}/5 ${vs(a.rating, st.medianRating)} (category median ${st.medianRating}/5)` : '';
  if (ratingVs) paragraphs.push(pick(seed + 1, [
    `On quality, ${ratingVs}.`,
    `Ratings tell the same story: ${ratingVs}.`,
  ]));

  paragraphs.push(pick(seed + 2, [
    `In this category, the things that tend to decide buyer satisfaction are: ${c.focusAreas.map((f) => f.label).join('; ')}. Keep those in mind when reading the review evidence.`,
    `Reviews in ${c.name} usually hinge on ${c.focusAreas.map((f) => f.label.toLowerCase()).join(', ')} — the lenses worth applying to this product.`,
  ]));

  return {
    id: 'category',
    title: 'Category Positioning',
    headline: pick(seed + 3, [
      `How this fits into the wider ${c.name} market`,
      `Where ${a.product.brand || 'this brand'} sits among ${c.name} rivals`,
    ]),
    paragraphs,
    evidence: [
      `${st.count} products tracked in ${c.name}`,
      `Median price ${M(st.medianPrice)}`,
      `Median rating ${st.medianRating}/5`,
      `Price percentile ${st.pricePercentile}`,
    ],
    confidence: 75,
  };
}

function composeRiskSection(a, seed) {
  const risk = a.risk;
  const p = a.product;
  const notes = [];
  if (p.durabilityScore != null) {
    notes.push(p.durabilityScore >= 65 ? `durability scored ${p.durabilityScore}/100 — above average` : p.durabilityScore >= 40 ? `durability scored ${p.durabilityScore}/100 — middling` : `durability scored ${p.durabilityScore}/100 — a genuine concern`);
  }
  if (p.warrantyScore != null) {
    notes.push(p.warrantyScore >= 60 ? `warranty coverage rated ${p.warrantyScore}/100 — reasonable safety net` : `warranty coverage rated ${p.warrantyScore}/100 — thin, so self-insure`);
  }
  if (p.returnRate != null) {
    notes.push(`${Math.round(p.returnRate * 100)}% return rate — ${p.returnRate > 0.1 ? 'notable' : 'low'}`);
  }

  if (!risk && notes.length === 0) return null;

  const paragraphs = [];
  if (risk) {
    paragraphs.push(pick(seed, [
      `The buyer-regret model puts this at ${risk.regretProbability}% — ${risk.riskLabel.toLowerCase()}. ${risk.regretProbability <= 30 ? 'That is a low-regret profile, largely because reviews and price behavior are on your side.' : risk.regretProbability <= 55 ? 'That is a moderate figure — the risk isn\'t overwhelming, but it isn\'t negligible either.' : 'That is high — the probability of wishing you hadn\'t bought is real.'}`,
      `On risk, this scores ${risk.regretProbability}% (${risk.riskLabel.toLowerCase()}). ${risk.regretProbability > 55 ? 'Buyers in this band often regret the purchase — read the cons carefully.' : risk.regretProbability > 30 ? 'Middle-of-the-road: the downside is contained but present.' : 'Few buyers regret this — a favorable risk profile.'}`,
    ]));
  }
  if (notes.length > 0) {
    paragraphs.push(`Digging into specifics: ${notes.join('; ')}.`);
  }

  return {
    id: 'risk',
    title: 'Risk & Downside',
    headline: pick(seed + 1, [
      `What could go wrong with this purchase`,
      `The honest downside assessment`,
    ]),
    paragraphs,
    evidence: [
      risk ? `Regret probability ${risk.regretProbability}% (${risk.riskLabel})` : null,
      p.durabilityScore != null ? `Durability ${p.durabilityScore}/100` : null,
      p.warrantyScore != null ? `Warranty ${p.warrantyScore}/100` : null,
      p.returnRate != null ? `Return rate ${pct(p.returnRate * 100)}` : null,
    ].filter(Boolean),
    confidence: 70,
  };
}

function composeLongTermSection(a, seed) {
  const p = a.product;
  const durability = p.durabilityScore;
  const hasDurability = durability != null;

  const paragraphs = [];
  if (hasDurability) {
    paragraphs.push(pick(seed, [
      `Durability reads ${durability >= 65 ? 'well' : durability >= 40 ? 'average' : 'weak'} (${durability}/100). ${durability >= 65 ? 'This should comfortably outlive the category norm.' : durability >= 40 ? 'Expect an ordinary lifespan — not a forever product.' : 'Plan for a short life; buy only if that\'s acceptable.'}`,
      `On the longevity front the product scores ${durability}/100. ${durability >= 65 ? 'That supports a keep-it-years purchase.' : durability >= 40 ? 'It will last its time, but don\'t bank on many years.' : 'The lifespan math is unfavorable — replacement costs should factor into your decision.'}`,
    ]));
  }

  if (a.category.valueRetention && a.category.valueRetention !== 'Varies widely; check the specific type of product.') {
    paragraphs.push(pick(seed + 1, [
      `On value retention: ${a.category.valueRetention}`,
      `${a.category.valueRetention} — worth factoring into a longer-term view.`,
    ]));
  }

  if (paragraphs.length === 0) return null;

  return {
    id: 'longTerm',
    title: 'Long-Term Ownership',
    headline: pick(seed + 2, [
      `Thinking beyond the first week`,
      `What this purchase looks like in a year`,
    ]),
    paragraphs,
    evidence: [
      hasDurability ? `Durability ${durability}/100` : null,
      p.warrantyScore != null ? `Warranty ${p.warrantyScore}/100` : null,
    ].filter(Boolean),
    confidence: 65,
  };
}

function composeAlternativesSection(a, seed, alternatives = []) { const M = (v) => money(v, a.product.currency);
  const list = alternatives.slice(0, 3);
  if (!a.betterAlternative && list.length === 0) return null;

  const paragraphs = [];
  if (a.betterAlternative) {
    paragraphs.push(pick(seed, [
      `One alternative deserves a look: ${a.betterAlternative.name}, at ${M(a.betterAlternative.price)} with a ${a.betterAlternative.rating}/5 rating. It outranks this product on both rating and price — worth a few minutes of comparison before you commit.`,
      `Before buying, consider ${a.betterAlternative.name} (${M(a.betterAlternative.price)}, ${a.betterAlternative.rating}/5). On the data it is the stronger rating-to-price proposition.`,
    ]));
  }
  if (list.length > 0) {
    const names = list.map((x) => `${x.name} (${M(x.price)}, ${x.rating || 'n/a'}/5)`).join('; ');
    paragraphs.push(pick(seed + 1, [
      `Other ${a.category.name} options worth a look: ${names}.`,
      `For comparison, these category peers are relevant: ${names}.`,
    ]));
  }

  return {
    id: 'alternatives',
    title: 'Alternatives',
    headline: pick(seed + 2, [
      `What else is worth considering`,
      `Rival options in the same space`,
    ]),
    paragraphs,
    evidence: list.map((x) => `${x.name}: ${M(x.price)}, ${x.rating || 'n/a'}/5`),
    confidence: 65,
  };
}

function composeSummarySection(a, seed) { const M = (v) => money(v, a.product.currency);
  const d = a.decision;
  const r = a.reviews;
  const p = a.price;

  const ratingBit = r.present ? `${r.averageRating}/5 from ${r.totalReviews} reviews` : `a thin review base`;
  const priceBit = a.trend.present
    ? `at ${M(p.current)} vs a ${M(p.low)}–${M(p.high)} range`
    : `at ${M(p.current)}`;

  return {
    headline: pick(seed, [
      `${a.product.name} — ${ratingBit}, priced ${priceBit}`,
      `The short version on ${a.product.brand ? a.product.brand + ' ' : ''}${a.product.name.split(' ').slice(0, 2).join(' ')}`,
      `${a.product.brand ? a.product.brand + ' ' : ''}${a.product.name.split(' ').slice(0, 2).join(' ')} in one paragraph`,
    ]),
    paragraphs: [
      pick(seed, [
        `For ${a.product.name}, the verdict is ${d.verdict.toLowerCase().split('_').join(' ')}. ${d.rationale}`,
        `${a.product.name}: ${d.rationale}`,
        `${d.rationale} That's our read on ${a.product.name}.`,
      ]),
      pick(seed + 1, [
        `Confidence in this verdict is ${d.confidence}%. ${d.confidence < 60 ? 'That reflects thinner evidence than we would like.' : 'That reflects a solid base of price and review data.'}`,
        `We'd rate our confidence at ${d.confidence}%. ${d.confidence >= 80 ? 'The signals align unusually well.' : d.confidence >= 60 ? 'Most signals agree.' : 'Several data points were too weak to lean on.'}`,
        `Putting a number on it: ${d.confidence}% confidence. ${d.confidence >= 70 ? 'The case for this verdict is well supported.' : 'The case is defensible but rests on thinner evidence.'}`,
      ]),
      `Key signals: ${a.worth.score}/100 worth (${a.worth.tier}), ${a.popularity.tier} popularity with ${a.reviews.totalReviews || a.product.reviews || 0} reviews, ${a.risk ? a.risk.regretProbability + '%' : 'n/a'} regret risk${a.suitability ? `, ${a.suitability.score}% suitability for you` : ''}.`,
    ],
    evidence: [
      `${a.worth.score}/100 worth score (${a.worth.label})`,
      `Buyer risk ${a.risk ? a.risk.regretProbability + '%' : 'n/a'}`,
      `Popularity tier: ${a.popularity.tier}`,
      `Suitability: ${a.suitability ? a.suitability.score + '%' : 'not scored'}`,
    ],
    confidence: d.confidence,
  };
}

/* ------------------------------------------------------------------ */
/* Main builders                                                       */
/* ------------------------------------------------------------------ */

function buildSections(a, alternatives, seed) {
  const sections = [];
  const summary = composeSummarySection(a, seed);
  sections.push({ id: 'summary', title: 'Executive Summary', ...summary });

  const priceSec = composePriceSection(a, seed + 1);
  if (a.dataQuality.price !== 'missing') sections.push(priceSec);

  sections.push(composeReviewsSection(a, seed + 2));

  const catSec = composeCategorySection(a, seed + 3);
  if (catSec) sections.push(catSec);

  const riskSec = composeRiskSection(a, seed + 4);
  if (riskSec) sections.push(riskSec);

  const longTermSec = composeLongTermSection(a, seed + 5);
  if (longTermSec) sections.push(longTermSec);

  const altSec = composeAlternativesSection(a, seed + 6, alternatives);
  if (altSec) sections.push(altSec);

  return sections;
}

function buildPersonalization(a, user, intent, prompt, seed) { const M = (v) => money(v, a.product.currency);
  const bits = [];
  if (user && user.preferredBrands) {
    const brands = String(user.preferredBrands).split(',').map((b) => b.trim().toLowerCase());
    if (brands.includes(String(a.product.brand).toLowerCase())) {
      bits.push(`${a.product.brand} is a brand you've said you prefer, which is a soft positive here.`);
    }
  }
  if (user && user.budgetMax != null) {
    if (a.price.current <= user.budgetMax) {
      bits.push(`It fits your stated ${M(user.budgetMax)} budget ceiling${a.price.current <= user.budgetMax * 0.6 ? ' with real room to spare' : ''}.`);
    } else {
      bits.push(`It exceeds your stated ${M(user.budgetMax)} budget — that alone should give you pause.`);
    }
  }
  if (a.suitability && a.suitability.score != null) {
    bits.push(`Against your profile and the prompt "${prompt || 'your request'}", suitability scores ${a.suitability.score}%.`);
  }
  if (intent && intent.priority) {
    bits.push(`Your stated priority is ${intent.priority}, so focus on the sections about it.`);
  }
  if (bits.length === 0) return null;

  return {
    present: true,
    text: pick(seed, [
      `For you specifically: ${bits.join(' ')}`,
      `Personal angle: ${bits.join(' ')}`,
    ]),
    bits,
    confidence: 60,
  };
}

function dataQualityNotes(a) {
  const notes = [];
  if (a.dataQuality.reviews === 'missing' || a.dataQuality.reviews === 'limited') {
    notes.push('Review evidence is thin — all review-based conclusions carry lower confidence.');
  }
  if (a.dataQuality.price === 'missing') {
    notes.push('No usable price history — the timing analysis is largely a guess.');
  } else if (a.dataQuality.price === 'limited') {
    notes.push('Price history is short — trend conclusions are provisional.');
  }
  if (a.dataQuality.priceSource === 'catalog-scaled') {
    notes.push('Price history was derived from catalog data and scaled to this listing — direction is reliable, absolute levels are approximate.');
  } else if (a.dataQuality.priceSource === 'catalog') {
    notes.push('Price history is drawn from catalog data, not this listing\'s own transaction log.');
  }
  if (a.dataQuality.category === 'limited') {
    notes.push('Few comparable products were available for category benchmarking.');
  }
  return notes;
}

function buildReport(analytics, { user = null, intent = {}, prompt = '', alternatives = [] } = {}) {
  if (!analytics) return null;
  const a = analytics;
  const seed = hashCode(a.product.id + a.product.name);
  const sections = buildSections(a, alternatives, seed);
  const personalization = buildPersonalization(a, user, intent, prompt, seed + 7);
  const dqNotes = dataQualityNotes(a);

  const dataLevel = Object.values(a.dataQuality).filter((v) => v === 'rich').length >= 3
    ? 'rich'
    : Object.values(a.dataQuality).filter((v) => v === 'missing').length >= 2 ? 'sparse' : 'limited';

  return {
    verdict: a.decision,
    summary: sections[0],
    sections,
    personalization,
    priceHistory: (a.price && a.price.priceHistory) || [],
    priceCurrent: (a.price && a.price.current) || null,
    currency: a.product.currency,
    dataQuality: {
      level: dataLevel,
      notes: dqNotes,
      dimensions: a.dataQuality,
    },
    meta: {
      engine: 'decision-engine',
      generatedAt: new Date().toISOString(),
      dataSources: [
        a.dataQuality.price !== 'missing' ? 'Price history (45-day)' : null,
        a.dataQuality.reviews !== 'missing' ? 'Buyer review corpus' : null,
        'Category benchmarks',
        'Buyer-risk model',
      ].filter(Boolean),
    },
  };
}

async function generateReport(analytics, context = {}) {
  let llmReport = null;
  try {
    const ai = AIService.create('gemini');
    llmReport = await ai.generateProductReport(analytics, context);
  } catch { llmReport = null; }

  if (llmReport && llmReport.verdict && Array.isArray(llmReport.sections)) {
    return {
      ...llmReport,
      priceHistory: (analytics.price && analytics.price.priceHistory) || [],
      priceCurrent: (analytics.price && analytics.price.current) || null,
      currency: analytics.product.currency,
      meta: { ...(llmReport.meta || {}), engine: 'llm-decision-engine', generatedAt: new Date().toISOString() },
    };
  }
  return buildReport(analytics, context);
}

module.exports = { buildReport, generateReport };
