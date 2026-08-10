const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const DATA_DIR = path.join(__dirname, '..', 'data');

const MARKETPLACES = [
  { file: 'amazon_products.json', label: 'Amazon' },
  { file: 'flipkart_products.json', label: 'Flipkart' },
  { file: 'meesho_products.json', label: 'Meesho' },
  { file: 'myntra_products.json', label: 'Myntra' },
  { file: 'nykaa_products.json', label: 'Nykaa' },
];

const MARKETPLACE_PAGE = {
  amazon: 'https://www.amazon.com/dp/',
  flipkart: 'https://www.flipkart.com/',
  meesho: 'https://www.meesho.com/',
  myntra: 'https://www.myntra.com/',
  nykaa: 'https://www.nykaa.com/',
};

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function mapProduct(p, marketplace) {
  const price = Number(p.current_price) || 0;
  const mrp = Number(p.mrp) || 0;
  const originalPrice = mrp > price ? mrp : null;
  const mkt = marketplace.toLowerCase();

  const reviews = Array.isArray(p.reviews)
    ? p.reviews.slice(0, 40).map((r) => ({
      author: r.author,
      rating: Number(r.rating) || 3,
      comment: r.comment || '',
      title: r.title || null,
      date: r.date || null,
      helpful_votes: Number(r.helpful_votes) || 0,
      verified_purchase: r.verified_purchase === true || r.verified_purchase === 'true',
    })).filter((r) => r.comment)
    : [];

  const images = p.images || {};
  const gallery = Array.isArray(images.gallery) ? images.gallery : [];
  const imageList = [images.main, ...gallery].filter(Boolean).slice(0, 5);

  const tags = Array.isArray(p.tags) ? p.tags : [];
  const desc = `Buy ${p.name} online at ${marketplace}${p.brand ? ` from ${p.brand}` : ''}. Rated ${p.rating}/5 by ${p.reviews_count} buyers.${tags.length ? ` Related tags: ${tags.join(', ')}.` : ''}`;

  const id = `${mkt}:${p.sku}`;
  const page = MARKETPLACE_PAGE[mkt];
  const productUrl = p.asin ? `${page}${p.asin}` : page || null;

  return {
    id,
    name: p.name,
    brand: p.brand || 'Unknown',
    category: p.category || 'General',
    subcategory: null,
    price,
    originalPrice,
    description: desc,
    image: images.main || imageList[0] || `https://placehold.co/600x600?text=${encodeURIComponent(p.name)}`,
    images: imageList.length ? JSON.stringify(imageList) : null,
    rating: Number(p.rating) || 0,
    reviews: Number(p.reviews_count) || reviews.length || 0,
    reviewSamples: reviews.length ? JSON.stringify(reviews) : null,
    features: tags.length ? JSON.stringify(tags) : null,
    pros: '[]',
    cons: '[]',
    affiliateLink: productUrl,
    inStock: p.in_stock !== false,
    stockLevel: Number(p.stock_quantity) || null,
    marketplace,
    source: 'marketplace',
    asin: p.asin || null,
    productUrl,
    currency: p.currency || 'INR',
  };
}

async function main() {
  console.log('Seeding database with marketplace catalog...');

  const existingCount = await prisma.product.count();
  if (existingCount > 0) {
    console.log(`Deleting ${existingCount} existing products...`);
    await prisma.priceHistory.deleteMany();
    await prisma.product.deleteMany();
  }

  const allProducts = [];
  const allHistory = [];

  for (const { file, label } of MARKETPLACES) {
    const dataPath = path.join(DATA_DIR, file);
    const raw = fs.readFileSync(dataPath, 'utf-8');
    const catalog = JSON.parse(raw);
    const items = catalog.products || [];

    for (const item of items) {
      const row = mapProduct(item, label);
      allProducts.push(row);

      const history = Array.isArray(item.price_history) ? item.price_history : [];
      for (const h of history) {
        const p = Number(h.price);
        if (Number.isFinite(p) && p > 0) {
          allHistory.push({ productId: row.id, price: p, date: new Date(h.date) });
        }
      }
    }

    console.log(`Loaded ${items.length} products from ${label}`);
  }

  console.log(`Total products: ${allProducts.length}, price-history rows: ${allHistory.length}`);

  const chunks = chunk(allProducts, 200);
  for (let i = 0; i < chunks.length; i++) {
    await prisma.product.createMany({ data: chunks[i], skipDuplicates: true });
    console.log(`Seeded products ${(i + 1) * 200}/${allProducts.length}`);
  }

  const histChunks = chunk(allHistory, 4000);
  for (let i = 0; i < histChunks.length; i++) {
    await prisma.priceHistory.createMany({ data: histChunks[i], skipDuplicates: true });
    if (i % 5 === 0) console.log(`Seeded price history ${(i + 1) * 4000}/${allHistory.length}`);
  }

  const catCounts = await prisma.product.groupBy({ by: ['category'], _count: { id: true } });
  console.log('Categories:', JSON.stringify(catCounts.map((c) => `${c.category}:${c._count.id}`)));
  console.log(`Seeded ${allProducts.length} products and ${allHistory.length} price points successfully!`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
