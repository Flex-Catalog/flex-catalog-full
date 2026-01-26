db = db.getSiblingDB('product_catalog');

db.createUser({
  user: 'catalog_user',
  pwd: 'catalog_pass',
  roles: [{ role: 'readWrite', db: 'product_catalog' }],
});

print('MongoDB initialized for Product Catalog');
