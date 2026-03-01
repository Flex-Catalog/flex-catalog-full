import { AggregateRoot } from '../../../../@core/domain/aggregate-root.base';
import { Result, ValidationError } from '../../../../@core/domain/result';
import { ServicePeriod, ServicePeriodValue } from '../value-objects/service-period.vo';
import { VesselType, VesselTypeValue } from '../value-objects/vessel-type.vo';
import { ServiceType, ServiceTypeValue } from '../value-objects/service-type.vo';
import {
  ServiceOrderCreatedEvent,
  ServiceOrderCompletedEvent,
  ServiceOrderCanceledEvent,
} from '../events/service-order.events';

/**
 * Service Order Status
 */
export const SERVICE_ORDER_STATUSES = [
  'DRAFT',
  'IN_PROGRESS',
  'COMPLETED',
  'INVOICED',
  'CANCELED',
] as const;
export type ServiceOrderStatus = (typeof SERVICE_ORDER_STATUSES)[number];

/**
 * Transported Person
 */
export interface TransportedPerson {
  readonly name: string;
  readonly role?: string;
  readonly document?: string;
}

/**
 * Service Order Props
 */
interface ServiceOrderProps {
  readonly tenantId: string;
  readonly orderNumber: string;
  readonly voucherNumber: string | null;
  readonly status: ServiceOrderStatus;

  // Service details
  readonly serviceType: ServiceType;
  readonly serviceDescription: string;
  readonly servicePeriod: ServicePeriod;
  readonly serviceDate: Date;
  readonly startTime: Date;
  readonly endTime: Date | null;

  // Vessel info
  readonly vesselName: string;
  readonly vesselType: VesselType;
  readonly anchorageArea: string | null;

  // Company info
  readonly companyName: string;
  readonly companyTaxId: string | null;

  // Boat/launch info
  readonly boatName: string | null;
  readonly captainName: string | null;
  readonly employeeId: string | null;
  readonly employeeName: string | null;

  // People transported
  readonly transportedPeople: readonly TransportedPerson[];
  readonly requestedBy: string | null;

  // Financial
  readonly rateCents: number;
  readonly currency: string;
  readonly additionalChargesCents: number;
  readonly discountCents: number;
  readonly totalCents: number;
  readonly notes: string | null;

  // Tracking
  readonly createdById: string;
  readonly updatedById: string;
}

/**
 * Create Service Order Input
 */
export interface CreateServiceOrderInput {
  readonly tenantId: string;
  readonly serviceType: string;
  readonly serviceDescription: string;
  readonly serviceDate: Date;
  readonly startTime: Date;
  readonly endTime?: Date;
  readonly vesselName: string;
  readonly vesselType: string;
  readonly anchorageArea?: string;
  readonly companyName: string;
  readonly companyTaxId?: string;
  readonly boatName?: string;
  readonly captainName?: string;
  readonly employeeId?: string;
  readonly employeeName?: string;
  readonly transportedPeople?: TransportedPerson[];
  readonly requestedBy?: string;
  readonly voucherNumber?: string;
  readonly rateCents: number;
  readonly currency?: string;
  readonly additionalChargesCents?: number;
  readonly discountCents?: number;
  readonly notes?: string;
  readonly createdById: string;
}

/**
 * Update Service Order Input
 */
export interface UpdateServiceOrderInput {
  readonly endTime?: Date;
  readonly boatName?: string;
  readonly captainName?: string;
  readonly employeeName?: string;
  readonly transportedPeople?: TransportedPerson[];
  readonly additionalChargesCents?: number;
  readonly discountCents?: number;
  readonly notes?: string;
  readonly updatedById: string;
}

/**
 * Service Order Aggregate Root
 * - SRP: Business rules for service orders
 * - Immutability: State changes through methods
 * - Auto-calculates totals and period
 */
export class ServiceOrder extends AggregateRoot<string> {
  private _props: ServiceOrderProps;

  private constructor(id: string, props: ServiceOrderProps, createdAt?: Date) {
    super(id, createdAt);
    this._props = props;
  }

  // Getters
  get tenantId(): string { return this._props.tenantId; }
  get orderNumber(): string { return this._props.orderNumber; }
  get voucherNumber(): string | null { return this._props.voucherNumber; }
  get status(): ServiceOrderStatus { return this._props.status; }
  get serviceType(): ServiceTypeValue { return this._props.serviceType.value; }
  get serviceTypeLabel(): string { return this._props.serviceType.label(); }
  get serviceDescription(): string { return this._props.serviceDescription; }
  get servicePeriod(): ServicePeriodValue { return this._props.servicePeriod.value; }
  get servicePeriodLabel(): string { return this._props.servicePeriod.label(); }
  get serviceDate(): Date { return this._props.serviceDate; }
  get startTime(): Date { return this._props.startTime; }
  get endTime(): Date | null { return this._props.endTime; }
  get vesselName(): string { return this._props.vesselName; }
  get vesselType(): VesselTypeValue { return this._props.vesselType.value; }
  get vesselTypeLabel(): string { return this._props.vesselType.label(); }
  get anchorageArea(): string | null { return this._props.anchorageArea; }
  get companyName(): string { return this._props.companyName; }
  get companyTaxId(): string | null { return this._props.companyTaxId; }
  get boatName(): string | null { return this._props.boatName; }
  get captainName(): string | null { return this._props.captainName; }
  get employeeId(): string | null { return this._props.employeeId; }
  get employeeName(): string | null { return this._props.employeeName; }
  get transportedPeople(): readonly TransportedPerson[] { return this._props.transportedPeople; }
  get requestedBy(): string | null { return this._props.requestedBy; }
  get rateCents(): number { return this._props.rateCents; }
  get currency(): string { return this._props.currency; }
  get additionalChargesCents(): number { return this._props.additionalChargesCents; }
  get discountCents(): number { return this._props.discountCents; }
  get totalCents(): number { return this._props.totalCents; }
  get notes(): string | null { return this._props.notes; }
  get createdById(): string { return this._props.createdById; }
  get updatedById(): string { return this._props.updatedById; }

  /**
   * Pure function: Duration in minutes
   */
  get durationMinutes(): number | null {
    if (!this._props.endTime) return null;
    return Math.round(
      (this._props.endTime.getTime() - this._props.startTime.getTime()) / 60000,
    );
  }

  /**
   * Pure function: Formatted duration
   */
  get durationFormatted(): string | null {
    const minutes = this.durationMinutes;
    if (minutes === null) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins.toString().padStart(2, '0')}min`;
  }

  /**
   * Factory method
   */
  static create(input: CreateServiceOrderInput): Result<ServiceOrder, ValidationError> {
    // Validate service type
    const serviceTypeResult = ServiceType.create(input.serviceType);
    if (serviceTypeResult.isFailure) return Result.fail(serviceTypeResult.error);

    // Validate vessel type
    const vesselTypeResult = VesselType.create(input.vesselType);
    if (vesselTypeResult.isFailure) return Result.fail(vesselTypeResult.error);

    // Validate required fields
    if (!input.vesselName?.trim()) {
      return Result.fail(new ValidationError('Vessel name is required', 'vesselName'));
    }
    if (!input.companyName?.trim()) {
      return Result.fail(new ValidationError('Company name is required', 'companyName'));
    }
    if (!input.serviceDescription?.trim()) {
      return Result.fail(new ValidationError('Service description is required', 'serviceDescription'));
    }
    if (input.rateCents < 0) {
      return Result.fail(new ValidationError('Rate cannot be negative', 'rateCents'));
    }

    // Auto-detect period from times
    const period = input.endTime
      ? ServicePeriod.fromTimes(input.startTime, input.endTime)
      : ServicePeriod.fromTimes(input.startTime, input.startTime);

    // Calculate total
    const additional = input.additionalChargesCents ?? 0;
    const discount = input.discountCents ?? 0;
    const total = input.rateCents + additional - discount;

    // Generate order number
    const orderNumber = ServiceOrder.generateOrderNumber();
    const id = ServiceOrder.generateId();

    const order = new ServiceOrder(id, {
      tenantId: input.tenantId,
      orderNumber,
      voucherNumber: input.voucherNumber ?? null,
      status: 'DRAFT',
      serviceType: serviceTypeResult.value,
      serviceDescription: input.serviceDescription.trim(),
      servicePeriod: period,
      serviceDate: input.serviceDate,
      startTime: input.startTime,
      endTime: input.endTime ?? null,
      vesselName: input.vesselName.trim(),
      vesselType: vesselTypeResult.value,
      anchorageArea: input.anchorageArea ?? null,
      companyName: input.companyName.trim(),
      companyTaxId: input.companyTaxId ?? null,
      boatName: input.boatName ?? null,
      captainName: input.captainName ?? null,
      employeeId: input.employeeId ?? null,
      employeeName: input.employeeName ?? null,
      transportedPeople: Object.freeze([...(input.transportedPeople ?? [])]),
      requestedBy: input.requestedBy ?? null,
      rateCents: input.rateCents,
      currency: input.currency ?? 'BRL',
      additionalChargesCents: additional,
      discountCents: discount,
      totalCents: Math.max(0, total),
      notes: input.notes ?? null,
      createdById: input.createdById,
      updatedById: input.createdById,
    });

    order.addDomainEvent(
      new ServiceOrderCreatedEvent(
        order.id,
        order.tenantId,
        order.orderNumber,
        order.companyName,
        order.vesselName,
        order.createdById,
      ),
    );

    return Result.ok(order);
  }

  /**
   * Reconstitute from persistence
   */
  static reconstitute(id: string, props: any): ServiceOrder {
    return new ServiceOrder(
      id,
      {
        tenantId: props.tenantId,
        orderNumber: props.orderNumber,
        voucherNumber: props.voucherNumber,
        status: props.status,
        serviceType: ServiceType.create(props.serviceType).value,
        serviceDescription: props.serviceDescription,
        servicePeriod: ServicePeriod.create(props.servicePeriod).value,
        serviceDate: props.serviceDate,
        startTime: props.startTime,
        endTime: props.endTime,
        vesselName: props.vesselName,
        vesselType: VesselType.create(props.vesselType).value,
        anchorageArea: props.anchorageArea,
        companyName: props.companyName,
        companyTaxId: props.companyTaxId,
        boatName: props.boatName,
        captainName: props.captainName,
        employeeId: props.employeeId,
        employeeName: props.employeeName,
        transportedPeople: Object.freeze([...(props.transportedPeople ?? [])]),
        requestedBy: props.requestedBy,
        rateCents: props.rateCents,
        currency: props.currency,
        additionalChargesCents: props.additionalChargesCents ?? 0,
        discountCents: props.discountCents ?? 0,
        totalCents: props.totalCents,
        notes: props.notes,
        createdById: props.createdById,
        updatedById: props.updatedById,
      },
      props.createdAt,
    );
  }

  /**
   * Start service (DRAFT -> IN_PROGRESS)
   */
  startService(userId: string): Result<void, ValidationError> {
    if (this._props.status !== 'DRAFT') {
      return Result.fail(new ValidationError('Can only start a draft service order'));
    }
    this._props = { ...this._props, status: 'IN_PROGRESS', updatedById: userId };
    this.touch();
    return Result.void();
  }

  /**
   * Complete service (IN_PROGRESS -> COMPLETED)
   */
  completeService(endTime: Date, userId: string): Result<void, ValidationError> {
    if (this._props.status !== 'DRAFT' && this._props.status !== 'IN_PROGRESS') {
      return Result.fail(new ValidationError('Can only complete draft or in-progress orders'));
    }
    if (endTime <= this._props.startTime) {
      return Result.fail(new ValidationError('End time must be after start time'));
    }

    const period = ServicePeriod.fromTimes(this._props.startTime, endTime);

    this._props = {
      ...this._props,
      status: 'COMPLETED',
      endTime,
      servicePeriod: period,
      updatedById: userId,
    };
    this.touch();

    this.addDomainEvent(
      new ServiceOrderCompletedEvent(
        this.id,
        this.tenantId,
        this.orderNumber,
        this.totalCents,
        userId,
      ),
    );

    return Result.void();
  }

  /**
   * Mark as invoiced (COMPLETED -> INVOICED)
   */
  markInvoiced(userId: string): Result<void, ValidationError> {
    if (this._props.status !== 'COMPLETED') {
      return Result.fail(new ValidationError('Can only invoice completed orders'));
    }
    this._props = { ...this._props, status: 'INVOICED', updatedById: userId };
    this.touch();
    return Result.void();
  }

  /**
   * Cancel order
   */
  cancel(userId: string): Result<void, ValidationError> {
    if (this._props.status === 'INVOICED') {
      return Result.fail(new ValidationError('Cannot cancel invoiced orders'));
    }
    if (this._props.status === 'CANCELED') {
      return Result.fail(new ValidationError('Order is already canceled'));
    }

    this._props = { ...this._props, status: 'CANCELED', updatedById: userId };
    this.touch();

    this.addDomainEvent(
      new ServiceOrderCanceledEvent(this.id, this.tenantId, this.orderNumber, userId),
    );

    return Result.void();
  }

  /**
   * Update mutable fields
   */
  update(input: UpdateServiceOrderInput): Result<void, ValidationError> {
    if (this._props.status === 'INVOICED' || this._props.status === 'CANCELED') {
      return Result.fail(new ValidationError('Cannot update finalized orders'));
    }

    const newProps = { ...this._props };

    if (input.endTime !== undefined) {
      if (input.endTime <= this._props.startTime) {
        return Result.fail(new ValidationError('End time must be after start time'));
      }
      (newProps as any).endTime = input.endTime;
      (newProps as any).servicePeriod = ServicePeriod.fromTimes(this._props.startTime, input.endTime);
    }

    if (input.boatName !== undefined) (newProps as any).boatName = input.boatName;
    if (input.captainName !== undefined) (newProps as any).captainName = input.captainName;
    if (input.employeeName !== undefined) (newProps as any).employeeName = input.employeeName;
    if (input.notes !== undefined) (newProps as any).notes = input.notes;

    if (input.transportedPeople !== undefined) {
      (newProps as any).transportedPeople = Object.freeze([...input.transportedPeople]);
    }

    if (input.additionalChargesCents !== undefined) {
      (newProps as any).additionalChargesCents = input.additionalChargesCents;
    }
    if (input.discountCents !== undefined) {
      (newProps as any).discountCents = input.discountCents;
    }

    // Recalculate total
    const rate = newProps.rateCents;
    const additional = newProps.additionalChargesCents;
    const discount = newProps.discountCents;
    (newProps as any).totalCents = Math.max(0, rate + additional - discount);
    (newProps as any).updatedById = input.updatedById;

    this._props = newProps;
    this.touch();

    return Result.void();
  }

  /**
   * Data for PDF/document generation
   */
  toDocumentData(): Record<string, unknown> {
    return {
      id: this.id,
      orderNumber: this.orderNumber,
      voucherNumber: this.voucherNumber,
      status: this.status,
      serviceType: this.serviceType,
      serviceTypeLabel: this.serviceTypeLabel,
      serviceDescription: this.serviceDescription,
      servicePeriod: this.servicePeriod,
      servicePeriodLabel: this.servicePeriodLabel,
      serviceDate: this.serviceDate.toISOString(),
      startTime: this.startTime.toISOString(),
      endTime: this.endTime?.toISOString() ?? null,
      durationMinutes: this.durationMinutes,
      durationFormatted: this.durationFormatted,
      vesselName: this.vesselName,
      vesselType: this.vesselType,
      vesselTypeLabel: this.vesselTypeLabel,
      anchorageArea: this.anchorageArea,
      companyName: this.companyName,
      companyTaxId: this.companyTaxId,
      boatName: this.boatName,
      captainName: this.captainName,
      employeeName: this.employeeName,
      transportedPeople: [...this.transportedPeople],
      requestedBy: this.requestedBy,
      rateCents: this.rateCents,
      currency: this.currency,
      additionalChargesCents: this.additionalChargesCents,
      discountCents: this.discountCents,
      totalCents: this.totalCents,
      totalFormatted: (this.totalCents / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: this.currency,
      }),
      notes: this.notes,
      createdAt: this.createdAt.toISOString(),
    };
  }

  toPersistence(): Record<string, unknown> {
    return {
      id: this.id,
      tenantId: this.tenantId,
      orderNumber: this.orderNumber,
      voucherNumber: this.voucherNumber,
      status: this.status,
      serviceType: this.serviceType,
      serviceDescription: this.serviceDescription,
      servicePeriod: this.servicePeriod,
      serviceDate: this.serviceDate,
      startTime: this.startTime,
      endTime: this.endTime,
      vesselName: this.vesselName,
      vesselType: this.vesselType,
      anchorageArea: this.anchorageArea,
      companyName: this.companyName,
      companyTaxId: this.companyTaxId,
      boatName: this.boatName,
      captainName: this.captainName,
      employeeId: this.employeeId,
      employeeName: this.employeeName,
      transportedPeople: [...this.transportedPeople],
      requestedBy: this.requestedBy,
      rateCents: this.rateCents,
      currency: this.currency,
      additionalChargesCents: this.additionalChargesCents,
      discountCents: this.discountCents,
      totalCents: this.totalCents,
      notes: this.notes,
      createdById: this.createdById,
      updatedById: this.updatedById,
    };
  }

  private static generateOrderNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const seq = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `OS-${year}-${seq}`;
  }

  private static generateId(): string {
    const timestamp = Math.floor(Date.now() / 1000).toString(16);
    const random = Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join('');
    return (timestamp + random).substring(0, 24);
  }
}
