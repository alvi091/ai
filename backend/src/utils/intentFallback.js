function extractIntentFromPrompt(prompt) {
  const lower = prompt.toLowerCase();
  const intent = {
    category: null,
    budget: null,
    min_budget: null,
    max_budget: null,
    usage: null,
    weather: null,
    location: null,
    priority: null,
    features: [],
    brand_preference: null,
  };

  const categoryKeywords = {
    'shoe': 'Fashion', 'sneaker': 'Fashion', 'boot': 'Fashion', 'footwear': 'Fashion',
    'sandal': 'Fashion', 'loafer': 'Fashion',
    'laptop': 'Electronics', 'notebook': 'Electronics', 'macbook': 'Electronics',
    'headphone': 'Electronics', 'earphone': 'Electronics', 'earbud': 'Electronics',
    'monitor': 'Electronics', 'display': 'Electronics', 'screen': 'Electronics',
    'chair': 'Home & Kitchen', 'desk chair': 'Home & Kitchen', 'ergonomic chair': 'Home & Kitchen',
    'phone': 'Electronics', 'smartphone': 'Electronics', 'iphone': 'Electronics',
    'fashion': 'Fashion', 'clothing': 'Fashion', 'dress': 'Fashion', 'belt': 'Fashion',
    'electronics': 'Electronics', 'gadget': 'Electronics', 'computer': 'Electronics',
    'kitchen': 'Home & Kitchen', 'cookware': 'Home & Kitchen', 'home': 'Home & Kitchen',
    'beauty': 'Beauty & Personal Care', 'skincare': 'Beauty & Personal Care', 'makeup': 'Beauty & Personal Care',
    'sport': 'Sports & Outdoors', 'outdoor': 'Sports & Outdoors', 'fitness': 'Sports & Outdoors', 'yoga': 'Sports & Outdoors', 'camping': 'Sports & Outdoors',
    'toy': 'Toys & Games', 'game': 'Toys & Games', 'puzzle': 'Toys & Games', 'doll': 'Toys & Games',
    'book': 'Books & Stationery', 'journal': 'Books & Stationery', 'stationery': 'Books & Stationery',
    'food': 'Groceries & Food', 'grocery': 'Groceries & Food', 'snack': 'Groceries & Food', 'chocolate': 'Groceries & Food',
    'car': 'Automotive', 'automotive': 'Automotive', 'tire': 'Automotive',
    'pet': 'Pet Supplies', 'dog': 'Pet Supplies', 'cat': 'Pet Supplies', 'bird': 'Pet Supplies',
    'sunglasses': 'Fashion', 'glasses': 'Fashion', 'eyewear': 'Fashion',
    'watch': 'Fashion', 'wristwatch': 'Fashion',
    'wallet': 'Fashion',
    'shirt': 'Fashion', 't-shirt': 'Fashion', 'jacket': 'Fashion', 'coat': 'Fashion', 'jeans': 'Fashion', 'pant': 'Fashion', 'hoodie': 'Fashion', 'sweater': 'Fashion',
    'hat': 'Fashion', 'cap': 'Fashion',
    'mouse': 'Electronics', 'keyboard': 'Electronics', 'camera': 'Electronics', 'drone': 'Electronics', 'projector': 'Electronics', 'speaker': 'Electronics', 'router': 'Electronics', 'printer': 'Electronics', 'tablet': 'Electronics',
    'knife': 'Home & Kitchen', 'pot': 'Home & Kitchen', 'pan': 'Home & Kitchen', 'utensil': 'Home & Kitchen', 'cutting board': 'Home & Kitchen', 'bowl': 'Home & Kitchen', 'container': 'Home & Kitchen', 'blender': 'Home & Kitchen',
    'lotion': 'Beauty & Personal Care', 'shampoo': 'Beauty & Personal Care', 'soap': 'Beauty & Personal Care', 'cream': 'Beauty & Personal Care', 'lipstick': 'Beauty & Personal Care',
    'tent': 'Sports & Outdoors', 'backpack': 'Sports & Outdoors', 'cooler': 'Sports & Outdoors', 'gym': 'Sports & Outdoors', 'exercise': 'Sports & Outdoors', 'hiking': 'Sports & Outdoors', 'bicycle': 'Sports & Outdoors', 'bike': 'Sports & Outdoors',
    'board game': 'Toys & Games', 'plush': 'Toys & Games', 'action figure': 'Toys & Games', 'building': 'Toys & Games',
    'pen': 'Books & Stationery', 'pencil': 'Books & Stationery',
    'coffee': 'Groceries & Food', 'tea': 'Groceries & Food', 'rice': 'Groceries & Food', 'oil': 'Groceries & Food', 'pasta': 'Groceries & Food',
    'tire': 'Automotive', 'wheel': 'Automotive', 'floor mat': 'Automotive', 'dashboard': 'Automotive', 'wiper': 'Automotive',
    'dog food': 'Pet Supplies', 'cat food': 'Pet Supplies', 'pet food': 'Pet Supplies',
    'leash': 'Pet Supplies', 'collar': 'Pet Supplies', 'pet bed': 'Pet Supplies', 'pet toy': 'Pet Supplies',
  };
  const sortedKeys = Object.entries(categoryKeywords).sort((a, b) => b[0].length - a[0].length);
  for (const [key, cat] of sortedKeys) {
    if (lower.includes(key)) { intent.category = cat; break; }
  }

  const priceMatch = lower.match(/(?:under|below|less than|max|budget of?|at most)\s*\$?(\d+)/);
  if (priceMatch) intent.max_budget = intent.budget = parseInt(priceMatch[1]);

  const minPriceMatch = lower.match(/(?:over|above|more than|min|at least|starting at)\s*\$?(\d+)/);
  if (minPriceMatch) intent.min_budget = parseInt(minPriceMatch[1]);

  const rangeMatch = lower.match(/\$?(\d+)\s*(?:-|to)\s*\$?(\d+)/);
  if (rangeMatch) { intent.min_budget = parseInt(rangeMatch[1]); intent.max_budget = intent.budget = parseInt(rangeMatch[2]); }

  const usageKeywords = {
    'walk': 'Walking', 'run': 'Running', 'jog': 'Running', 'hike': 'Hiking',
    'game': 'Gaming', 'gaming': 'Gaming', 'program': 'Programming', 'code': 'Programming',
    'office': 'Office', 'travel': 'Travel', 'commute': 'Commuting', 'workout': 'Workout',
  };
  for (const [key, use] of Object.entries(usageKeywords)) {
    if (lower.includes(key)) { intent.usage = use; break; }
  }

  const weatherKeywords = { 'winter': 'Winter', 'rain': 'Rain', 'snow': 'Winter', 'cold': 'Winter', 'summer': 'Summer', 'hot': 'Summer' };
  for (const [key, w] of Object.entries(weatherKeywords)) {
    if (lower.includes(key)) { intent.weather = w; break; }
  }

  const features = ['waterproof', 'lightweight', 'noise cancelling', 'noise-canceling', 'wireless', 'bluetooth', 'comfortable', 'durable', 'portable', 'ergonomic'];
  for (const f of features) { if (lower.includes(f)) intent.features.push(f); }

  const brands = ['nike', 'adidas', 'apple', 'samsung', 'sony', 'dell', 'hp', 'lenovo', 'bose', 'asics', 'brooks', 'new balance', 'puma', 'google', 'oneplus'];
  for (const b of brands) { if (lower.includes(b)) { intent.brand_preference = b.charAt(0).toUpperCase() + b.slice(1); break; } }

  if (lower.includes('comfort')) intent.priority = 'Comfort';
  else if (lower.includes('durability') || lower.includes('durable')) intent.priority = 'Durability';
  else if (lower.includes('performance') || lower.includes('fast')) intent.priority = 'Performance';
  else if (lower.includes('budget') || lower.includes('cheap') || lower.includes('affordable') || lower.includes('value')) intent.priority = 'Price';
  else if (lower.includes('quality') || lower.includes('premium')) intent.priority = 'Quality';

  return intent;
}

module.exports = { extractIntentFromPrompt };
