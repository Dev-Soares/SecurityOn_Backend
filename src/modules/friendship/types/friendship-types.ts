import { Friendship } from '@prisma/client';

export type UserSummary = { id: string; name: string };

export type FriendRequestWithUser = Friendship & { requester: UserSummary };

export type SentFriendRequestWithUser = Friendship & { addressee: UserSummary };

export type FriendSummary = {
  friendshipId: string;
  friendsSince: Date;
  user: UserSummary;
};

export type FriendshipRelation =
  | 'self'
  | 'none'
  | 'friends'
  | 'pending_sent'
  | 'pending_received';

export type FriendshipStatusResult = {
  userId: string;
  relation: FriendshipRelation;
  friendshipId: string | null;
};
