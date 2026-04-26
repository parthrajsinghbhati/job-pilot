import axios from 'axios';
import * as config from '../config';
import { prisma } from '../lib/prisma';
import { USER_AGENTS } from '../utils/userAgents';

function getUtcNow(): Date {
  return new Date();
}

function getPastDate(days: number): Date {
  const date = getUtcNow();
  date.setDate(date.getDate() - days);
  return date;
}

async function checkSingleLinkedinJobActive(jobId: string): Promise<boolean | null> {
  const jobDetailUrl = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`;
  const inactiveKeywords = ['this job is no longer available', 'job is closed', 'No longer accepting applications'];

  for (let attempt = 0; attempt <= config.ACTIVE_CHECK_MAX_RETRIES; attempt++) {
    try {
      const sleepTime = (Math.random() * (15 - 5) + 5) * 1000;
      await new Promise(r => setTimeout(r, sleepTime));

      const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
      const response = await axios.get(jobDetailUrl, {
        headers: { 'User-Agent': userAgent },
        timeout: config.ACTIVE_CHECK_TIMEOUT,
        maxRedirects: 5,
      });

      if (response.status === 404) return true;
      if (response.status >= 400) return false;

      const html = response.data.toLowerCase();
      for (const keyword of inactiveKeywords) {
        if (html.includes(keyword.toLowerCase())) return true;
      }
      return false;
    } catch (error: any) {
      if (error.response?.status === 404) return true;
      console.warn(`Attempt ${attempt + 1} failed for job ${jobId}: ${error.message}`);
      if (attempt < config.ACTIVE_CHECK_MAX_RETRIES) {
        const waitTime = (config.ACTIVE_CHECK_RETRY_DELAY + Math.random() * 5) * 1000;
        await new Promise(r => setTimeout(r, waitTime));
      }
    }
  }
  return null;
}

export async function markExpiredJobs() {
  console.log('--- Starting Task: Mark Expired Jobs ---');
  const expiryDate = getPastDate(config.JOB_EXPIRY_DAYS);
  const excludedStatuses = ['applied', 'offer', 'interviewing'];

  try {
    const jobsToExpire = await prisma.job.findMany({
      where: {
        scraped_at: { lt: expiryDate },
        status: { notIn: excludedStatuses },
        is_active: true,
      },
      select: { job_id: true }
    });

    if (jobsToExpire.length > 0) {
      const jobIds = jobsToExpire.map((j: any) => j.job_id);
      await prisma.job.updateMany({
        where: { job_id: { in: jobIds } },
        data: { 
          job_state: 'expired', 
          is_active: false 
        }
      });
      console.log(`Successfully marked ${jobIds.length} jobs as expired.`);
    } else {
      console.log('No jobs found for expiration.');
    }
  } catch (error) {
    console.error('Error marking expired jobs:', error);
  }
}

export async function checkJobActivity() {
  console.log('--- Starting Task: Check Job Activity ---');
  const checkOlderThan = getPastDate(config.JOB_CHECK_DAYS);
  const now = getUtcNow();

  try {
    const excludedStatuses = ['applied', 'offer', 'interviewing'];
    const jobsToCheck = await prisma.job.findMany({
      where: {
        is_active: true,
        provider: 'linkedin',
        status: { notIn: excludedStatuses },
        last_checked: { lt: checkOlderThan },
      },
      select: { job_id: true },
      orderBy: { last_checked: 'asc' },
      take: config.JOB_CHECK_LIMIT,
    });

    if (jobsToCheck.length === 0) return;

    const inactiveIds: string[] = [];
    const activeIds: string[] = [];

    for (const job of jobsToCheck) {
      const isInactive = await checkSingleLinkedinJobActive(job.job_id);
      if (isInactive === true) inactiveIds.push(job.job_id);
      else if (isInactive === false) activeIds.push(job.job_id);
    }

    if (inactiveIds.length > 0) {
      await prisma.job.updateMany({
        where: { job_id: { in: inactiveIds } },
        data: { 
          job_state: 'removed', 
          is_active: false, 
          last_checked: now 
        }
      });
    }
    if (activeIds.length > 0) {
      await prisma.job.updateMany({
        where: { job_id: { in: activeIds } },
        data: { last_checked: now }
      });
    }
    console.log(`Activity check complete. Inactive: ${inactiveIds.length}, Active: ${activeIds.length}`);
  } catch (error) {
    console.error('Error checking job activity:', error);
  }
}

export async function deleteOldInactiveJobs() {
  console.log('--- Starting Task: Delete Old Inactive Jobs ---');
  const deleteOlderThan = getPastDate(config.JOB_DELETION_DAYS);
  try {
    const deleted = await prisma.job.deleteMany({
      where: {
        is_active: false,
        job_state: { in: ['expired', 'removed'] },
        scraped_at: { lt: deleteOlderThan },
      }
    });

    console.log(`Successfully deleted ${deleted.count} old inactive jobs.`);
  } catch (error) {
    console.error('Error deleting old jobs:', error);
  }
}
