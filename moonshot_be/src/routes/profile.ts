import { Router } from 'express';
import { db } from '../db/client.js';
import { userProfiles } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { eq } from 'drizzle-orm';

export const profileRouter = Router();

profileRouter.patch('/profile', requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const { displayName, avatarUrl } = req.body || {};

  const trimmedName = typeof displayName === 'string' ? displayName.trim() : '';
  if (!trimmedName) {
    return res.status(400).json({ error: 'Display name is required' });
  }

  try {
    const [existing] = await db.select().from(userProfiles).where(eq(userProfiles.id, userId)).limit(1);
    if (!existing) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const updateData: Partial<typeof userProfiles.$inferInsert> = {
      displayName: trimmedName,
      updatedAt: new Date()
    };

    // Optional avatar updates if FE later provides it
    if (typeof avatarUrl === 'string') {
      updateData.avatarUrl = avatarUrl;
    }

    const [updated] = await db
      .update(userProfiles)
      .set(updateData)
      .where(eq(userProfiles.id, userId))
      .returning({
        id: userProfiles.id,
        displayName: userProfiles.displayName,
        email: userProfiles.email,
        tier: userProfiles.tier,
        avatarUrl: userProfiles.avatarUrl,
        updatedAt: userProfiles.updatedAt
      });

    return res.json({ profile: updated });
  } catch (err) {
    req.log?.error({ message: 'profile.update.failed', err, userId });
    return res.status(500).json({ error: 'Failed to update profile', correlationId: req.correlationId });
  }
});
