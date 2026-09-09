/* Traqi — what kind of business this is.

   Chosen once, right after the plan and before onboarding. It decides the
   product categories the workspace works with, so a fabric seller never
   scrolls past phone accessories to find lace. Every list is editable in
   place: the category picker lets an owner add their own at any time. */

export type IndustryKey =
  | 'fashion' | 'fabrics' | 'beauty' | 'fragrance'
  | 'electronics' | 'wholesale' | 'gadgets' | 'kitchen';

export type Industry = {
  key: IndustryKey;
  name: string;
  short: string;          // used where space is tight
  tagline: string;
  categories: string[];
};

export const INDUSTRIES: Industry[] = [
  {
    key: 'fashion',
    name: 'Fashion, Wears & Accessories',
    short: 'Fashion',
    tagline: 'Clothing, footwear, bags and everything worn',
    categories: [
      'Suits', 'Blazers & Jackets', 'Two-Piece Sets', 'Jumpsuits', 'Gowns / Dresses', 'Skirts',
      'Blouses', 'Tops / Round-Neck / V-Neck / Polos', 'Corporate Shirts', 'Vintage Shirts',
      'Denim Trousers / Jeans', 'Denim Tops & Jackets', 'Corporate Pants / Cargo Trousers',
      'Chinos', 'Joggers', 'Hoodies', 'Sweatshirts', 'Cardigans', 'Waistcoats', 'Scarves',
      'Underwear', 'Pyjamas / Nightwear', 'Sneakers & Boots',
      'Men’s Shoes — Loafers, Derby, Oxford, etc.', 'Slides', 'Women’s Heels',
      'Women’s Shoes', 'Handbags', 'Wristwatches', 'Sunglasses / Sunshades', 'Ties',
      'Cufflinks', 'Native / Traditional Wear', 'Agbada', 'Senator Wear', 'Kaftans', 'Belts',
      'Hats & Caps', 'Socks', 'Jewellery & Fashion Accessories'
    ]
  },
  {
    key: 'fabrics',
    name: 'Fabrics',
    short: 'Fabrics',
    tagline: 'Textiles, lace, prints and everything by the yard',
    categories: [
      'Ankara & African Prints', 'Adire & Indigenous Fabrics', 'Aso-Oke & Traditional Fabrics',
      'Crepe', 'Cotton', 'Linen', 'Silk', 'Lace', 'George Lace', 'Irish Lace', 'Cord Lace',
      'Duchess Satin', 'Mikado', 'Organza & Organdy', 'Chiffon', 'Mesh, Net & Tulle',
      'Jacquard & Damask', 'Brocade', 'Velvet', 'Lycra & Stretch Fabrics',
      'Wool, Cashmere & Suiting', 'Atiku & Senator Fabrics', '7 Star Fabrics',
      'Embroidered & Embellished Fabrics', 'Bridal & Aso-Ebi Fabrics', 'Sample Fabrics & Swatches',
      'French Lace', 'Swiss Lace', 'Polyester Fabrics', 'Satin', 'Taffeta', 'Poplin',
      'Linen Blend', 'Net Lace', 'Sequin Fabrics', 'Beaded Fabrics', 'Fabric Linings',
      'Interfacing', 'Sewing Threads', 'Fabric Trimmings & Ribbons'
    ]
  },
  {
    key: 'beauty',
    name: 'Beauty & Personal Care',
    short: 'Beauty',
    tagline: 'Skincare, haircare, cosmetics and grooming',
    categories: [
      'Skincare Products', 'Face Creams & Moisturisers', 'Facial Cleansers', 'Face Toners',
      'Face Serums', 'Sunscreen', 'Face Masks', 'Body Lotions', 'Body Oils', 'Body Scrubs',
      'Soaps & Body Wash', 'Deodorants', 'Hair Creams', 'Hair Oils', 'Hair Treatments',
      'Shampoos', 'Conditioners', 'Relaxers', 'Edge Control', 'Hair Colour', 'Wigs',
      'Human Hair', 'Hair Extensions / Weavons', 'Braiding Hair / Attachment',
      'Closures & Frontals', 'Makeup / Cosmetics', 'Foundation', 'Concealers', 'Powder',
      'Lipsticks & Lip Gloss', 'Eyelashes', 'Eyeliners & Mascara', 'Makeup Brushes & Sponges',
      'Nail Polish & Nail Products', 'Nail Extensions & Acrylics', 'Hair Clippers & Trimmers',
      'Hair Dryers', 'Hair Straighteners & Curling Irons', 'Shaving & Grooming Products',
      'Personal Hygiene Products'
    ]
  },
  {
    key: 'fragrance',
    name: 'Fragrances',
    short: 'Fragrances',
    tagline: 'Perfumes, oils, oud and home scents',
    categories: [
      'Men’s Perfumes', 'Women’s Perfumes', 'Unisex Perfumes',
      'Designer / Luxury Perfumes', 'Arabic / Middle Eastern Perfumes', 'Niche Perfumes',
      'Perfume Oils', 'Attars', 'Body Sprays', 'Body Mists', 'Deodorant Sprays',
      'Roll-On Perfumes', 'Perfume Gift Sets', 'Perfume Testers', 'Pocket / Travel Perfumes',
      'Oud Perfumes', 'Oud Oils', 'Bakhoor', 'Incense', 'Scented Candles', 'Reed Diffusers',
      'Room Sprays', 'Air Fresheners', 'Car Air Fresheners', 'Fragrance Oils', 'Perfume Bottles',
      'Perfume Atomizers', 'Fragrance Gift Boxes', 'Home Fragrance Sets', 'Fabric / Linen Sprays'
    ]
  },
  {
    key: 'electronics',
    name: 'Electronics & Electricals',
    short: 'Electronics',
    tagline: 'Appliances, power, lighting and installation',
    categories: [
      'Home Appliances', 'TV & Home Entertainment', 'Audio & Sound', 'Power & Backup',
      'Solar Appliances', 'Lighting', 'Electrical Installation', 'Switches, Sockets & Wiring',
      'Fans & Air Conditioning', 'Kitchen Appliances', 'Security & Access Control',
      'Smart Home & Automation', 'Water Pumps & Heaters', 'Office & Commercial Electronics',
      'Electrical Tools & Test Equipment', 'Refrigerators', 'Freezers', 'Washing Machines',
      'Televisions / Smart TVs', 'Home Theatre Systems', 'Speakers', 'Amplifiers', 'Microphones',
      'Inverters', 'Inverter Batteries', 'Generators', 'UPS', 'Voltage Stabilizers / Regulators',
      'Solar Panels', 'Solar Inverters', 'Solar Batteries', 'LED Bulbs & Lighting Fixtures',
      'Ceiling Fans', 'Air Conditioners', 'CCTV Systems', 'Electric Fences', 'Water Pumps',
      'Water Heaters', 'Electrical Cables & Wires', 'Circuit Breakers / Distribution Boards'
    ]
  },
  {
    key: 'wholesale',
    name: 'Wholesale & Distribution',
    short: 'Wholesale',
    tagline: 'Bulk supply across every line of goods',
    categories: [
      'FMCG & General Consumer Goods', 'Food & Beverage Wholesale', 'Drinks & Beverages',
      'Packaged Foods', 'Grains & Staple Foods', 'Frozen Foods', 'Snacks & Biscuits',
      'Bottled Water', 'Fashion Wholesale', 'Clothing Wholesale', 'Shoes Wholesale',
      'Bags Wholesale', 'Fashion Accessories Wholesale', "Children's Clothing Wholesale",
      'Fabric Wholesale', 'Beauty & Cosmetics Wholesale', 'Skincare Wholesale',
      'Hair Products Wholesale', 'Wigs & Hair Extensions Wholesale',
      'Perfume & Fragrance Wholesale', 'Electronics Wholesale', 'Gadgets Wholesale',
      'Phones & Tablets Wholesale', 'Phone Accessories Wholesale',
      'Electrical Materials Wholesale', 'Solar Products Wholesale', 'Household Goods Wholesale',
      'Kitchenware Wholesale', 'Plastic Products Wholesale', 'Cleaning Products Wholesale',
      'Office & Stationery Supplies Wholesale', 'Packaging Materials Wholesale',
      'Building Materials Wholesale', 'Plumbing Materials Wholesale', 'Hardware Wholesale',
      'Agricultural Products Wholesale', 'Animal Feed Wholesale', 'Agricultural Inputs Wholesale',
      'Importers & General Merchandise', 'Bulk Suppliers & Distributors'
    ]
  },
  {
    key: 'gadgets',
    name: 'Gadgets & Devices',
    short: 'Gadgets',
    tagline: 'Phones, computers, audio and accessories',
    categories: [
      'Phones & Tablets', 'Laptops & Computers', 'Internet & Networking', 'Phone Accessories',
      'Computer Accessories', 'Audio & Speakers', 'Cameras & Video', 'CCTV & Security',
      'Lighting', 'Power & Charging', 'Smart Home & IoT', 'Gaming', 'Storage & Memory',
      'Wearables', 'Car & Auto Gadgets', 'Office & Productivity',
      'Cables, Adapters & Connectors', 'Smartphones', 'Feature Phones', 'iPads & Tablets',
      'Smartwatches', 'Earbuds & Headphones', 'Bluetooth Speakers', 'Power Banks',
      'Chargers & Charging Adapters', 'USB Cables & Phone Cables',
      'Phone Cases & Screen Protectors', 'Laptop Bags & Stands', 'Keyboards & Mice', 'Webcams',
      'External Hard Drives & SSDs', 'USB Flash Drives & Memory Cards',
      'Wi-Fi Routers / 4G / 5G Routers', 'MiFi & Modems', 'Game Consoles & Controllers',
      'Gaming Accessories', 'Digital Cameras', 'Action Cameras & Video Accessories',
      'Dash Cameras & Car Electronics', 'Smart Home Devices'
    ]
  },
  {
    key: 'kitchen',
    name: 'Kitchen Utensils & Household Appliances',
    short: 'Kitchen & Home',
    tagline: 'Cookware, small appliances and home essentials',
    categories: [
      'Cooking Pots', 'Frying Pans', 'Non-Stick Cookware', 'Pressure Cookers', 'Kitchen Utensils',
      'Knives & Knife Sets', 'Chopping Boards', 'Graters & Peelers', 'Sieves & Colanders',
      'Measuring Cups & Spoons', 'Baking Utensils', 'Blenders', 'Food Processors', 'Air Fryers',
      'Microwave Ovens', 'Electric Ovens', 'Toasters', 'Sandwich Makers', 'Electric Kettles',
      'Rice Cookers', 'Electric Cookers & Hot Plates', 'Gas Cookers & Burners', 'Plates & Bowls',
      'Cups & Mugs', 'Cutlery & Dining Sets', 'Serving Trays & Bowls', 'Food Storage Containers',
      'Water Bottles & Flasks', 'Coolers & Ice Boxes', 'Lunch Boxes', 'Buckets & Basins',
      'Brooms & Brushes', 'Mops & Cleaning Tools', 'Dustbins', 'Clothes Hangers',
      'Laundry Baskets', 'Storage Boxes & Organizers', 'Curtains & Window Blinds',
      'Rugs & Carpets', 'Household Décor & Home Essentials'
    ]
  }
];

export const INDUSTRY_KEYS = INDUSTRIES.map(i => i.key);
export const isIndustryKey = (v: unknown): v is IndustryKey =>
  INDUSTRY_KEYS.includes(v as IndustryKey);
export const getIndustry = (key: string | undefined): Industry | null =>
  INDUSTRIES.find(i => i.key === key) || null;

/** The categories a workspace works with: its industry's list plus its own. */
export function categoriesFor(industry: string | undefined, extra: string[] = []): string[] {
  const base = getIndustry(industry)?.categories || [];
  const seen = new Set(base.map(c => c.toLowerCase()));
  const own = extra.filter(c => c && !seen.has(c.toLowerCase()));
  /* An owner's own categories sit at the top — they were added for a reason. */
  return [...own, ...base];
}
