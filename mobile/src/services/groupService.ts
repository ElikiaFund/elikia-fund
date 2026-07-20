import { apiService } from '@/services/apiService';

export type GroupFrequency = 'weekly' | 'monthly';
export type MembershipStatus = 'pending' | 'approved';
export type RecipientMode = 'predefined' | 'join_order' | 'random' | 'admin';

export type GroupMember = {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  pivot: { joined_at: string; status?: MembershipStatus; approved_at?: string | null };
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

export type CycleRecipient = {
  id: number;
  group_id: number;
  cycle_period: string;
  user_id: number | null;
  method: RecipientMode;
  decided_at: string | null;
  user?: GroupMember | null;
};

export type Group = {
  id: number;
  uuid: string;
  name: string;
  contribution_amount: string;
  frequency: GroupFrequency;
  max_members: number | null;
  contribution_day: number | null;
  contribution_time: string | null;
  recipient_mode: RecipientMode;
  recipient_order: number[] | null;
  invite_code: string;
  owner_id: number;
  created_at: string;
  updated_at: string;
  members_count?: number;
  current_cycle_period?: string;
  has_paid_current_cycle?: boolean;
  cycle_ends_at?: string;
  schedule_label?: string | null;
  current_cycle_recipient?: CycleRecipient;
  pending_requests_count?: number;
  membership_status?: MembershipStatus;
  owner?: GroupMember;
  members?: GroupMember[];
  pending_members?: GroupMember[];
  contributions?: Contribution[];
  pivot?: { joined_at: string; status: MembershipStatus; approved_at: string | null };
};

export type GroupPreview = Pick<
  Group,
  'id' | 'name' | 'frequency' | 'contribution_amount' | 'max_members' | 'members_count' | 'owner' | 'membership_status' | 'schedule_label'
>;

/** Percentage withheld from every contribution as a tontine management fee — kept in sync with GroupController::MANAGEMENT_FEE_RATE. */
export const TONTINE_MANAGEMENT_FEE_RATE = 0.03;

export type GroupReport = {
  group_id: number;
  group_name: string;
  frequency: GroupFrequency;
  cycle_period: string;
  starts_at: string;
  ends_at: string;
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

export type GroupCycle = {
  cycle_period: string;
  starts_at: string;
  ends_at: string;
  is_current: boolean;
  paid_count: number;
  members_count: number;
};

export const groupService = {
  list() {
    return apiService.get<Group[]>('/groups').then((r) => r.data);
  },

  create(
    name: string,
    contributionAmount: number,
    frequency: GroupFrequency,
    maxMembers?: number,
    schedule?: { day: number | null; time: string | null },
    recipientMode?: RecipientMode,
  ) {
    return apiService
      .post<Group>('/groups', {
        name,
        contribution_amount: contributionAmount,
        frequency,
        max_members: maxMembers ?? null,
        contribution_day: schedule?.day ?? null,
        contribution_time: schedule?.time ?? null,
        recipient_mode: recipientMode ?? null,
      })
      .then((r) => r.data);
  },

  /** Read-only group info shown before requesting to join — invite code lookup, no membership required. */
  preview(inviteCode: string) {
    return apiService.get<GroupPreview>(`/groups/preview/${inviteCode}`).then((r) => r.data);
  },

  /** Submits a join request — membership starts 'pending' until the owner approves it. */
  join(inviteCode: string) {
    return apiService.post<Group>('/groups/join', { invite_code: inviteCode }).then((r) => r.data);
  },

  show(id: number) {
    return apiService.get<Group>(`/groups/${id}`).then((r) => r.data);
  },

  listRequests(groupId: number) {
    return apiService.get<GroupMember[]>(`/groups/${groupId}/requests`).then((r) => r.data);
  },

  approveRequest(groupId: number, userId: number) {
    return apiService.post(`/groups/${groupId}/requests/${userId}/approve`).then((r) => r.data);
  },

  declineRequest(groupId: number, userId: number) {
    return apiService.post(`/groups/${groupId}/requests/${userId}/decline`).then((r) => r.data);
  },

  updateRecipientOrder(groupId: number, order: number[]) {
    return apiService.put<Group>(`/groups/${groupId}/recipient-order`, { order }).then((r) => r.data);
  },

  designateRecipient(groupId: number, userId: number) {
    return apiService.put<CycleRecipient>(`/groups/${groupId}/cycle-recipient`, { user_id: userId }).then((r) => r.data);
  },

  contribute(id: number, paymentMethod?: PaymentMethod, phone?: string) {
    return apiService
      .post<Contribution>(`/groups/${id}/contribute`, { payment_method: paymentMethod, phone })
      .then((r) => r.data);
  },

  /** Manual fallback for a contribution stuck `processing` — re-checks the payment status with Yabeto directly instead of waiting on the webhook. */
  refreshContributionStatus(groupId: number, contributionId: number) {
    return apiService
      .post<Contribution>(`/groups/${groupId}/contributions/${contributionId}/refresh-status`)
      .then((r) => r.data);
  },

  report(id: number, cyclePeriod?: string) {
    return apiService
      .get<GroupReport>(`/groups/${id}/report`, { params: cyclePeriod ? { cycle: cyclePeriod } : undefined })
      .then((r) => r.data);
  },

  /** Every cycle since the tontine was created, most recent first. */
  cycles(id: number) {
    return apiService.get<GroupCycle[]>(`/groups/${id}/cycles`).then((r) => r.data);
  },
};
