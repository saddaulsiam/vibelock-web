export interface CheckoutCustomerInfo {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

export interface CheckoutShippingInfo {
  shippingStreet: string;
  shippingCity: string;
  shippingState?: string;
  shippingZip?: string;
  shippingCountry: string;
}

export interface CheckoutInput extends CheckoutCustomerInfo, CheckoutShippingInfo {
  paymentMethod: "COD" | "ONLINE";
  couponCode?: string | null;
}
