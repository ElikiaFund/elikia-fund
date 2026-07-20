import { apiService } from '@/services/apiService';

export type GroupFrequency = 'weekly' | 'monthly';

export type GroupMember = {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  pivot: { joined_at: string };
};

export type Contribution = {
  id: number;
  group_id: number;
  user_id: number;
  amount: string;
  fee_amount: string;
  net_amount: string;
  cycle_period: string;
  paid_at: string;
  status: string;
  user?: GroupMember;
};

export type PaymentMethod = 'mtn_momo' | 'airtel_money';

export type Group = {
  id: number;
  uuid: string;
  name: string;
  contribution_amount: string;
  frequency: GroupFrequency;
  max_members: number | null;
  invite_code: string;
  owner_id: number;
  created_at: string;
  updated_at: string;
  members_count?: number;
  current_cycle_period?: string;
  has_paid_current_cycle?: boolean;
  owner?: GroupMember;
  members?: GroupMember[];
  contributions?: Contribution[];
};

/** Percentage withheld from every contribution as a tontine management fee — kept in sync with GroupController::MANAGEMENT_FEE_RATE. */
export const TONTINE_MANAGEMENT_FEE_RATE = 0.03;

export type GroupReport = {
  group_id: number;
  group_name: string;
  cycle_period: string;
  members_count: number;
  paid_count: number;
  late_count: number;
  total_collected: number;
  total_fees: number;
  total_net: number;
  contributions: {
    user_id: number;
    user_name: string;
    amount: number;
    fee_amount: number;
    net_amount: number;
    paid_at: string;
  }[];
  late_members: { id: number; name: string }[];
};

export const groupService = {
  list() {
    return apiService.get<Group[]>('/groups').then((r) => r.data);
  },

  create(name: string, contributionAmount: number, frequency: GroupFrequency, maxMembers?: number) {
    return apiService
      .post<Group>('/groups', {
        name,
        contribution_amount: contributionAmount,
        frequency,
        max_members: maxMembers ?? null,
      })
      .then((r) => r.data);
  },

  join(inviteCode: string) {
    return apiService.post<Group>('/groups/join', { invite_code: inviteCode }).then((r) => r.data);
  },

  show(id: number) {
    return apiService.get<Group>(`/groups/${id}`).then((r) => r.data);
  },

  contribute(id: number, paymentMethod?: PaymentMethod, phone?: string) {
    return apiService
      .post<Contribution>(`/groups/${id}/contribute`, { payment_method: paymentMethod, phone })
      .then((r) => r.data);
  },

  report(id: number, cyclePeriod?: string) {
    return apiService
      .get<GroupReport>(`/groups/${id}/report`, { params: cyclePeriod ? { cycle: cyclePeriod } : undefined })
      .then((r) => r.data);
  },
};
