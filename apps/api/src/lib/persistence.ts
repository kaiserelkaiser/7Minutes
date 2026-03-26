import { ObjectId, type Collection, type Db, type WithId } from "mongodb";
import { getMongoDb } from "./mongo";

type VerificationTier = "creator" | "celebrity" | "founder";

type UserDocument = {
  username: string;
  usernameLower: string;
  colorSignature: string;
  inviteCode: string;
  invitedByUserId: ObjectId | null;
  invitedByUsername: string | null;
  reputation: number;
  totalRoomsJoined: number;
  totalResonances: number;
  followerCount: number;
  verified: boolean;
  verificationTier: VerificationTier | null;
  streakData: {
    current: number;
    longest: number;
    lastActive: Date | null;
  };
  creature: {
    stage: number;
    evolution: string[];
  };
  preferences: {
    notifications: boolean;
    autoJoinQuantum: boolean;
    favoriteTopics: string[];
  };
  interests: string[];
  inviteCodeUsed: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type InviteDocument = {
  inviterUserId: ObjectId;
  invitedUserId: ObjectId;
  invitedUsername: string;
  inviteCode: string;
  joinedAt: Date;
  isActive: boolean;
  activatedAt: Date | null;
};

type RoomDocument = {
  topic: string;
  type: "standard" | "quantum" | "void" | "duel" | "context";
  activeUsers: number;
  temperature: number;
  vibe: string;
  isLive: boolean;
  createdAt: Date;
  expiresAt: Date;
  totalMessages: number;
  peakUsers: number;
  updatedAt: Date;
};

type RoomRecord = RoomDocument & { _id: string };

type MessageDocument = {
  messageId: string;
  roomId: string;
  userId: string;
  username: string;
  content: string;
  sentiment: "positive" | "negative" | "neutral";
  createdAt: Date;
  expiresAt: Date;
  isBurst: boolean;
};

type RoomArchiveDocument = {
  roomId: string;
  topic: string;
  type: "standard" | "quantum" | "void" | "duel" | "context";
  createdAt: Date;
  closedAt: Date;
  peakUsers: number;
  totalMessages: number;
  vibeColor: string;
  temperature: number;
  participantCount: number;
  catalystCount: number;
};

type MemoryDocument = {
  userId: ObjectId;
  roomId: string;
  roomTopic: string;
  essence: string;
  participants: string[];
  bestMoment: string;
  visualSeed: {
    hue: number;
    complexity: number;
    energy: number;
  };
  participantCount: number;
  createdAt: Date;
};

type AchievementDocument = {
  userId: ObjectId;
  type: "resonance" | "streak" | "catalyst" | "invite";
  tier: "bronze" | "silver" | "gold";
  unlockedAt: Date;
  count: number;
};

type FollowDocument = {
  followerUserId: ObjectId;
  followedUserId: ObjectId;
  createdAt: Date;
};

type ShareCardDocument = {
  roomId: string;
  gradient: string[];
  bestQuote: string;
  speaker: string;
  context: string;
  participants: string[];
  resonanceMoments: number;
  roomVibe: string;
  shareUrl: string;
};

type HighlightMomentDocument = {
  timestamp: string;
  quote: string;
  context: string;
  reactions: string[];
};

type HighlightReelDocument = {
  roomId: string;
  roomTopic: string;
  participantIds: string[];
  participantNames: string[];
  vibeLabel: string;
  bestMoments: HighlightMomentDocument[];
  stats: {
    totalMessages: number;
    wordsSaved: number;
    laughsMoment: string;
    deepestDive: string;
  };
  shareCard: ShareCardDocument;
  createdAt: Date;
};

type RoomEchoDocument = {
  userId: ObjectId;
  roomId: string;
  title: string;
  body: string;
  finalMoments: string[];
  resonanceMoment: boolean;
  catalystDropped: string;
  viewed: boolean;
  createdAt: Date;
  expiresAt: Date;
};

type ScheduledRoomDocument = {
  creatorUserId: ObjectId;
  creatorUsername: string;
  creatorColorSignature: string;
  creatorVerificationTier: VerificationTier | null;
  topic: string;
  description: string;
  kind: "ama" | "launch-party" | "watch-party" | "study-session" | "open";
  scheduledFor: Date;
  isPublic: boolean;
  maxUsers: number;
  reminderEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type AuthUserView = {
  id: string;
  username: string;
  colorSignature: string;
  inviteCode: string;
  invitedByUsername: string | null;
  reputation: number;
  totalRoomsJoined: number;
  totalResonances: number;
  followerCount: number;
  verified: boolean;
  verificationTier: VerificationTier | null;
  currentStreak: number;
  creatureStage: number;
  interests: string[];
};

export type BadgeView = {
  type: string;
  tier: string;
  count: number;
  unlockedAt: string;
};

export type MemoryPreviewView = {
  id: string;
  essence: string;
  roomTopic: string;
  bestMoment: string;
  participantCount: number;
  createdAt: string;
};

export type UserProfileView = {
  username: string;
  colorSignature: string;
  reputation: number;
  invitedByUsername: string | null;
  verified: boolean;
  verificationTier: VerificationTier | null;
  followerCount: number;
  creatureStage: number;
  isFollowing: boolean;
  inviteStats: InviteStatsView;
  badges: BadgeView[];
  stats: {
    roomsJoined: number;
    resonancesTriggered: number;
    currentStreak: number;
  };
  recentMemories: MemoryPreviewView[];
};

export type TrendingTopicView = {
  topic: string;
  roomCount: number;
  totalUsers: number;
  heat: number;
};

export type FriendPresenceView = {
  userId: string;
  username: string;
  colorSignature: string;
  roomId: string;
  roomTopic: string;
  roomUserCount: number;
  roomMaxUsers: number;
  timeLeftSeconds: number;
  joinable: boolean;
};

export type InviteStatsView = {
  totalInvites: number;
  activeInvites: number;
  points: number;
  reward: string;
};

export type InviterLeaderboardEntryView = {
  userId: string;
  username: string;
  colorSignature: string;
  verificationTier: VerificationTier | null;
  totalInvites: number;
  activeInvites: number;
  points: number;
  reward: string;
};

export type FeaturedRoomView = {
  roomId: string;
  topic: string;
  username: string;
  verificationTier: VerificationTier;
  userCount: number;
  maxUsers: number;
  spotsLeft: number;
  joinable: boolean;
  timeLeftSeconds: number;
};

export type PresenceSnapshotView = {
  onlineNow: number;
  activeRooms: number;
  trendingTopics: TrendingTopicView[];
  celebrityAlert: {
    username: string;
    roomId: string;
    room: string;
    joinable: boolean;
    reputation: number;
    verificationTier: VerificationTier;
    spotsLeft: number;
  } | null;
  friendsOnline: FriendPresenceView[];
  featuredRooms: FeaturedRoomView[];
};

export type ShareCardView = ShareCardDocument & { id: string };

export type HighlightReelView = {
  id: string;
  roomId: string;
  roomTopic: string;
  vibeLabel: string;
  bestMoments: HighlightMomentDocument[];
  stats: HighlightReelDocument["stats"];
  shareCard: ShareCardView;
  createdAt: string;
};

export type RoomEchoView = {
  id: string;
  roomId: string;
  title: string;
  body: string;
  finalMoments: string[];
  resonanceMoment: boolean;
  catalystDropped: string;
  createdAt: string;
};

export type HomeFeedView = {
  highlights: HighlightReelView[];
  roomEchoes: RoomEchoView[];
  shareCards: ShareCardView[];
};

export type ScheduledRoomView = {
  id: string;
  topic: string;
  description: string;
  kind: ScheduledRoomDocument["kind"];
  scheduledFor: string;
  isPublic: boolean;
  maxUsers: number;
  reminderEnabled: boolean;
  creatorUsername: string;
  creatorColorSignature: string;
  creatorVerificationTier: VerificationTier | null;
};

export type RuntimeRiftSnapshot = {
  id: string;
  topic: string;
  type: "standard" | "quantum" | "void" | "duel" | "context";
  activeUsers: number;
  temperature: number;
  vibe: string;
  createdAt: Date;
  expiresAt: Date;
  totalMessages: number;
  peakUsers: number;
  isLive: boolean;
};

export type RuntimeMessageSnapshot = {
  messageId: string;
  roomId: string;
  userId: string;
  username: string;
  content: string;
  sentiment: "positive" | "negative" | "neutral";
  createdAt: Date;
  expiresAt: Date;
  isBurst: boolean;
};

export type RoomClosureSnapshot = {
  roomId: string;
  topic: string;
  type: "standard" | "quantum" | "void" | "duel" | "context";
  createdAt?: Date;
  participantIds: string[];
  participantNames: string[];
  peakUsers: number;
  totalMessages: number;
  vibeColor: string;
  temperature: number;
  resonanceMoments: number;
  resonanceChains: number;
  catalystHistory: string[];
  earlyDepartureUserIds: string[];
  messages: Array<{ content: string; createdAt: Date }>;
};

export type PresenceRoomSnapshot = {
  roomId: string;
  type: "standard" | "quantum" | "context";
  topic: string;
  userCount: number;
  maxUsers: number;
  temperature: number;
  vibeColor: string;
  timeLeftSeconds: number;
  users: Array<{
    userId: string;
    username: string;
    colorSignature: string;
  }>;
};

export class PersistenceUnavailableError extends Error {
  constructor() {
    super("Persistence layer is unavailable");
    this.name = "PersistenceUnavailableError";
  }
}

export async function registerUser(input: {
  username: string;
  inviteCode?: string;
  interests?: string[];
}): Promise<AuthUserView> {
  const db = await requireDb();
  const users = db.collection<UserDocument>("users");
  const username = sanitizeUsername(input.username);
  const now = new Date();
  const existing = await users.findOne({ usernameLower: username.toLowerCase() });
  if (existing) {
    throw new Error("Username already taken");
  }

  const inviter = input.inviteCode?.trim()
    ? await users.findOne({ inviteCode: input.inviteCode.trim().toUpperCase() })
    : null;
  if (input.inviteCode?.trim() && !inviter) {
    throw new Error("Invalid invite code");
  }

  const verification = verificationProfileForUsername(username);
  const document: UserDocument = {
    username,
    usernameLower: username.toLowerCase(),
    colorSignature: colorFromUsername(username),
    inviteCode: await generateInviteCode(users, username),
    invitedByUserId: inviter?._id ?? null,
    invitedByUsername: inviter?.username ?? null,
    reputation: 50,
    totalRoomsJoined: 0,
    totalResonances: 0,
    followerCount: 0,
    verified: verification.verified,
    verificationTier: verification.verificationTier,
    streakData: {
      current: 0,
      longest: 0,
      lastActive: null,
    },
    creature: {
      stage: 1,
      evolution: ["seed"],
    },
    preferences: {
      notifications: false,
      autoJoinQuantum: false,
      favoriteTopics: sanitizeTopics(input.interests),
    },
    interests: sanitizeTopics(input.interests),
    inviteCodeUsed: input.inviteCode?.trim() || null,
    createdAt: now,
    updatedAt: now,
  };

  const result = await users.insertOne(document);
  if (inviter) {
    await db.collection<InviteDocument>("invites").insertOne({
      inviterUserId: inviter._id,
      invitedUserId: result.insertedId,
      invitedUsername: username,
      inviteCode: inviter.inviteCode,
      joinedAt: now,
      isActive: false,
      activatedAt: null,
    });
  }

  return mapAuthUser({ _id: result.insertedId, ...document });
}

export async function loginUser(usernameInput: string): Promise<AuthUserView | null> {
  const db = await requireDb();
  const user = await db
    .collection<UserDocument>("users")
    .findOne({ usernameLower: sanitizeUsername(usernameInput).toLowerCase() });

  return user ? mapAuthUser(user) : null;
}

export async function getUserById(userId: string): Promise<AuthUserView | null> {
  if (!ObjectId.isValid(userId)) return null;
  const db = await requireDb();
  const user = await db
    .collection<UserDocument>("users")
    .findOne({ _id: new ObjectId(userId) });

  return user ? mapAuthUser(user) : null;
}

export async function getUserProfile(
  usernameInput: string,
  viewerUserId?: string,
): Promise<UserProfileView | null> {
  const db = await requireDb();
  const users = db.collection<UserDocument>("users");
  const user = await users.findOne({ usernameLower: sanitizeUsername(usernameInput).toLowerCase() });
  if (!user) return null;

  const [achievements, memories, isFollowing] = await Promise.all([
    db
      .collection<AchievementDocument>("achievements")
      .find({ userId: user._id })
      .sort({ unlockedAt: -1 })
      .limit(6)
      .toArray(),
    db
      .collection<MemoryDocument>("memories")
      .find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray(),
    viewerUserId && ObjectId.isValid(viewerUserId)
      ? db.collection<FollowDocument>("follows").findOne({
          followerUserId: new ObjectId(viewerUserId),
          followedUserId: user._id,
        })
      : Promise.resolve(null),
  ]);

  return {
    username: user.username,
    colorSignature: user.colorSignature,
    reputation: user.reputation,
    invitedByUsername: user.invitedByUsername,
    verified: user.verified,
    verificationTier: user.verificationTier,
    followerCount: user.followerCount,
    creatureStage: user.creature.stage,
    isFollowing: Boolean(isFollowing),
    inviteStats: await getInviteStats(db, user._id),
    badges: achievements.map((achievement) => ({
      type: achievement.type,
      tier: achievement.tier,
      count: achievement.count,
      unlockedAt: achievement.unlockedAt.toISOString(),
    })),
    stats: {
      roomsJoined: user.totalRoomsJoined,
      resonancesTriggered: user.totalResonances,
      currentStreak: user.streakData.current,
    },
    recentMemories: memories.map((memory) => ({
      id: memory._id.toString(),
      essence: memory.essence,
      roomTopic: memory.roomTopic,
      bestMoment: memory.bestMoment,
      participantCount: memory.participantCount,
      createdAt: memory.createdAt.toISOString(),
    })),
  };
}

export async function getPresenceSnapshot(
  rooms: PresenceRoomSnapshot[],
  viewerUserId?: string,
): Promise<PresenceSnapshotView> {
  const db = await getMongoDb();
  const base = buildBasePresenceSnapshot(rooms);
  if (!db) return base;

  const persistentUserIds = Array.from(
    new Set(
      rooms.flatMap((room) =>
        room.users.filter((user) => ObjectId.isValid(user.userId)).map((user) => user.userId),
      ),
    ),
  );

  const onlineUsers = persistentUserIds.length
    ? await db
        .collection<UserDocument>("users")
        .find({ _id: { $in: persistentUserIds.map((id) => new ObjectId(id)) } })
        .project({ username: 1, colorSignature: 1, reputation: 1, verified: 1, verificationTier: 1 })
        .toArray()
    : [];

  const onlineUserMap = new Map(onlineUsers.map((user) => [user._id.toString(), user]));
  const celebrityCandidate = [...onlineUsers]
    .filter((user) => user.verified && user.verificationTier)
    .sort((left, right) => verificationTierWeight(right.verificationTier) - verificationTierWeight(left.verificationTier) || right.reputation - left.reputation)[0];

  let celebrityAlert: PresenceSnapshotView["celebrityAlert"] = null;
  if (celebrityCandidate) {
    const room = rooms.find((entry) =>
      entry.users.some((user) => user.userId === celebrityCandidate._id.toString()),
    );
    if (room) {
      celebrityAlert = {
        username: celebrityCandidate.username,
        roomId: room.roomId,
        room: room.topic,
        joinable: room.userCount < room.maxUsers,
        reputation: celebrityCandidate.reputation,
        verificationTier: celebrityCandidate.verificationTier as VerificationTier,
        spotsLeft: Math.max(0, room.maxUsers - room.userCount),
      };
    }
  }

  let friendsOnline: FriendPresenceView[] = [];
  if (viewerUserId && ObjectId.isValid(viewerUserId)) {
    const follows = await db
      .collection<FollowDocument>("follows")
      .find({ followerUserId: new ObjectId(viewerUserId) })
      .toArray();

    const followedIds = new Set(follows.map((follow) => follow.followedUserId.toString()));
    friendsOnline = rooms
      .flatMap((room) =>
        room.users
          .filter((user) => followedIds.has(user.userId))
          .map((user) => ({
            userId: user.userId,
            username: onlineUserMap.get(user.userId)?.username ?? user.username,
            colorSignature: onlineUserMap.get(user.userId)?.colorSignature ?? user.colorSignature,
            roomId: room.roomId,
            roomTopic: room.topic,
            roomUserCount: room.userCount,
            roomMaxUsers: room.maxUsers,
            timeLeftSeconds: room.timeLeftSeconds,
            joinable: room.userCount < room.maxUsers,
          })),
      )
      .slice(0, 6);
  }

  const featuredRooms = rooms.flatMap((room) => {
    const featuredUser = room.users
      .map((user) => onlineUserMap.get(user.userId))
      .find((user): user is WithId<UserDocument> => Boolean(user?.verified && user.verificationTier));

    if (!featuredUser || !featuredUser.verificationTier) return [];

    return [{
      roomId: room.roomId,
      topic: room.topic,
      username: featuredUser.username,
      verificationTier: featuredUser.verificationTier,
      userCount: room.userCount,
      maxUsers: room.maxUsers,
      spotsLeft: Math.max(0, room.maxUsers - room.userCount),
      joinable: room.userCount < room.maxUsers,
      timeLeftSeconds: room.timeLeftSeconds,
    } satisfies FeaturedRoomView];
  }).slice(0, 5);

  return {
    ...base,
    celebrityAlert,
    friendsOnline,
    featuredRooms,
  };
}

export async function getInviterLeaderboard(): Promise<InviterLeaderboardEntryView[]> {
  const db = await requireDb();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const invites = await db
    .collection<InviteDocument>("invites")
    .aggregate<{
      _id: ObjectId;
      totalInvites: number;
      activeInvites: number;
    }>([
      { $match: { joinedAt: { $gte: since } } },
      {
        $group: {
          _id: "$inviterUserId",
          totalInvites: { $sum: 1 },
          activeInvites: {
            $sum: {
              $cond: [{ $eq: ["$isActive", true] }, 1, 0],
            },
          },
        },
      },
      { $sort: { activeInvites: -1, totalInvites: -1 } },
      { $limit: 10 },
    ])
    .toArray();

  const users = invites.length
    ? await db
        .collection<UserDocument>("users")
        .find({ _id: { $in: invites.map((invite) => invite._id) } })
        .project({ username: 1, colorSignature: 1, verificationTier: 1 })
        .toArray()
    : [];

  const userMap = new Map(users.map((user) => [user._id.toString(), user]));
  return invites.map((invite) => {
    const user = userMap.get(invite._id.toString());
    const points = invite.activeInvites * 3 + invite.totalInvites;
    return {
      userId: invite._id.toString(),
      username: user?.username ?? "unknown",
      colorSignature: user?.colorSignature ?? "#00f5ff",
      verificationTier: user?.verificationTier ?? null,
      totalInvites: invite.totalInvites,
      activeInvites: invite.activeInvites,
      points,
      reward: inviteRewardLabel(invite.activeInvites),
    };
  });
}

export async function listScheduledRooms(): Promise<ScheduledRoomView[]> {
  const db = await requireDb();
  const rooms = await db
    .collection<ScheduledRoomDocument>("scheduledRooms")
    .find({
      isPublic: true,
      scheduledFor: { $gte: new Date(Date.now() - 15 * 60 * 1000) },
    })
    .sort({ scheduledFor: 1 })
    .limit(5)
    .toArray();

  return rooms.map(mapScheduledRoom);
}

export async function scheduleRoom(input: {
  creatorUserId: string;
  topic: string;
  scheduledFor: string;
  description?: string;
  isPublic?: boolean;
  maxUsers?: number;
  reminderEnabled?: boolean;
  kind?: ScheduledRoomDocument["kind"];
}): Promise<ScheduledRoomView> {
  if (!ObjectId.isValid(input.creatorUserId)) {
    throw new Error("Invalid creator");
  }

  const db = await requireDb();
  const users = db.collection<UserDocument>("users");
  const creator = await users.findOne({ _id: new ObjectId(input.creatorUserId) });
  if (!creator) {
    throw new Error("Creator not found");
  }

  const topic = sanitizeTopic(input.topic, 60);
  const description = sanitizeOptionalCopy(input.description, 180);
  const scheduledFor = new Date(input.scheduledFor);
  if (Number.isNaN(scheduledFor.getTime()) || scheduledFor.getTime() < Date.now() + 5 * 60 * 1000) {
    throw new Error("Scheduled time must be at least 5 minutes in the future");
  }

  const now = new Date();
  const document: ScheduledRoomDocument = {
    creatorUserId: creator._id,
    creatorUsername: creator.username,
    creatorColorSignature: creator.colorSignature,
    creatorVerificationTier: creator.verificationTier,
    topic,
    description,
    kind: input.kind ?? "open",
    scheduledFor,
    isPublic: input.isPublic ?? true,
    maxUsers: Math.max(2, Math.min(12, input.maxUsers ?? 12)),
    reminderEnabled: input.reminderEnabled ?? true,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection<ScheduledRoomDocument>("scheduledRooms").insertOne(document);
  return mapScheduledRoom({ _id: result.insertedId, ...document });
}

export async function getHomeFeed(userId: string): Promise<HomeFeedView> {
  if (!ObjectId.isValid(userId)) {
    throw new Error("Invalid user");
  }

  const db = await requireDb();
  const objectId = new ObjectId(userId);
  const [highlightDocs, echoDocs] = await Promise.all([
    db
      .collection<HighlightReelDocument>("highlightReels")
      .find({ participantIds: userId })
      .sort({ createdAt: -1 })
      .limit(4)
      .toArray(),
    db
      .collection<RoomEchoDocument>("roomEchoes")
      .find({ userId: objectId, viewed: false })
      .sort({ createdAt: -1 })
      .limit(3)
      .toArray(),
  ]);

  const highlights = highlightDocs.map(mapHighlightReel);
  return {
    highlights,
    roomEchoes: echoDocs.map(mapRoomEcho),
    shareCards: highlights.map((highlight) => highlight.shareCard),
  };
}

export async function markRoomEchoViewed(userId: string, echoId: string): Promise<boolean> {
  if (!ObjectId.isValid(userId) || !ObjectId.isValid(echoId)) {
    return false;
  }

  const db = await requireDb();
  const result = await db.collection<RoomEchoDocument>("roomEchoes").updateOne(
    {
      _id: new ObjectId(echoId),
      userId: new ObjectId(userId),
      viewed: false,
    },
    {
      $set: {
        viewed: true,
      },
    },
  );

  return result.matchedCount > 0;
}

export async function followUser(
  followerUserId: string,
  targetUsername: string,
): Promise<{ following: boolean }> {
  if (!ObjectId.isValid(followerUserId)) {
    throw new Error("Invalid follower");
  }

  const db = await requireDb();
  const users = db.collection<UserDocument>("users");
  const target = await users.findOne({
    usernameLower: sanitizeUsername(targetUsername).toLowerCase(),
  });

  if (!target) {
    throw new Error("User not found");
  }

  if (target._id.toString() === followerUserId) {
    return { following: false };
  }

  const follows = db.collection<FollowDocument>("follows");
  const existing = await follows.findOne({
    followerUserId: new ObjectId(followerUserId),
    followedUserId: target._id,
  });

  if (existing) {
    await follows.deleteOne({ _id: existing._id });
    await users.updateOne({ _id: target._id }, { $inc: { followerCount: -1 } });
    return { following: false };
  }

  await follows.insertOne({
    followerUserId: new ObjectId(followerUserId),
    followedUserId: target._id,
    createdAt: new Date(),
  });
  await users.updateOne({ _id: target._id }, { $inc: { followerCount: 1 } });

  return { following: true };
}

export async function recordRoomJoin(userId: string, topic: string): Promise<void> {
  if (!ObjectId.isValid(userId)) return;
  const db = await getMongoDb();
  if (!db) return;

  const users = db.collection<UserDocument>("users");
  const objectId = new ObjectId(userId);
  const user = await users.findOne({ _id: objectId });
  if (!user) return;

  const now = new Date();
  const streak = computeNextStreak(user.streakData.lastActive, user.streakData.current, now);
  const interests = Array.from(new Set([topic, ...user.interests])).slice(0, 12);
  const stage = creatureStageForStreak(streak.current);

  await users.updateOne(
    { _id: objectId },
    {
      $set: {
        updatedAt: now,
        interests,
        "preferences.favoriteTopics": interests.slice(0, 8),
        "streakData.current": streak.current,
        "streakData.longest": Math.max(user.streakData.longest, streak.current),
        "streakData.lastActive": now,
        "creature.stage": stage,
        "creature.evolution": evolutionForStage(stage),
      },
      $inc: {
        totalRoomsJoined: 1,
        reputation: 1,
      },
    },
  );

  await upsertAchievement(db, objectId, "streak", streak.current, now);
  if (user.totalRoomsJoined === 0 && user.invitedByUserId) {
    await activateInvite(db, objectId, user.invitedByUserId, now);
  }
}

export async function recordResonance(userIds: string[]): Promise<void> {
  const validIds = userIds.filter((userId) => ObjectId.isValid(userId)).map((userId) => new ObjectId(userId));
  if (validIds.length === 0) return;

  const db = await getMongoDb();
  if (!db) return;

  const users = db.collection<UserDocument>("users");
  const now = new Date();

  await users.updateMany(
    { _id: { $in: validIds } },
    {
      $inc: {
        totalResonances: 1,
        reputation: 2,
      },
      $set: { updatedAt: now },
    },
  );

  await Promise.all(validIds.map((userId) => upsertAchievement(db, userId, "resonance", 1, now, true)));
}

export async function syncRoomSnapshot(room: RuntimeRiftSnapshot): Promise<void> {
  const db = await getMongoDb();
  if (!db) return;

  await db.collection<RoomRecord>("rooms").updateOne(
    { _id: room.id },
    {
      $set: {
        topic: room.topic,
        type: room.type,
        activeUsers: room.activeUsers,
        temperature: room.temperature,
        vibe: room.vibe,
        isLive: room.isLive,
        createdAt: room.createdAt,
        expiresAt: room.expiresAt,
        totalMessages: room.totalMessages,
        peakUsers: room.peakUsers,
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );
}

export async function recordMessage(message: RuntimeMessageSnapshot): Promise<void> {
  const db = await getMongoDb();
  if (!db) return;

  await db.collection<MessageDocument>("messages").insertOne({
    messageId: message.messageId,
    roomId: message.roomId,
    userId: message.userId,
    username: message.username,
    content: message.content.slice(0, 500),
    sentiment: message.sentiment,
    createdAt: message.createdAt,
    expiresAt: message.expiresAt,
    isBurst: message.isBurst,
  });
}

export async function deletePersistedMessage(messageId: string): Promise<void> {
  const db = await getMongoDb();
  if (!db) return;

  await db.collection<MessageDocument>("messages").deleteOne({ messageId });
}

export async function archiveClosedContextRoom(snapshot: RoomClosureSnapshot): Promise<void> {
  const db = await getMongoDb();
  if (!db) return;

  const closedAt = new Date();
  await db.collection<RoomArchiveDocument>("roomArchives").insertOne({
    roomId: snapshot.roomId,
    topic: snapshot.topic,
    type: snapshot.type,
    createdAt: snapshot.createdAt ?? closedAt,
    closedAt,
    peakUsers: snapshot.peakUsers,
    totalMessages: snapshot.totalMessages,
    vibeColor: snapshot.vibeColor,
    temperature: snapshot.temperature,
    participantCount: snapshot.participantNames.length,
    catalystCount: snapshot.catalystHistory.length,
  });

  await purgeRoomData(snapshot.roomId);
}

export async function purgeRoomData(roomId: string): Promise<void> {
  const db = await getMongoDb();
  if (!db) return;

  await Promise.all([
    db.collection<MessageDocument>("messages").deleteMany({ roomId }),
    db.collection<RoomRecord>("rooms").deleteOne({ _id: roomId }),
    db.collection<HighlightReelDocument>("highlightReels").deleteMany({ roomId }),
    db.collection<RoomEchoDocument>("roomEchoes").deleteMany({ roomId }),
  ]);
}

export async function finalizeClosedRoom(snapshot: RoomClosureSnapshot): Promise<void> {
  const db = await getMongoDb();
  if (!db) return;

  if (snapshot.type === "context") {
    await archiveClosedContextRoom(snapshot);
    return;
  }

  await db.collection<RoomRecord>("rooms").updateOne(
    { _id: snapshot.roomId },
    {
      $set: {
        isLive: false,
        updatedAt: new Date(),
        totalMessages: snapshot.totalMessages,
        peakUsers: snapshot.peakUsers,
      },
    },
  );

  const persistentUsers = snapshot.participantIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  if (persistentUsers.length === 0) return;

  const essence = createMemoryEssence(snapshot.topic, snapshot.participantNames.length);
  const bestMoment = pickBestMoment(snapshot.messages, snapshot.topic);
  const visualSeed = createVisualSeed(snapshot.vibeColor, snapshot.temperature, snapshot.totalMessages);
  const createdAt = new Date();
  const highlightReel = createHighlightReel(snapshot, createdAt);

  await db.collection<MemoryDocument>("memories").insertMany(
    persistentUsers.map((userId) => ({
      userId,
      roomId: snapshot.roomId,
      roomTopic: snapshot.topic,
      essence,
      participants: snapshot.participantNames,
      bestMoment,
      visualSeed,
      participantCount: snapshot.participantNames.length,
      createdAt,
    })),
  );

  await db.collection<HighlightReelDocument>("highlightReels").insertOne(highlightReel);

  const earlyDepartureIds = snapshot.earlyDepartureUserIds
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));
  if (earlyDepartureIds.length > 0) {
    await db.collection<RoomEchoDocument>("roomEchoes").insertMany(
      earlyDepartureIds.map((userId) => createRoomEchoDocument(snapshot, createdAt, userId)),
    );
  }

  await Promise.all(persistentUsers.map((userId) => trimMemories(db, userId)));
}

export function isPersistenceError(error: unknown): error is PersistenceUnavailableError {
  return error instanceof PersistenceUnavailableError;
}

function mapAuthUser(user: WithId<UserDocument>): AuthUserView {
  return {
    id: user._id.toString(),
    username: user.username,
    colorSignature: user.colorSignature,
    inviteCode: user.inviteCode,
    invitedByUsername: user.invitedByUsername,
    reputation: user.reputation,
    totalRoomsJoined: user.totalRoomsJoined,
    totalResonances: user.totalResonances,
    followerCount: user.followerCount,
    verified: user.verified,
    verificationTier: user.verificationTier,
    currentStreak: user.streakData.current,
    creatureStage: user.creature.stage,
    interests: user.interests,
  };
}

function mapScheduledRoom(room: WithId<ScheduledRoomDocument>): ScheduledRoomView {
  return {
    id: room._id.toString(),
    topic: room.topic,
    description: room.description,
    kind: room.kind,
    scheduledFor: room.scheduledFor.toISOString(),
    isPublic: room.isPublic,
    maxUsers: room.maxUsers,
    reminderEnabled: room.reminderEnabled,
    creatorUsername: room.creatorUsername,
    creatorColorSignature: room.creatorColorSignature,
    creatorVerificationTier: room.creatorVerificationTier,
  };
}

function mapHighlightReel(highlight: WithId<HighlightReelDocument>): HighlightReelView {
  return {
    id: highlight._id.toString(),
    roomId: highlight.roomId,
    roomTopic: highlight.roomTopic,
    vibeLabel: highlight.vibeLabel,
    bestMoments: highlight.bestMoments,
    stats: highlight.stats,
    shareCard: {
      id: highlight._id.toString(),
      ...highlight.shareCard,
    },
    createdAt: highlight.createdAt.toISOString(),
  };
}

function mapRoomEcho(echo: WithId<RoomEchoDocument>): RoomEchoView {
  return {
    id: echo._id.toString(),
    roomId: echo.roomId,
    title: echo.title,
    body: echo.body,
    finalMoments: echo.finalMoments,
    resonanceMoment: echo.resonanceMoment,
    catalystDropped: echo.catalystDropped,
    createdAt: echo.createdAt.toISOString(),
  };
}

async function requireDb(): Promise<Db> {
  const db = await getMongoDb();
  if (!db) {
    throw new PersistenceUnavailableError();
  }

  return db;
}

function sanitizeUsername(raw: string): string {
  const value = raw.trim().replace(/\s+/g, " ").slice(0, 24);
  if (!value) {
    throw new Error("Username is required");
  }
  return value;
}

function sanitizeTopics(topics?: string[]): string[] {
  return Array.from(
    new Set(
      (topics ?? [])
        .map((topic) => topic.trim())
        .filter(Boolean)
        .slice(0, 12),
    ),
  );
}

function sanitizeTopic(raw: string, maxLength: number): string {
  const value = raw.trim().replace(/\s+/g, " ").slice(0, maxLength);
  if (!value) {
    throw new Error("Topic is required");
  }
  return value;
}

function sanitizeOptionalCopy(raw: string | undefined, maxLength: number): string {
  if (!raw) return "";
  return raw.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

async function generateInviteCode(
  users: Collection<UserDocument>,
  username: string,
): Promise<string> {
  const base = username.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase() || "SEVEN";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const inviteCode = `${base}${suffix}`;
    const existing = await users.findOne({ inviteCode }, { projection: { _id: 1 } });
    if (!existing) return inviteCode;
  }

  return `${base}${Date.now().toString(36).slice(-4).toUpperCase()}`;
}

function verificationProfileForUsername(username: string): {
  verified: boolean;
  verificationTier: VerificationTier | null;
} {
  const normalized = username.trim().toLowerCase();
  const founders = new Set(["kaiserelkaiser", "7minutes", "novacortex", "founder"]);
  const celebrities = new Set(["sama", "karpathy", "levelsio", "theo"]);
  const creators = new Set(["fireship", "midudev", "t3dotgg", "addy"]);

  if (founders.has(normalized)) return { verified: true, verificationTier: "founder" };
  if (celebrities.has(normalized)) return { verified: true, verificationTier: "celebrity" };
  if (creators.has(normalized)) return { verified: true, verificationTier: "creator" };
  return { verified: false, verificationTier: null };
}

function verificationTierWeight(tier: VerificationTier | null | undefined): number {
  if (tier === "founder") return 3;
  if (tier === "celebrity") return 2;
  if (tier === "creator") return 1;
  return 0;
}

function computeNextStreak(lastActive: Date | null, current: number, now: Date): {
  current: number;
} {
  if (!lastActive) return { current: 1 };

  const last = new Date(lastActive);
  const diffDays = Math.floor(
    (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
      Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate())) /
      86400000,
  );

  if (diffDays <= 0) return { current };
  if (diffDays === 1) return { current: current + 1 };
  return { current: 1 };
}

function creatureStageForStreak(streak: number): number {
  if (streak >= 100) return 4;
  if (streak >= 30) return 3;
  if (streak >= 7) return 2;
  return 1;
}

function evolutionForStage(stage: number): string[] {
  if (stage >= 4) return ["seed", "tendrils", "bloom", "mythic"];
  if (stage === 3) return ["seed", "tendrils", "bloom"];
  if (stage === 2) return ["seed", "tendrils"];
  return ["seed"];
}

async function upsertAchievement(
  db: Db,
  userId: ObjectId,
  type: AchievementDocument["type"],
  count: number,
  unlockedAt: Date,
  increment = false,
): Promise<void> {
  const achievements = db.collection<AchievementDocument>("achievements");
  const existing = await achievements.findOne({ userId, type });
  const nextCount = increment ? (existing?.count ?? 0) + count : Math.max(existing?.count ?? 0, count);
  const tier = tierForCount(type, nextCount);

  await achievements.updateOne(
    { userId, type },
    {
      $set: {
        tier,
        unlockedAt: existing?.unlockedAt ?? unlockedAt,
        count: nextCount,
      },
    },
    { upsert: true },
  );
}

function tierForCount(type: AchievementDocument["type"], count: number): AchievementDocument["tier"] {
  const silverThreshold = type === "streak" ? 7 : type === "invite" ? 5 : 5;
  const goldThreshold = type === "streak" ? 30 : type === "invite" ? 10 : 15;

  if (count >= goldThreshold) return "gold";
  if (count >= silverThreshold) return "silver";
  return "bronze";
}

async function getInviteStats(db: Db, userId: ObjectId): Promise<InviteStatsView> {
  const [totalInvites, activeInvites] = await Promise.all([
    db.collection<InviteDocument>("invites").countDocuments({ inviterUserId: userId }),
    db.collection<InviteDocument>("invites").countDocuments({ inviterUserId: userId, isActive: true }),
  ]);
  const points = activeInvites * 3 + totalInvites;
  return {
    totalInvites,
    activeInvites,
    points,
    reward: inviteRewardLabel(activeInvites),
  };
}

function inviteRewardLabel(activeInvites: number): string {
  if (activeInvites >= 100) return "Hall of Fame + lifetime premium";
  if (activeInvites >= 50) return "Custom creature evolution";
  if (activeInvites >= 10) return "Gold aura unlocked";
  if (activeInvites >= 5) return "Silver inviter badge";
  return "First ripple pending";
}

async function activateInvite(
  db: Db,
  invitedUserId: ObjectId,
  inviterUserId: ObjectId,
  now: Date,
): Promise<void> {
  const invites = db.collection<InviteDocument>("invites");
  const activation = await invites.findOneAndUpdate(
    { invitedUserId, inviterUserId, isActive: false },
    { $set: { isActive: true, activatedAt: now } },
    { returnDocument: "after" },
  );

  if (!activation) return;

  await db.collection<UserDocument>("users").updateOne(
    { _id: inviterUserId },
    { $inc: { reputation: 3 }, $set: { updatedAt: now } },
  );

  const stats = await getInviteStats(db, inviterUserId);
  await upsertAchievement(db, inviterUserId, "invite", stats.activeInvites, now);
}

function createMemoryEssence(topic: string, participantCount: number): string {
  const others = Math.max(0, participantCount - 1);
  if (others === 0) {
    return `You opened a solitary orbit around "${topic}" and let it breathe for seven minutes.`;
  }
  return `You and ${others} others shaped a temporary organism around "${topic}".`;
}

function buildBasePresenceSnapshot(rooms: PresenceRoomSnapshot[]): PresenceSnapshotView {
  const topicMap = new Map<string, TrendingTopicView>();
  for (const room of rooms) {
    const key = room.topic;
    const current = topicMap.get(key) ?? {
      topic: room.topic,
      roomCount: 0,
      totalUsers: 0,
      heat: 0,
    };
    current.roomCount += 1;
    current.totalUsers += room.userCount;
    current.heat = Math.max(current.heat, room.temperature);
    topicMap.set(key, current);
  }

  return {
    onlineNow: rooms.reduce((total, room) => total + room.users.length, 0),
    activeRooms: rooms.length,
    trendingTopics: [...topicMap.values()]
      .sort((left, right) => right.heat - left.heat || right.totalUsers - left.totalUsers)
      .slice(0, 5),
    celebrityAlert: null,
    friendsOnline: [],
    featuredRooms: [],
  };
}

function createHighlightReel(
  snapshot: RoomClosureSnapshot,
  createdAt: Date,
): HighlightReelDocument {
  const bestMoments = selectHighlightMoments(snapshot);
  return {
    roomId: snapshot.roomId,
    roomTopic: snapshot.topic,
    participantIds: snapshot.participantIds,
    participantNames: snapshot.participantNames,
    vibeLabel: describeVibe(snapshot.vibeColor, snapshot.temperature, snapshot.resonanceChains),
    bestMoments,
    stats: {
      totalMessages: snapshot.totalMessages,
      wordsSaved: 0,
      laughsMoment: selectLaughMoment(snapshot.messages),
      deepestDive: selectDeepestDive(bestMoments, snapshot.topic),
    },
    shareCard: createShareCard(snapshot, bestMoments, createdAt),
    createdAt,
  };
}

function createShareCard(
  snapshot: RoomClosureSnapshot,
  bestMoments: HighlightMomentDocument[],
  createdAt: Date,
): ShareCardDocument {
  const [lead, secondary] = gradientsFromVibe(snapshot.vibeColor, snapshot.temperature);
  const best = bestMoments[0];
  const participantNames = snapshot.participantNames.slice(0, 3);
  const extraCount = Math.max(0, snapshot.participantNames.length - participantNames.length);
  return {
    roomId: snapshot.roomId,
    gradient: [lead, secondary],
    bestQuote: best?.quote ?? pickBestMoment(snapshot.messages, snapshot.topic),
    speaker: parseSpeaker(best?.quote) ?? snapshot.participantNames[1] ?? snapshot.participantNames[0] ?? "Unknown",
    context: `From: ${snapshot.topic}`,
    participants: extraCount > 0 ? [...participantNames, `+${extraCount} others`] : participantNames,
    resonanceMoments: snapshot.resonanceMoments + snapshot.resonanceChains,
    roomVibe: describeVibe(snapshot.vibeColor, snapshot.temperature, snapshot.resonanceChains),
    shareUrl: `https://7minutes.vercel.app/s/${snapshot.roomId}-${createdAt.getTime().toString(36)}`,
  };
}

function createRoomEchoDocument(
  snapshot: RoomClosureSnapshot,
  createdAt: Date,
  userId: ObjectId,
): RoomEchoDocument {
  return {
    userId,
    roomId: snapshot.roomId,
    title: "You missed the best part",
    body: `After you left "${snapshot.topic}", the conversation kept mutating.`,
    finalMoments: snapshot.messages.slice(-3).map((message) => message.content.slice(0, 160)),
    resonanceMoment: snapshot.resonanceChains > 0 || snapshot.resonanceMoments > 0,
    catalystDropped: snapshot.catalystHistory[snapshot.catalystHistory.length - 1] ?? "No catalyst detonated this time.",
    viewed: false,
    createdAt,
    expiresAt: new Date(createdAt.getTime() + 48 * 60 * 60 * 1000),
  };
}

function selectHighlightMoments(snapshot: RoomClosureSnapshot): HighlightMomentDocument[] {
  const sorted = [...snapshot.messages]
    .sort((left, right) => right.content.length - left.content.length)
    .slice(0, 2);

  return sorted.map((message, index) => ({
    timestamp: formatTimestamp(snapshot.messages[0]?.createdAt ?? createdAtFallback(), message.createdAt),
    quote: message.content.slice(0, 180),
    context:
      index === 0
        ? "This pulled the room into a deeper spiral."
        : "The conversation bent around this moment.",
    reactions: reactionSet(message.content, index),
  }));
}

function selectLaughMoment(messages: Array<{ content: string }>): string {
  const funny = messages.find((message) => /hope|lol|lmao|haha|wild|chaos/i.test(message.content));
  return funny?.content.slice(0, 120) ?? "A crooked grin crossed the room and vanished again.";
}

function selectDeepestDive(bestMoments: HighlightMomentDocument[], topic: string): string {
  return bestMoments[0]?.context ?? `The room tunneled deepest when it circled back to ${topic}.`;
}

function describeVibe(vibeColor: string, temperature: number, resonanceChains: number): string {
  if (resonanceChains >= 1) return "🔥 Hive-mind surge";
  if (temperature >= 78) return "🔥 Heated debate";
  if (vibeColor.includes("ccff00")) return "⚡ Inventive spark";
  if (vibeColor.includes("9b5cff")) return "🌌 Strange depth";
  return "🌊 Electric drift";
}

function gradientsFromVibe(vibeColor: string, temperature: number): [string, string] {
  if (temperature >= 78) return ["#ff3366", "#2a0428"];
  if (vibeColor.includes("ccff00")) return ["#ccff00", "#053328"];
  if (vibeColor.includes("9b5cff")) return ["#9b5cff", "#120222"];
  return ["#00f5ff", "#0a0118"];
}

function formatTimestamp(start: Date, current: Date): string {
  const seconds = Math.max(0, Math.floor((current.getTime() - start.getTime()) / 1000));
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function reactionSet(content: string, index: number): string[] {
  if (/build|ship|made|invent/i.test(content)) return ["💡", "⚡", "🔥"];
  if (/why|conscious|reality|future|truth/i.test(content)) return ["🤯", "🌌", "💭"];
  return index === 0 ? ["🔥", "💡", "🤯"] : ["⚡", "👀", "🫧"];
}

function parseSpeaker(quote: string | undefined): string | null {
  if (!quote) return null;
  const prefix = quote.split(":")[0]?.trim();
  return prefix && prefix.length < 25 ? prefix : null;
}

function createdAtFallback(): Date {
  return new Date(0);
}

function pickBestMoment(
  messages: Array<{ content: string; createdAt: Date }>,
  topic: string,
): string {
  const longest = [...messages].sort((a, b) => b.content.length - a.content.length)[0];
  return longest?.content.slice(0, 180) || `A fleeting spark around ${topic}.`;
}

function createVisualSeed(vibeColor: string, temperature: number, totalMessages: number) {
  return {
    hue: Math.abs(hashString(vibeColor)) % 360,
    complexity: Math.max(1, Math.min(9, Math.round(totalMessages / 8))),
    energy: Math.max(1, Math.min(10, Math.round(temperature / 10))),
  };
}

function hashString(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = input.charCodeAt(index) + ((hash << 5) - hash);
  }
  return hash;
}

function colorFromUsername(username: string): string {
  const hue = Math.abs(hashString(username)) % 360;
  return `hsl(${hue}, 88%, 62%)`;
}

async function trimMemories(db: Db, userId: ObjectId): Promise<void> {
  const memories = db.collection<MemoryDocument>("memories");
  const overflow = await memories
    .find({ userId })
    .sort({ createdAt: -1 })
    .skip(100)
    .project({ _id: 1 })
    .toArray();

  if (overflow.length === 0) return;

  await memories.deleteMany({
    _id: { $in: overflow.map((memory) => memory._id) },
  });
}
