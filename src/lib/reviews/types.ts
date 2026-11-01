export interface ReviewUser {
  id?: string;
  name: string | null;
  image: string | null;
  email?: string | null;
}

export interface ReviewProduct {
  id: string;
  name: string;
  slug: string;
  primaryImage?: string | null;
}

export interface ReviewItem {
  id: string;
  userId: string;
  productId: string;
  rating: number;
  comment: string | null;
  verified: boolean;
  createdAt: Date | string;
  updatedAt?: Date | string;
  user: ReviewUser;
}

export interface ReviewRatingDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  distribution: ReviewRatingDistribution;
  percentages: ReviewRatingDistribution;
}

export interface UserReviewEligibility {
  isLoggedIn: boolean;
  canReview: boolean;
  isVerifiedBuyer: boolean;
  existingReview?: ReviewItem | null;
  reason?: string;
}

export interface AdminReviewItem extends ReviewItem {
  product: ReviewProduct;
}

export interface AdminReviewsKPIs {
  totalReviews: number;
  averageRating: number;
  fiveStarCount: number;
  verifiedCount: number;
}

