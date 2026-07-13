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
  cycle_period: string;
  paid_at: string;
  user?: GroupMember;
};

export type Group = {
  id: number;
  uuid: string;
  name: string;
  contribution_amount: string;
  frequency: GroupFrequency;
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

export const groupService = {
  list() {
    return apiService.get<Group[]>('/groups').then((r) => r.data);
  },

  create(name: string, contributionAmount: number, frequency: GroupFrequency) {
    return apiService
      .post<Group>('/groups', { name, contribution_amount: contributionAmount, frequency })
      .then((r) => r.data);
  },

  join(inviteCode: string) {
    return apiService.post<Group>('/groups/join', { invite_code: inviteCode }).then((r) => r.data);
  },

  show(id: number) {
    return apiService.get<Group>(`/groups/${id}`).then((r) => r.data);
  },

  contribute(id: number) {
    return apiService.post<Contribution>(`/groups/${id}/contribute`).then((r) => r.data);
  },
};
