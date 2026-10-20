export interface NotificationPreferences {
  orderUpdates: boolean;
  dropAlerts: boolean;
  restockAlerts: boolean;
  promoOffers: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  orderUpdates: true,
  dropAlerts: true,
  restockAlerts: true,
  promoOffers: false,
};
