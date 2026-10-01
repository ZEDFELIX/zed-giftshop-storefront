# ZED Gift Shop — Storefront

Static storefront for **ZED Gift Shop**, Nairobi. The layout and shopping
experience are modelled on [riogiftshop.com](https://riogiftshop.com/);
ZED keeps its own logo, name, palette and product data.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure: top bar, header, mega-menu nav, category band, featured grid, value props, catalogue, footer, cart and wishlist panels |
| `zed.css` | Design system — green palette, mega menus, WooCommerce-style product cards, sidebar facets, pagination, responsive layout |
| `zed.js` | Product data, SVG product illustrations, navigation tree, filtering, sorting, pagination, cart and wishlist state |
| `.nojekyll` | Serves the folder as static files on GitHub Pages |

No build step, no dependencies. Open `index.html` or serve the folder.

## Features

- Two-line announcement bar, sticky header with `Products search`, phone,
  My Account and a live `KShs` cart total
- Twelve-category navigation with mega menus, each showing four headed
  columns plus a featured product with Sale badge and Add to cart
- Homepage order: Product Categories → Featured Categories → value props →
  full catalogue
- Catalogue with collapsible sidebar facets (category, KShs price bands,
  occasion, recipient, availability), six sort orders, result range and
  pagination
- Product cards with Sale badge, hover quick actions, ratings and the
  `KShs` price block showing original and current price
- Cart drawer with quantity steppers and free delivery over KShs 3,000;
  wishlist drawer; quick view with specifications
- Cart and wishlist persist to `localStorage`
- Mobile drawer, bottom tab bar, and reduced-motion support

## Local preview

```bash
python -m http.server 8899
# then open http://localhost:8899/index.html
```

## Licence

© 2026 ZED Gift Shop. All rights reserved.
