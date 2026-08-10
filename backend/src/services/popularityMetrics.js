function percentileRank(value, sortedValues) {
  if (sortedValues.length === 0) return 50;
  const sorted = [...sortedValues].sort((a, b) => a - b);
  const idx = sorted.findIndex((v) => v >= value);
  if (idx === -1) return 100;
  return Math.round((idx / sorted.length) * 100);
}

function computePopularity(product = {}, categoryStats = null) {
  const reviews = Number(product.reviews) || Number(product.reviews_count) || 0;
  const rating = Number(product.rating) || 0;

  if (!categoryStats) {
    const volumeScore = Math.min(100, (reviews / 500) * 100);
    const ratingScore = (rating / 5) * 100;
    const score = Math.round(volumeScore * 0.5 + ratingScore * 0.5);
    const tier = reviews >= 300 ? 'bestseller' : reviews >= 100 ? 'popular' : reviews >= 30 ? 'moderate' : 'niche';
    return { score, tier, reviewVolume: reviews, rating };
  }

  const reviewPercentile = percentileRank(reviews, categoryStats.reviewCounts);
  const ratingPercentile = percentileRank(rating, categoryStats.ratings);

  const volumeScore = Math.min(100, (reviews / Math.max(1, categoryStats.maxReviews)) * 100);
  const score = Math.round(volumeScore * 0.55 + ratingPercentile * 0.45);

  const tier =
    score >= 80 && reviews >= 150 ? 'bestseller'
      : score >= 60 ? 'popular'
      : score >= 40 ? 'moderate'
      : 'niche';

  return {
    score,
    tier,
    reviewVolume: reviews,
    rating,
    reviewVolumePercentile: reviewPercentile,
    ratingPercentile,
    vsCategory: {
      medianReviews: categoryStats.medianReviews,
      medianRating: categoryStats.medianRating,
    },
  };
}

module.exports = { computePopularity, percentileRank };
