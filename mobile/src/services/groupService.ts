import { apiService } from '@/services/apiService';
import type { VaultMovement } from '@/services/vaultService';

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
  recorded_by: number | null;
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
  paid_out_at: string | null;
  vault_movement_id: number | null;
  user?: GroupMember | null;
};

export type PayoutResult = {
  recipient: CycleRecipient;
  movement: VaultMovement;
  amount: number;
  round_completed: boolean;
};

export type RoundStatus = 'active' | 'completed';

/** Round is locked — the API returns this minimal shape without resolving a cycle recipient. */
export type PayoutPreviewLocked = {
  group_name: string;
  round_status: 'completed';
  round_number: number;
  blocked_reason: string;
  can_payout: false;
};

export type PayoutPreviewActive = {
  group_name: string;
  frequency: GroupFrequency;
  cycle_period: string;
  round_status: 'active';
  round_number: number;
  starts_at: string;
  ends_at: string;
  recipient: { id: number; name: string; avatar_url: string | null; vault_activated: boolean } | null;
  members_count: number;
  paid_count: number;
  amount: number;
  all_paid: boolean;
  already_paid_out: boolean;
  paid_out_at: string | null;
  can_payout: boolean;
};

export type PayoutPreview = PayoutPreviewLocked | PayoutPreviewActive;

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
  recipient_order_updated_at?: string | null;
  recipient_order_updated_by?: number | null;
  invite_code: string;
  owner_id: number;
  auto_payout_enabled: boolean;
  round_number: number;
  round_status: RoundStatus;
  created_at: string;
  updated_at: string;
  members_count?: number;
  current_cycle_period?: string;
  has_paid_current_cycle?: boolean;
  current_cycle_all_paid?: boolean;
  cycle_ends_at?: string;
  schedule_label?: string | null;
  current_cycle_recipient?: CycleRecipient | null;
  round_summary?: { members_paid: number; total_distributed: number };
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

export type DeletionVoteDecision = 'approved' | 'declined';
export type DeletionRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type DeletionVote = {
  id: number;
  user_id: number;
  decision: DeletionVoteDecision;
  decided_at: string;
  user?: GroupMember;
};

export type GroupDeletionRequest = {
  id: number;
  group_id: number;
  requested_by: number;
  status: DeletionRequestStatus;
  expires_at: string;
  resolved_at: string | null;
  created_at: string;
  votes?: DeletionVote[];
  requester?: GroupMember;
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

  /** Owner-only partial update — currently only the auto-payout toggle is exposed in the mobile UI. */
  updateSettings(groupId: number, settings: Partial<{ auto_payout_enabled: boolean }>) {
    return apiService.put<Group>(`/groups/${groupId}/settings`, settings).then((r) => r.data);
  },

  /** Owner-only, only while the round is locked — starts the next round. */
  renewRound(groupId: number) {
    return apiService.post<Group>(`/groups/${groupId}/renew-round`, {}).then((r) => r.data);
  },

  /** Owner-only. Read-only preview for the payout screen — cycle info, live amount, recipient, and whether payout can happen right now. */
  previewPayout(groupId: number) {
    return apiService.get<PayoutPreview>(`/groups/${groupId}/payout`).then((r) => r.data);
  },

  /** Owner-only. Disburses a cycle's total net contributions into the recipient's vault — defaults to the current cycle. */
  payoutCycle(groupId: number, cyclePeriod?: string) {
    return apiService.post<PayoutResult>(`/groups/${groupId}/payout`, { cycle_period: cyclePeriod }).then((r) => r.data);
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

  /** Owner-only. Records a cash/manual contribution on a member's behalf — defaults to the current cycle. */
  recordContribution(groupId: number, userId: number, cyclePeriod?: string) {
    return apiService
      .post<Contribution>(`/groups/${groupId}/members/${userId}/contributions`, { cycle_period: cyclePeriod })
      .then((r) => r.data);
  },

  /** Owner-only. Voids a mistaken manual contribution — only possible before its cycle has been paid out. */
  voidContribution(groupId: number, contributionId: number) {
    return apiService.post<Contribution>(`/groups/${groupId}/contributions/${contributionId}/void`).then((r) => r.data);
  },

  /** Owner-only, non-mutating check before confirming a member removal. */
  previewMemberRemoval(groupId: number, userId: number) {
    return apiService
      .get<{ can_remove: boolean; blocking_reason: string | null; warning: string | null }>(
        `/groups/${groupId}/members/${userId}/removal-preview`,
      )
      .then((r) => r.data);
  },

  /** Owner-only soft removal — the member drops out of rotation/eligibility, history is preserved. */
  removeMember(groupId: number, userId: number) {
    return apiService.delete(`/groups/${groupId}/members/${userId}`).then((r) => r.data);
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

  /** The tontine's current pending deletion vote, if any — null when there isn't one. */
  getDeletionRequest(groupId: number) {
    return apiService.get<GroupDeletionRequest | null>(`/groups/${groupId}/deletion-request`).then((r) => r.data);
  },

  /** Owner-only. Proposes deleting the tontine — members get 48h to approve/decline. */
  requestDeletion(groupId: number) {
    return apiService.post<GroupDeletionRequest>(`/groups/${groupId}/deletion-request`).then((r) => r.data);
  },

  /** Any approved member except the requester (who already implicitly approved). */
  castDeletionVote(groupId: number, decision: DeletionVoteDecision) {
    return apiService
      .post<{ outcome: DeletionRequestStatus | null; deletion_request: GroupDeletionRequest | null }>(
        `/groups/${groupId}/deletion-request/vote`,
        { decision },
      )
      .then((r) => r.data);
  },

  /** Owner-only. Withdraws a pending deletion request before it resolves. */
  cancelDeletionRequest(groupId: number) {
    return apiService.delete(`/groups/${groupId}/deletion-request`).then((r) => r.data);
  },
};
