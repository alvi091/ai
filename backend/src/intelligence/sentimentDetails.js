/*
 * Review sentiment AI — turns the review analyzer's numbers into plain-language
 * verdicts per product dimension (long-term reliability, build quality, battery,
 * performance, camera, comfort, durability). Deterministic; optional LLM polish
 * replaces the narrative upstream when configured.
 */

const DEFINITIONS = {
  battery: { title: 'Battery', label: 'Battery life' },
  build: { title: 'Build quality', label: 'Build & materials' },
  performance: { title: 'Performance', label: 'Performance' },
  camera: { title: 'Camera', label: 'Camera' },
  comfort: { title: 'Comfort & fit', label: 'Comfort' },
  durability: { title: 'Long-term reliability', label: 'Durability' },
  value: { title: 'Value for money', label: 'Value' },
  display: { title: 'Display', label: 'Display quality' },
  sound: { title: 'Sound', label: 'Audio quality' },
  heating: { title: 'Thermals', label: 'Thermal behavior' },
};

function tone(metrics, nullText) {
  if (!metrics || metrics.count === 0) return { score: null, summary: nullText || 'Not enough review signal to judge this. ' };
  const pos = metrics.positivePct;
  const neg = metrics.negativePct;
  if (pos >= 70) return { score: 85, summary: `Reviewers largely praise it${metrics.count >= 3 ? '' : ' (few mentions)'}.` };
  if (pos >= 50) return { score: 70, summary: 'Most mentions lean positive, with some mixed notes.' };
  if (neg >= 55) return { score: 35, summary: 'Reviewers flag this dimension more often than they praise it.' };
  if (neg >= 35) return { score: 45, summary: 'A genuinely split picture \u2014 some love it, some are let down.' };
  return { score: 60, summary: 'Mostly quiet; where it is mentioned, opinion tilts positive.' };
}

function narrative(aspect, metrics) {
  const base = {
    battery: ['Battery life is the kind of thing that decides desktop-vs-portable. ',
      'Anyone away from a charger should weigh battery reviews heavily before committing.'],
    build: ['Build quality is what keeps a product feeling premium a year in. ',
      'Physical materials fail differently than specs do \u2014 seams, plastics, hinge rigidity, weight balance.'],
    performance: ['Performance is the daily feel of the purchase. ',
      'Heavy workflows expose bottlenecks that casual hands-on reviews never hit.'],
    camera: ['Cameras are content this year that numbers fail to convey. ',
      'Real quality shows in low light, color science, and software processing \u2014 exactly what reviews capture.'],
    comfort: ['Comfort is subjective and contact-driven. ',
      'People with long-session uses (or commuting) tend to notice fit details earlier.'],
    durability: ['Long-term reliability is the quiet killer of many purchases. ',
      'The failure modes that show up at month six rarely appear in launch-week reviews.'],
    value: ['Value reads differently for every buyer. ',
      'The price premium you pay now must be paid off in use \u2014 reviews hint at who recovers it.'],
    display: ['Display quality sets the tone for anything you look at. ',
      'Brightness, bleed, and motion smearing surface through repeated reviewer anecdotes.'],
    sound: ['Audio is physical; placement and driver quality dominate. ',
      'Speaker sound and mic behavior are called out quickly by owners who rely on them.'],
    heating: ['Thermals under sustained load reveal engineering margins. ',
      'A device that throttles during the first hour of use will annoy you daily.'],
  };
  const pre = base[aspect] || [];
  const metricsTxt = (metrics && metrics.count >= 2)
    ? ` From ${metrics.count} review mentions, ${metrics.positivePct}% were positive and ${metrics.negativePct}% negative.`
    : (metrics && metrics.count === 1) ? ' Only one relevant mention \u2014 treat as anecdote, not evidence.' : '';
  return `${pre[0] || ''} ${metricsTxt} ${pre[1] || ''}`.replace(/\s+/g, ' ').trim();
}

function derive(analyzed) {
  const aspectS = analyzed.aspectSentiment || {};
  const out = { present: analyzed.present, overall: null };
  const posPct = analyzed.positive != null ? analyzed.positive : null;
  const negPct = analyzed.negative != null ? analyzed.negative : null;
  const total = analyzed.total || 0;

  const summary = overallSummary(analyzed);

  const dimensions = {};
  for (const key of Object.keys(DEFINITIONS)) {
    const metrics = aspectS[key];
    if (!metrics || metrics.count === 0) continue;
    const t = tone(metrics, null);
    dimensions[key] = {
      key,
      label: DEFINITIONS[key].label,
      score: t.score, // null when unverifiable
      summary: t.summary,
      narrative: narrative(key, metrics),
      metricCount: metrics.count,
    };
  }

  return {
    overall: summary,
    posPct,
    negPct,
    neutralPct: analyzed.neutral,
    dimensions,
    present: analyzed.present,
  };
}

function overallSummary(analyzed) {
  if (!analyzed.present) {
    return 'We could not extract review text for this product \u2014 the sentiment below reflects the star count only (or nothing at all); confidence is low.';
  }
  if (analyzed.total === 0) return 'No usable review text found.';
  const pos = analyzed.positive;
  const neg = analyzed.negative;
  const re = analyzed.avgRating;
  if (pos >= 75 && re >= 4) return `Collective sentiment is strongly positive (${pos}% positive, ${re}/5 average). Buyers seem genuinely pleased.`;
  if (pos >= 55) return `Most buyers are positive (${pos}% positive, ${re}/5 average). Worth the momentum.`;
  if (neg >= 40) return `Almost a third to a half of reviewers are negative (${neg}% negative) \u2014 a real risk cluster behind the ${re}/5 headline.`;
  if (neg >= 60) return `Reviewers skew negative (${neg}% negative). Compete the caution signs carefully.`;
  return `Opinions are split \u2014 roughly ${pos}% positive, ${neg}% negative. Neutral readers should weigh their must-haves.`;
}

function formatList(items) {
  const stuff = [];
  return items.map((i) => i.title).join(', ') || 'none measurable';
}

module.exports = { derive, overallSummary };