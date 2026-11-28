/**
 * Meta Pixel & Conversions API (CAPI) v21.0 Type Definitions
 * Following Meta's latest Event Match Quality (EMQ) & Deduplication Standards.
 */

export type MetaPixelEventName =
  "PageView" | "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase" | "Search" | "Contact";

export interface MetaContentItem {
  id: string;
  quantity?: number;
  item_price?: number;
  title?: string;
  category?: string;
  brand?: string;
}

export interface MetaCustomData {
  currency: "BDT" | string;
  value: number;
  content_name?: string;
  content_type?: "product" | "product_group";
  content_ids?: string[];
  contents?: MetaContentItem[];
  num_items?: number;
  content_category?: string;
  search_string?: string;
  order_id?: string;
  status?: string;
  [key: string]: unknown;
}

export interface MetaUserData {
  /** Hashed SHA-256 lowercase email */
  em?: string[];
  /** Hashed SHA-256 normalized phone in E.164 (e.g. 8801XXXXXXXXX) */
  ph?: string[];
  /** Hashed SHA-256 lowercase first name */
  fn?: string[];
  /** Hashed SHA-256 lowercase last name */
  ln?: string[];
  /** Hashed SHA-256 lowercase city without spaces/punctuation (e.g. dhaka) */
  ct?: string[];
  /** Hashed SHA-256 lowercase 2-letter country code (e.g. bd) */
  country?: string[];
  /** Hashed SHA-256 unique internal customer/user id */
  external_id?: string[];
  /** Raw unhashed client IPv4 or IPv6 */
  client_ip_address?: string;
  /** Raw unhashed user agent */
  client_user_agent?: string;
  /** Raw Facebook browser cookie (_fbp) */
  fbp?: string;
  /** Raw Facebook click ID cookie (_fbc) */
  fbc?: string;
}

export interface MetaCapiEvent {
  event_name: MetaPixelEventName | string;
  /** Unix timestamp in seconds */
  event_time: number;
  /** Must match the client-side fbq eventID for deduplication */
  event_id: string;
  event_source_url: string;
  action_source: "website" | "app" | "physical_store" | "system_generated" | "other";
  user_data: MetaUserData;
  custom_data?: MetaCustomData;
  opt_out?: boolean;
  data_processing_options?: string[];
  data_processing_options_country?: number;
  data_processing_options_state?: number;
}

export interface MetaCapiPayload {
  data: MetaCapiEvent[];
  test_event_code?: string;
}

export interface MetaCapiResponse {
  events_received?: number;
  messages?: string[];
  fbtrace_id?: string;
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id: string;
  };
}
