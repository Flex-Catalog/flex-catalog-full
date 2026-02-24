export interface ProductAttributes {
    [key: string]: string | number | boolean | null;
}
export interface ProductFiscal {
    ncm?: string;
    cfop?: string;
    hsCode?: string;
    taxRate?: number;
}
export interface Product {
    id: string;
    tenantId: string;
    name: string;
    sku?: string;
    priceCents: number;
    currency: string;
    categoryId?: string;
    attributes: ProductAttributes;
    fiscal?: ProductFiscal;
    images: string[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateProductInput {
    name: string;
    sku?: string;
    priceCents: number;
    currency?: string;
    categoryId?: string;
    attributes?: ProductAttributes;
    fiscal?: ProductFiscal;
}
export interface UpdateProductInput extends Partial<CreateProductInput> {
    isActive?: boolean;
}
export interface Category {
    id: string;
    tenantId: string;
    name: string;
    parentId?: string;
    attributeTemplate?: AttributeTemplate[];
    createdAt: Date;
    updatedAt: Date;
}
export interface AttributeTemplate {
    key: string;
    label: string;
    type: 'string' | 'number' | 'boolean';
    required?: boolean;
    options?: string[];
}
