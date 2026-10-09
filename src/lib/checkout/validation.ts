import { z } from "zod";

export const checkoutSchema = z.object({
  customerName: z.string().trim().min(2, "Name is required").max(100),
  customerEmail: z.string().trim().email("Invalid email address"),
  customerPhone: z.string().trim().min(10, "Phone number is required").max(20),

  shippingStreet: z.string().trim().min(5, "Street address is required").max(200),
  shippingCity: z.string().trim().min(2, "City is required").max(100),
  shippingState: z.string().trim().max(100).optional(),
  shippingZip: z.string().trim().max(20).optional(),
  shippingCountry: z.string().trim().min(2, "Country is required").max(100),

  paymentMethod: z.enum(["COD", "ONLINE"], {
    required_error: "Please select a payment method",
  }),
  couponCode: z.string().trim().max(50).optional().nullable(),
  shippingMethodId: z.string().uuid().optional().nullable(),
});

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;
