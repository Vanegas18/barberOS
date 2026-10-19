import { Types } from "mongoose";
import type { ClientSession } from "mongoose";
import { SessionModel } from "./session.model.js";
import {
  REFRESH_TOKEN_TTL_MS,
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
} from "./token.service.js";

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

export async function issueSession(
  userId: Types.ObjectId,
  userAgent: string | undefined,
  session?: ClientSession,
): Promise<IssuedTokens> {
  const refreshToken = generateRefreshToken();
  const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await SessionModel.create(
    [
      {
        userId,
        refreshTokenHash: hashRefreshToken(refreshToken),
        expiresAt: refreshExpiresAt,
        userAgent: userAgent?.slice(0, 300),
      },
    ],
    { session },
  );

  return {
    accessToken: signAccessToken(userId.toString()),
    refreshToken,
    refreshExpiresAt,
  };
}

export async function revokeAllUserSessions(userId: Types.ObjectId): Promise<void> {
  await SessionModel.updateMany(
    { userId, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } },
  );
}

export async function revokeSessionByToken(refreshToken: string): Promise<void> {
  await SessionModel.updateOne(
    { refreshTokenHash: hashRefreshToken(refreshToken), revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } },
  );
}
