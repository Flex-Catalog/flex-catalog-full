import { Product, CreateProductInput } from '../aggregates/product/product.aggregate';
import { ProductCreatedEvent, ProductUpdatedEvent } from '../events/product.events';

describe('Product Aggregate', () => {
  const validInput: CreateProductInput = {
    tenantId: '507f1f77bcf86cd799439011',
    name: 'Test Product',
    sku: 'TEST-001',
    priceCents: 1000,
    currency: 'BRL',
    createdById: '507f1f77bcf86cd799439012',
  };

  describe('create', () => {
    it('should create product with valid input', () => {
      const result = Product.create(validInput);

      expect(result.isSuccess).toBe(true);
      expect(result.value.name).toBe('Test Product');
      expect(result.value.sku).toBe('TEST-001');
      expect(result.value.priceCents).toBe(1000);
      expect(result.value.currency).toBe('BRL');
      expect(result.value.isActive).toBe(true);
    });

    it('should fail with empty name', () => {
      const input = { ...validInput, name: '' };

      const result = Product.create(input);

      expect(result.isFailure).toBe(true);
      expect(result.error.message).toContain('name');
    });

    it('should fail with name too long', () => {
      const input = { ...validInput, name: 'a'.repeat(256) };

      const result = Product.create(input);

      expect(result.isFailure).toBe(true);
      expect(result.error.message).toContain('255');
    });

    it('should fail with invalid SKU format', () => {
      const input = { ...validInput, sku: '!invalid!' };

      const result = Product.create(input);

      expect(result.isFailure).toBe(true);
      expect(result.error.message).toContain('SKU');
    });

    it('should fail with negative price', () => {
      const input = { ...validInput, priceCents: -100 };

      const result = Product.create(input);

      expect(result.isFailure).toBe(true);
      expect(result.error.message).toContain('negative');
    });

    it('should emit ProductCreatedEvent', () => {
      const result = Product.create(validInput);
      const product = result.value;

      expect(product.domainEvents).toHaveLength(1);
      expect(product.domainEvents[0]).toBeInstanceOf(ProductCreatedEvent);
    });

    it('should create product without optional fields', () => {
      const input: CreateProductInput = {
        tenantId: '507f1f77bcf86cd799439011',
        name: 'Simple Product',
        priceCents: 500,
        createdById: '507f1f77bcf86cd799439012',
      };

      const result = Product.create(input);

      expect(result.isSuccess).toBe(true);
      expect(result.value.sku).toBeNull();
      expect(result.value.categoryId).toBeNull();
    });

    it('should use default currency when not provided', () => {
      const input: CreateProductInput = {
        tenantId: '507f1f77bcf86cd799439011',
        name: 'Product',
        priceCents: 100,
        createdById: '507f1f77bcf86cd799439012',
      };

      const result = Product.create(input);

      expect(result.value.currency).toBe('BRL');
    });
  });

  describe('update', () => {
    it('should update name', () => {
      const product = Product.create(validInput).value;

      const result = product.update({
        name: 'Updated Name',
        updatedById: 'user123',
      });

      expect(result.isSuccess).toBe(true);
      expect(product.name).toBe('Updated Name');
    });

    it('should emit ProductUpdatedEvent with changes', () => {
      const product = Product.create(validInput).value;
      product.clearDomainEvents();

      product.update({
        name: 'New Name',
        priceCents: 2000,
        updatedById: 'user123',
      });

      expect(product.domainEvents).toHaveLength(1);
      const event = product.domainEvents[0] as ProductUpdatedEvent;
      expect(event.changes.name).toEqual({ old: 'Test Product', new: 'New Name' });
      expect(event.changes.price).toBeDefined();
    });

    it('should not emit event when no changes', () => {
      const product = Product.create(validInput).value;
      product.clearDomainEvents();

      product.update({
        name: 'Test Product', // Same name
        updatedById: 'user123',
      });

      expect(product.domainEvents).toHaveLength(0);
    });

    it('should fail with empty name', () => {
      const product = Product.create(validInput).value;

      const result = product.update({
        name: '',
        updatedById: 'user123',
      });

      expect(result.isFailure).toBe(true);
    });
  });

  describe('activate/deactivate', () => {
    it('should deactivate active product', () => {
      const product = Product.create(validInput).value;

      const result = product.deactivate('user123');

      expect(result.isSuccess).toBe(true);
      expect(product.isActive).toBe(false);
    });

    it('should fail to deactivate already inactive product', () => {
      const product = Product.create(validInput).value;
      product.deactivate('user123');

      const result = product.deactivate('user123');

      expect(result.isFailure).toBe(true);
      expect(result.error.message).toContain('already inactive');
    });

    it('should activate inactive product', () => {
      const product = Product.create(validInput).value;
      product.deactivate('user123');
      product.clearDomainEvents();

      const result = product.activate('user123');

      expect(result.isSuccess).toBe(true);
      expect(product.isActive).toBe(true);
    });

    it('should fail to activate already active product', () => {
      const product = Product.create(validInput).value;

      const result = product.activate('user123');

      expect(result.isFailure).toBe(true);
      expect(result.error.message).toContain('already active');
    });
  });

  describe('updateImages', () => {
    it('should update images array', () => {
      const product = Product.create(validInput).value;
      const images = ['img1.jpg', 'img2.jpg'];

      product.updateImages(images, 'user123');

      expect(product.images).toEqual(images);
    });

    it('should emit event on image update', () => {
      const product = Product.create(validInput).value;
      product.clearDomainEvents();

      product.updateImages(['new.jpg'], 'user123');

      expect(product.domainEvents).toHaveLength(1);
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute from persistence data', () => {
      const persistenceData = {
        tenantId: '507f1f77bcf86cd799439011',
        name: 'Stored Product',
        sku: 'SKU-001',
        priceCents: 5000,
        currency: 'USD',
        categoryId: null,
        attributes: { color: 'red' },
        fiscal: { ncm: '12345678' },
        images: ['img.jpg'],
        isActive: false,
        createdById: 'user1',
        updatedById: 'user2',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      const product = Product.reconstitute('product-id', persistenceData);

      expect(product.id).toBe('product-id');
      expect(product.name).toBe('Stored Product');
      expect(product.sku).toBe('SKU-001');
      expect(product.priceCents).toBe(5000);
      expect(product.currency).toBe('USD');
      expect(product.isActive).toBe(false);
      expect(product.attributes).toEqual({ color: 'red' });
      expect(product.domainEvents).toHaveLength(0);
    });
  });

  describe('immutability', () => {
    it('should preserve original values after update', () => {
      const product = Product.create(validInput).value;
      const originalName = product.name;

      product.update({ name: 'New Name', updatedById: 'user123' });

      // Original name is gone - update creates new state
      expect(product.name).toBe('New Name');
      expect(originalName).toBe('Test Product');
    });

    it('should return immutable attributes', () => {
      const product = Product.create({
        ...validInput,
        attributes: { color: 'red' },
      }).value;

      // Returned attributes object is frozen
      const attrs = product.attributes;
      expect(Object.isFrozen(attrs)).toBe(true);
    });
  });

  describe('equality', () => {
    it('should be equal to itself', () => {
      const product = Product.create(validInput).value;

      expect(product.equals(product)).toBe(true);
    });

    it('should not be equal to different product', () => {
      const product1 = Product.create(validInput).value;
      const product2 = Product.create(validInput).value;

      expect(product1.equals(product2)).toBe(false); // Different IDs
    });
  });
});
