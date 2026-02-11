import {
  ServiceOrder,
  CreateServiceOrderInput,
} from '../aggregates/service-order.aggregate';
import {
  ServiceOrderCreatedEvent,
  ServiceOrderCompletedEvent,
  ServiceOrderCanceledEvent,
} from '../events/service-order.events';

describe('ServiceOrder Aggregate', () => {
  // Use local-time constructor to avoid UTC offset issues with getHours()
  const makeLocal = (y: number, m: number, d: number, h: number, min = 0) =>
    new Date(y, m - 1, d, h, min, 0);

  const validInput: CreateServiceOrderInput = {
    tenantId: '507f1f77bcf86cd799439011',
    serviceType: 'CREW_TRANSPORT',
    serviceDescription: 'Condução de tripulação ao navio MV Test',
    serviceDate: makeLocal(2025, 6, 16, 0),        // Monday
    startTime: makeLocal(2025, 6, 16, 8, 0),       // Monday 08:00
    vesselName: 'MV Atlantic Star',
    vesselType: 'FOREIGN',
    companyName: 'Maritime Corp Ltd',
    rateCents: 150000,
    createdById: '507f1f77bcf86cd799439012',
  };

  describe('create', () => {
    it('should create service order with valid input', () => {
      const result = ServiceOrder.create(validInput);

      expect(result.isSuccess).toBe(true);
      expect(result.value.status).toBe('DRAFT');
      expect(result.value.vesselName).toBe('MV Atlantic Star');
      expect(result.value.companyName).toBe('Maritime Corp Ltd');
      expect(result.value.rateCents).toBe(150000);
      expect(result.value.currency).toBe('BRL');
      expect(result.value.totalCents).toBe(150000);
    });

    it('should generate order number with OS- prefix', () => {
      const result = ServiceOrder.create(validInput);

      expect(result.value.orderNumber).toMatch(/^OS-\d{4}-\d{6}$/);
    });

    it('should emit ServiceOrderCreatedEvent', () => {
      const result = ServiceOrder.create(validInput);
      const order = result.value;

      expect(order.domainEvents).toHaveLength(1);
      expect(order.domainEvents[0]).toBeInstanceOf(ServiceOrderCreatedEvent);
    });

    it('should calculate total with additional charges', () => {
      const input = {
        ...validInput,
        rateCents: 100000,
        additionalChargesCents: 20000,
        discountCents: 5000,
      };

      const result = ServiceOrder.create(input);

      expect(result.value.totalCents).toBe(115000); // 100000 + 20000 - 5000
    });

    it('should clamp total to zero if discount exceeds rate', () => {
      const input = {
        ...validInput,
        rateCents: 10000,
        discountCents: 50000,
      };

      const result = ServiceOrder.create(input);

      expect(result.value.totalCents).toBe(0);
    });

    it('should fail with empty vessel name', () => {
      const input = { ...validInput, vesselName: '' };

      const result = ServiceOrder.create(input);

      expect(result.isFailure).toBe(true);
      expect(result.error.message).toContain('Vessel name');
    });

    it('should fail with empty company name', () => {
      const input = { ...validInput, companyName: '   ' };

      const result = ServiceOrder.create(input);

      expect(result.isFailure).toBe(true);
      expect(result.error.message).toContain('Company name');
    });

    it('should fail with empty service description', () => {
      const input = { ...validInput, serviceDescription: '' };

      const result = ServiceOrder.create(input);

      expect(result.isFailure).toBe(true);
      expect(result.error.message).toContain('Service description');
    });

    it('should fail with negative rate', () => {
      const input = { ...validInput, rateCents: -100 };

      const result = ServiceOrder.create(input);

      expect(result.isFailure).toBe(true);
      expect(result.error.message).toContain('negative');
    });

    it('should fail with invalid service type', () => {
      const input = { ...validInput, serviceType: 'INVALID_TYPE' };

      const result = ServiceOrder.create(input);

      expect(result.isFailure).toBe(true);
    });

    it('should fail with invalid vessel type', () => {
      const input = { ...validInput, vesselType: 'SUBMARINE' };

      const result = ServiceOrder.create(input);

      expect(result.isFailure).toBe(true);
    });

    it('should create with all optional fields', () => {
      const input: CreateServiceOrderInput = {
        ...validInput,
        endTime: makeLocal(2025, 6, 16, 12),
        anchorageArea: 'Area Alpha',
        companyTaxId: '12.345.678/0001-99',
        boatName: 'Lancha Rio I',
        captainName: 'Carlos Silva',
        employeeId: '507f1f77bcf86cd799439013',
        employeeName: 'José Santos',
        transportedPeople: [
          { name: 'John Doe', role: 'Engineer', document: 'AB123456' },
          { name: 'Jane Smith', role: 'Captain' },
        ],
        requestedBy: 'Port Authority',
        voucherNumber: 'V-2025-001',
        currency: 'USD',
        additionalChargesCents: 5000,
        discountCents: 2000,
        notes: 'Special instructions for this service',
      };

      const result = ServiceOrder.create(input);

      expect(result.isSuccess).toBe(true);
      expect(result.value.anchorageArea).toBe('Area Alpha');
      expect(result.value.boatName).toBe('Lancha Rio I');
      expect(result.value.captainName).toBe('Carlos Silva');
      expect(result.value.transportedPeople).toHaveLength(2);
      expect(result.value.voucherNumber).toBe('V-2025-001');
      expect(result.value.currency).toBe('USD');
      expect(result.value.notes).toBe('Special instructions for this service');
    });

    it('should default optional fields to null', () => {
      const result = ServiceOrder.create(validInput);
      const order = result.value;

      expect(order.endTime).toBeNull();
      expect(order.anchorageArea).toBeNull();
      expect(order.companyTaxId).toBeNull();
      expect(order.boatName).toBeNull();
      expect(order.captainName).toBeNull();
      expect(order.voucherNumber).toBeNull();
      expect(order.notes).toBeNull();
      expect(order.transportedPeople).toHaveLength(0);
    });
  });

  describe('auto-detect service period', () => {
    it('should detect DAY for weekday morning', () => {
      const input = {
        ...validInput,
        startTime: makeLocal(2025, 6, 16, 8),  // Monday 08h
        endTime: makeLocal(2025, 6, 16, 12),    // Monday 12h
      };

      const result = ServiceOrder.create(input);

      expect(result.value.servicePeriod).toBe('DAY');
      expect(result.value.servicePeriodLabel).toBe('Diurno');
    });

    it('should detect NIGHT for weekday evening', () => {
      const input = {
        ...validInput,
        startTime: makeLocal(2025, 6, 16, 20), // Monday 20h
        endTime: makeLocal(2025, 6, 17, 2),    // Tuesday 02h
      };

      const result = ServiceOrder.create(input);

      expect(result.value.servicePeriod).toBe('NIGHT');
    });

    it('should detect WEEKEND_DAY for Saturday daytime', () => {
      const input = {
        ...validInput,
        startTime: makeLocal(2025, 6, 14, 9),  // Saturday 09h
        endTime: makeLocal(2025, 6, 14, 15),   // Saturday 15h
      };

      const result = ServiceOrder.create(input);

      expect(result.value.servicePeriod).toBe('WEEKEND_DAY');
    });
  });

  describe('duration', () => {
    it('should return null when no endTime', () => {
      const result = ServiceOrder.create(validInput);

      expect(result.value.durationMinutes).toBeNull();
      expect(result.value.durationFormatted).toBeNull();
    });

    it('should calculate duration correctly', () => {
      const input = {
        ...validInput,
        startTime: makeLocal(2025, 6, 16, 8, 0),
        endTime: makeLocal(2025, 6, 16, 11, 30),
      };

      const result = ServiceOrder.create(input);

      expect(result.value.durationMinutes).toBe(210); // 3h30min
      expect(result.value.durationFormatted).toBe('3h30min');
    });

    it('should format short durations', () => {
      const input = {
        ...validInput,
        startTime: makeLocal(2025, 6, 16, 8, 0),
        endTime: makeLocal(2025, 6, 16, 8, 45),
      };

      const result = ServiceOrder.create(input);

      expect(result.value.durationMinutes).toBe(45);
      expect(result.value.durationFormatted).toBe('0h45min');
    });
  });

  describe('state machine', () => {
    const createDraftOrder = (): ServiceOrder => {
      return ServiceOrder.create(validInput).value;
    };

    describe('startService', () => {
      it('should transition DRAFT -> IN_PROGRESS', () => {
        const order = createDraftOrder();

        const result = order.startService('user1');

        expect(result.isSuccess).toBe(true);
        expect(order.status).toBe('IN_PROGRESS');
      });

      it('should fail when not DRAFT', () => {
        const order = createDraftOrder();
        order.startService('user1');

        const result = order.startService('user1');

        expect(result.isFailure).toBe(true);
        expect(result.error.message).toContain('draft');
      });
    });

    describe('completeService', () => {
      it('should transition DRAFT -> COMPLETED', () => {
        const order = createDraftOrder();
        const endTime = makeLocal(2025, 6, 16, 14);

        const result = order.completeService(endTime, 'user1');

        expect(result.isSuccess).toBe(true);
        expect(order.status).toBe('COMPLETED');
        expect(order.endTime).toEqual(endTime);
      });

      it('should transition IN_PROGRESS -> COMPLETED', () => {
        const order = createDraftOrder();
        order.startService('user1');
        const endTime = makeLocal(2025, 6, 16, 14);

        const result = order.completeService(endTime, 'user1');

        expect(result.isSuccess).toBe(true);
        expect(order.status).toBe('COMPLETED');
      });

      it('should emit ServiceOrderCompletedEvent', () => {
        const order = createDraftOrder();
        order.clearDomainEvents();
        const endTime = makeLocal(2025, 6, 16, 14);

        order.completeService(endTime, 'user1');

        expect(order.domainEvents).toHaveLength(1);
        expect(order.domainEvents[0]).toBeInstanceOf(ServiceOrderCompletedEvent);
      });

      it('should update service period on completion', () => {
        const order = createDraftOrder();
        const endTime = makeLocal(2025, 6, 16, 14);

        order.completeService(endTime, 'user1');

        expect(order.servicePeriod).toBeDefined();
        expect(order.durationMinutes).toBeGreaterThan(0);
      });

      it('should fail when endTime <= startTime', () => {
        const order = createDraftOrder();
        const endTime = makeLocal(2025, 6, 16, 7); // Before start

        const result = order.completeService(endTime, 'user1');

        expect(result.isFailure).toBe(true);
        expect(result.error.message).toContain('End time');
      });

      it('should fail when COMPLETED', () => {
        const order = createDraftOrder();
        order.completeService(makeLocal(2025, 6, 16, 14), 'user1');

        const result = order.completeService(makeLocal(2025, 6, 16, 16), 'user1');

        expect(result.isFailure).toBe(true);
      });

      it('should fail when CANCELED', () => {
        const order = createDraftOrder();
        order.cancel('user1');

        const result = order.completeService(makeLocal(2025, 6, 16, 14), 'user1');

        expect(result.isFailure).toBe(true);
      });
    });

    describe('markInvoiced', () => {
      it('should transition COMPLETED -> INVOICED', () => {
        const order = createDraftOrder();
        order.completeService(makeLocal(2025, 6, 16, 14), 'user1');

        const result = order.markInvoiced('user1');

        expect(result.isSuccess).toBe(true);
        expect(order.status).toBe('INVOICED');
      });

      it('should fail when not COMPLETED', () => {
        const order = createDraftOrder();

        const result = order.markInvoiced('user1');

        expect(result.isFailure).toBe(true);
        expect(result.error.message).toContain('completed');
      });
    });

    describe('cancel', () => {
      it('should cancel DRAFT order', () => {
        const order = createDraftOrder();

        const result = order.cancel('user1');

        expect(result.isSuccess).toBe(true);
        expect(order.status).toBe('CANCELED');
      });

      it('should cancel IN_PROGRESS order', () => {
        const order = createDraftOrder();
        order.startService('user1');

        const result = order.cancel('user1');

        expect(result.isSuccess).toBe(true);
        expect(order.status).toBe('CANCELED');
      });

      it('should cancel COMPLETED order', () => {
        const order = createDraftOrder();
        order.completeService(makeLocal(2025, 6, 16, 14), 'user1');

        const result = order.cancel('user1');

        expect(result.isSuccess).toBe(true);
        expect(order.status).toBe('CANCELED');
      });

      it('should emit ServiceOrderCanceledEvent', () => {
        const order = createDraftOrder();
        order.clearDomainEvents();

        order.cancel('user1');

        expect(order.domainEvents).toHaveLength(1);
        expect(order.domainEvents[0]).toBeInstanceOf(ServiceOrderCanceledEvent);
      });

      it('should fail when INVOICED', () => {
        const order = createDraftOrder();
        order.completeService(makeLocal(2025, 6, 16, 14), 'user1');
        order.markInvoiced('user1');

        const result = order.cancel('user1');

        expect(result.isFailure).toBe(true);
        expect(result.error.message).toContain('invoiced');
      });

      it('should fail when already CANCELED', () => {
        const order = createDraftOrder();
        order.cancel('user1');

        const result = order.cancel('user1');

        expect(result.isFailure).toBe(true);
        expect(result.error.message).toContain('already canceled');
      });
    });
  });

  describe('update', () => {
    it('should update mutable fields', () => {
      const order = ServiceOrder.create(validInput).value;

      const result = order.update({
        boatName: 'Lancha Rio II',
        captainName: 'Pedro Lima',
        notes: 'Updated notes',
        updatedById: 'user2',
      });

      expect(result.isSuccess).toBe(true);
      expect(order.boatName).toBe('Lancha Rio II');
      expect(order.captainName).toBe('Pedro Lima');
      expect(order.notes).toBe('Updated notes');
    });

    it('should recalculate total on additional charges update', () => {
      const order = ServiceOrder.create(validInput).value;

      order.update({
        additionalChargesCents: 30000,
        discountCents: 10000,
        updatedById: 'user2',
      });

      expect(order.totalCents).toBe(170000); // 150000 + 30000 - 10000
    });

    it('should update transported people', () => {
      const order = ServiceOrder.create(validInput).value;

      order.update({
        transportedPeople: [
          { name: 'Alice', role: 'Engineer' },
          { name: 'Bob', role: 'Captain' },
        ],
        updatedById: 'user2',
      });

      expect(order.transportedPeople).toHaveLength(2);
      expect(order.transportedPeople[0].name).toBe('Alice');
    });

    it('should fail when INVOICED', () => {
      const order = ServiceOrder.create(validInput).value;
      order.completeService(makeLocal(2025, 6, 16, 14), 'user1');
      order.markInvoiced('user1');

      const result = order.update({ notes: 'Too late', updatedById: 'user2' });

      expect(result.isFailure).toBe(true);
      expect(result.error.message).toContain('finalized');
    });

    it('should fail when CANCELED', () => {
      const order = ServiceOrder.create(validInput).value;
      order.cancel('user1');

      const result = order.update({ notes: 'Too late', updatedById: 'user2' });

      expect(result.isFailure).toBe(true);
      expect(result.error.message).toContain('finalized');
    });

    it('should fail when endTime <= startTime', () => {
      const order = ServiceOrder.create(validInput).value;

      const result = order.update({
        endTime: makeLocal(2025, 6, 16, 7),
        updatedById: 'user2',
      });

      expect(result.isFailure).toBe(true);
      expect(result.error.message).toContain('End time');
    });
  });

  describe('toDocumentData', () => {
    it('should return all data for PDF generation', () => {
      const input: CreateServiceOrderInput = {
        ...validInput,
        endTime: makeLocal(2025, 6, 16, 12),
        voucherNumber: 'V-001',
        additionalChargesCents: 5000,
        discountCents: 2000,
      };

      const order = ServiceOrder.create(input).value;
      const data = order.toDocumentData();

      expect(data.orderNumber).toBeDefined();
      expect(data.status).toBe('DRAFT');
      expect(data.serviceTypeLabel).toBe('Condução de Tripulação');
      expect(data.vesselTypeLabel).toBe('Estrangeiro');
      expect(data.totalCents).toBe(153000);
      expect(data.durationMinutes).toBe(240);
      expect(data.durationFormatted).toBe('4h00min');
      expect(data.voucherNumber).toBe('V-001');
    });
  });

  describe('toPersistence', () => {
    it('should return all fields for database', () => {
      const order = ServiceOrder.create(validInput).value;
      const data = order.toPersistence();

      expect(data.id).toBeDefined();
      expect(data.tenantId).toBe(validInput.tenantId);
      expect(data.orderNumber).toBeDefined();
      expect(data.status).toBe('DRAFT');
      expect(data.serviceType).toBe('CREW_TRANSPORT');
      expect(data.vesselType).toBe('FOREIGN');
      expect(data.rateCents).toBe(150000);
      expect(data.createdById).toBe(validInput.createdById);
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute from persistence data', () => {
      const original = ServiceOrder.create(validInput).value;
      const persisted = original.toPersistence();

      const reconstituted = ServiceOrder.reconstitute(
        persisted.id as string,
        {
          ...persisted,
          serviceDate: validInput.serviceDate,
          startTime: validInput.startTime,
          endTime: null,
          createdAt: new Date(),
        },
      );

      expect(reconstituted.id).toBe(persisted.id);
      expect(reconstituted.orderNumber).toBe(original.orderNumber);
      expect(reconstituted.status).toBe('DRAFT');
      expect(reconstituted.vesselName).toBe('MV Atlantic Star');
      expect(reconstituted.domainEvents).toHaveLength(0);
    });
  });

  describe('immutability', () => {
    it('should return frozen transportedPeople', () => {
      const input = {
        ...validInput,
        transportedPeople: [{ name: 'John', role: 'Engineer' }],
      };

      const order = ServiceOrder.create(input).value;
      const people = order.transportedPeople;

      expect(Object.isFrozen(people)).toBe(true);
    });
  });
});
