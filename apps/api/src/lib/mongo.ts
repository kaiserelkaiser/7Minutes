import { MongoClient, type Db, type IndexDescription } from "mongodb";
import { serverConfig } from "./config";
import { logger } from "./logger";

const DATABASE_NAME = "sevenminutes";

let clientPromise: Promise<MongoClient> | null = null;
let warnedMissingConfig = false;

export function isMongoConfigured(): boolean {
  return Boolean(serverConfig.mongodbUrl);
}

export async function getMongoDb(): Promise<Db | null> {
  if (!serverConfig.mongodbUrl) {
    if (!warnedMissingConfig) {
      logger.warn("MONGODB_URL is not configured; persistence features are disabled");
      warnedMissingConfig = true;
    }
    return null;
  }

  const client = await getMongoClient();
  return client.db(DATABASE_NAME);
}

export async function ensureMongoIndexes(): Promise<void> {
  const db = await getMongoDb();
  if (!db) return;

  await Promise.all([
    ensureCollectionIndexes(db, "users", [
      { key: { usernameLower: 1 }, unique: true, name: "users_username_lower_unique" },
      { key: { inviteCode: 1 }, unique: true, name: "users_invite_code_unique" },
    ]),
    ensureCollectionIndexes(db, "rooms", [
      { key: { expiresAt: 1 }, expireAfterSeconds: 0, name: "rooms_expires_at_ttl" },
      { key: { isLive: 1, expiresAt: 1 }, name: "rooms_live_discovery" },
    ]),
    ensureCollectionIndexes(db, "messages", [
      { key: { expiresAt: 1 }, expireAfterSeconds: 0, name: "messages_expires_at_ttl" },
      { key: { roomId: 1, createdAt: -1 }, name: "messages_room_created_at" },
    ]),
    ensureCollectionIndexes(db, "memories", [
      { key: { userId: 1, createdAt: -1 }, name: "memories_user_created_at" },
    ]),
    ensureCollectionIndexes(db, "achievements", [
      { key: { userId: 1, type: 1 }, unique: true, name: "achievements_user_type_unique" },
    ]),
    ensureCollectionIndexes(db, "follows", [
      { key: { followerUserId: 1, followedUserId: 1 }, unique: true, name: "follows_pair_unique" },
      { key: { followedUserId: 1 }, name: "follows_followed_lookup" },
    ]),
    ensureCollectionIndexes(db, "invites", [
      { key: { inviterUserId: 1, joinedAt: -1 }, name: "invites_inviter_joined_at" },
      { key: { invitedUserId: 1 }, unique: true, name: "invites_invited_user_unique" },
    ]),
    ensureCollectionIndexes(db, "scheduledRooms", [
      { key: { scheduledFor: 1, isPublic: 1 }, name: "scheduled_rooms_public_schedule" },
      { key: { creatorUserId: 1, scheduledFor: -1 }, name: "scheduled_rooms_creator_schedule" },
    ]),
    ensureCollectionIndexes(db, "highlightReels", [
      { key: { participantIds: 1, createdAt: -1 }, name: "highlight_reels_participant_created_at" },
      { key: { roomId: 1 }, name: "highlight_reels_room_id" },
    ]),
    ensureCollectionIndexes(db, "roomEchoes", [
      { key: { userId: 1, viewed: 1, createdAt: -1 }, name: "room_echoes_user_viewed_created_at" },
      { key: { expiresAt: 1 }, expireAfterSeconds: 0, name: "room_echoes_expires_at_ttl" },
    ]),
  ]);

  logger.info("MongoDB indexes ensured");
}

async function ensureCollectionIndexes(
  db: Db,
  collectionName: string,
  indexes: IndexDescription[],
): Promise<void> {
  const collection = db.collection(collectionName);
  await Promise.all(indexes.map((index) => collection.createIndex(index.key, index)));
}

async function getMongoClient(): Promise<MongoClient> {
  if (!clientPromise) {
    clientPromise = MongoClient.connect(serverConfig.mongodbUrl as string, {
      maxPoolSize: 10,
      minPoolSize: 1,
      retryWrites: true,
      appName: "7MINUTES",
    }).catch((error) => {
      clientPromise = null;
      throw error;
    });
  }

  return clientPromise;
}
