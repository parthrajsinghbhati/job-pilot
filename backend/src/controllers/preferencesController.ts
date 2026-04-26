import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const getPreferences = async (req: Request, res: Response) => {
  const { user_id } = req.params;
  try {
    const preferences = await prisma.userPreference.findUnique({
      where: { user_id }
    });
    res.json({ preferences });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updatePreferences = async (req: Request, res: Response) => {
  const { user_id, linkedin_search_queries, location } = req.body;
  try {
    const preferences = await prisma.userPreference.upsert({
      where: { user_id },
      update: {
        linkedin_search_queries,
        location
      },
      create: {
        user_id,
        linkedin_search_queries,
        location
      }
    });
    res.json({ preferences });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
