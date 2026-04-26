import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { scrapeLinkedin } from '../services/scraperService';
import * as config from '../config';

export const getHealth = (req: Request, res: Response) => {
  res.json({ status: 'ok', node: process.version });
};

export const getJobs = async (req: Request, res: Response) => {
  const user_id = req.params.user_id as string;
  try {
    const jobs = await prisma.job.findMany({
      where: { user_id },
      orderBy: { scraped_at: 'desc' }
    });

    res.json({ jobs });
  } catch (error: any) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ jobs: [], error: error.message });
  }
};

export const triggerScrape = async (req: Request, res: Response) => {
  const { query, location, user_id } = req.body;
  console.log(`🟢 /scrape called: query='${query}', location='${location}', user='${user_id}'`);

  try {
    // 1. Clear old jobs
    await prisma.job.deleteMany({
      where: { user_id }
    });
    
    // 2. Update preferences
    await prisma.userPreference.upsert({
      where: { user_id },
      update: {
        linkedin_search_queries: [query],
        location
      },
      create: {
        user_id,
        linkedin_search_queries: [query],
        location
      }
    });

    // 3. Trigger scraper in background
    // Background execution
    (async () => {
      try {
        console.log('🤖 BACKGROUND: Scraper starting...');
        // In a real multi-user app, we'd pass user_id to the scraper
        await scrapeLinkedin();
        console.log('🏁 Scraper done.');
      } catch (err) {
        console.error('💥 Scraper crashed:', err);
      }
    })();

    res.json({ message: 'Searching...', user_id, query });
  } catch (error: any) {
    console.error('Error triggering scrape:', error);
    res.status(500).json({ error: error.message });
  }
};
