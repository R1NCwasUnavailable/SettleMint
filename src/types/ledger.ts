export type DietTag = 'veg' | 'egg' | 'non_veg';
export type ItemCategory = 'veg' | 'egg' | 'non_veg' | 'alcohol' | 'common';

export interface MemberProfile {
  id: string;
  trip_id: string;
  name: string;
  upi_id: string;
  diet_tag: DietTag;
  drinks_alcohol: boolean;
}

export interface ParsedLineItem {
  id: string;
  name: string;
  amount: number;
  category: ItemCategory;
  excludedMemberIds: string[];
}

export interface AIExtractionResult {
  merchantOrTitle: string;
  paidByMemberName: string | null;
  items: {
    name: string;
    amount: number;
    category: ItemCategory;
    excludedMemberNames: string[];
  }[];
  taxAndServiceCharge: number;
  confidenceNote: string;
}

export interface ExpenseRecord {
  id: string;
  title: string;
  paid_by_member_id: string;
  total_amount: number;
  tax_and_tip: number;
  created_at: string;
  splits: Record<string, number>;
}

export interface SettlementTransfer {
  fromMember: MemberProfile;
  toMember: MemberProfile;
  amount: number;
  upiDeepLink: string;
}
