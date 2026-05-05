import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import * as config from '../config';
import { USER_AGENTS } from '../utils/userAgents';
import * as dbUtils from '../utils/dbUtils';

const turndownService = new TurndownService({
  headingStyle: 'atx',
});
turndownService.remove('img');

function convertHtmlToMarkdown(html: string): string {
  if (!html || !html.trim()) return '';
  try {
    const $ = cheerio.load(html);
    $('script, style, nav, footer, header, iframe, noscript').remove();
    const cleanedHtml = $.html();
    let markdown = turndownService.turndown(cleanedHtml);
    
    // Clean up excessive blank lines
    markdown = markdown.split('\n').filter((line, i, arr) => line.trim() !== '' || (i > 0 && arr[i-1].trim() !== '')).join('\n').trim();
    return markdown;
  } catch (error) {
    console.error('Error during HTML to Markdown conversion:', error);
    return '';
  }
}

async function fetchWithRetry(url: string, headers: any): Promise<string | null> {
  for (let attempt = 0; attempt <= config.MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.REQUEST_TIMEOUT);

      const response = await fetch(url, {
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429 && attempt < config.MAX_RETRIES) {
          const waitTime = (config.RETRY_DELAY_SECONDS + Math.random() * 5) * 1000;
          console.warn(`Error 429: Too Many Requests. Retrying attempt ${attempt + 1}/${config.MAX_RETRIES} after ${waitTime / 1000}s...`);
          await new Promise(r => setTimeout(r, waitTime));
          headers['User-Agent'] = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
          continue;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.text();
    } catch (error: any) {
      if (error.name === 'AbortError') {
         console.error(`Error fetching URL ${url}: Request timed out`);
      } else {
         console.error(`Error fetching URL ${url}:`, error.message);
      }
      return null;
    }
  }
  return null;
}

async function fetchLinkedinJobIds(searchQuery: string, location: string): Promise<string[]> {
  const jobIdsList: string[] = [];
  let start = 0;
  const maxStart = config.LINKEDIN_MAX_START;

  console.log(`--- Starting Phase 1: Scraping Job IDs (Max Start: ${maxStart}) ---`);

  while (start <= maxStart) {
    const geoParam = config.LINKEDIN_GEO_ID ? `&geoId=${config.LINKEDIN_GEO_ID}` : '';
    const targetUrl = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(searchQuery)}&location=${encodeURIComponent(location)}${geoParam}&f_TPR=${config.LINKEDIN_JOB_POSTING_DATE}&f_JT=${config.LINKEDIN_JOB_TYPE}&f_WT=${config.LINKEDIN_F_WT}&start=${start}`;

    if (start > 0) {
      const sleepTime = (Math.random() * (15 - 5) + 5) * 1000;
      await new Promise(r => setTimeout(r, sleepTime));
    }

    const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    const headers = { 'User-Agent': userAgent };

    const html = await fetchWithRetry(targetUrl, headers);
    if (!html) break;

    const $ = cheerio.load(html);
    const listings = $('li');
    if (listings.length === 0) break;

    let foundOnPage = 0;
    listings.each((_, el) => {
      const baseCard = $(el).find('.base-card');
      const jobUrn = baseCard.attr('data-entity-urn');
      if (jobUrn && jobUrn.includes('jobPosting:')) {
        const jobId = jobUrn.split(':')[3];
        if (jobId && !jobIdsList.includes(jobId)) {
          jobIdsList.push(jobId);
          foundOnPage++;
        }
      }
    });

    console.log(`Found ${foundOnPage} unique job IDs on this page.`);
    if (foundOnPage === 0) break;
    start += 10;
  }

  return jobIdsList;
}

async function fetchLinkedinJobDetails(jobId: string): Promise<any | null> {
  const jobDetailUrl = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`;
  
  const sleepTime = (Math.random() * (10 - 3) + 3) * 1000;
  await new Promise(r => setTimeout(r, sleepTime));

  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  const headers = { 'User-Agent': userAgent };

  const html = await fetchWithRetry(jobDetailUrl, headers);
  if (!html) return null;

  try {
    const $ = cheerio.load(html);
    const jobDetails: any = { job_id: jobId, provider: 'linkedin' };

    // Company
    const companyImg = $('.top-card-layout__card a img');
    jobDetails.company = companyImg.attr('alt')?.trim() || $('.topcard__org-name-link').text().trim() || $('.topcard__flavor').first().text().trim() || null;

    // Title
    jobDetails.job_title = $('.top-card-layout__entity-info a').first().text().trim() || $('.top-card-layout__title').text().trim() || null;

    // Level
    $('.description__job-criteria-list li').each((_, el) => {
      const header = $(el).find('.description__job-criteria-subheader').text();
      if (header.includes('Seniority level')) {
        jobDetails.level = $(el).find('.description__job-criteria-text').text().trim();
      }
    });

    // Location
    jobDetails.location = $('.topcard__flavor--bullet').text().trim() || $('.topcard__flavor-row .topcard__flavor').text().trim() || null;

    // Description
    const descriptionHtml = $('.show-more-less-html__markup').html();
    if (descriptionHtml) {
      jobDetails.description = convertHtmlToMarkdown(descriptionHtml);
    }

    return jobDetails;
  } catch (error) {
    console.error(`Error processing details for job ID ${jobId}:`, error);
    return null;
  }
}

export async function scrapeLinkedin(searchQuery?: string, location?: string, userId?: string) {
  const queries = searchQuery ? [searchQuery] : config.LINKEDIN_SEARCH_QUERIES;
  const loc = location || config.LINKEDIN_LOCATION;

  for (const query of queries) {
    console.log(`Scraping LinkedIn for: ${query} in ${loc}`);
    const jobIds = await fetchLinkedinJobIds(query, loc);
    const { existingIds, existingCompanyTitleKeys } = await dbUtils.getExistingJobs(userId);

    const newJobIds = jobIds.filter(id => !existingIds.has(id));
    const limit = config.MAX_JOBS_PER_SEARCH['linkedin'];
    const idsToProcess = newJobIds.slice(0, limit);

    console.log(`Identified ${idsToProcess.length} new job IDs to fetch details for.`);

    const detailedJobs = [];
    const seenInRun = new Set<string>();

    for (const jobId of idsToProcess) {
      const details = await fetchLinkedinJobDetails(jobId);
      if (details) {
        const company = details.company?.toLowerCase().trim() || '';
        const title = details.job_title?.toLowerCase().trim() || '';
        const key = `${company}|${title}`;

        if (!seenInRun.has(key) && !existingCompanyTitleKeys.has(key)) {
          detailedJobs.push(details);
          seenInRun.add(key);
        } else {
          console.log(`Skipping duplicate job: ${details.company} - ${details.job_title}`);
        }
      }
    }

    if (detailedJobs.length > 0) {
      await dbUtils.saveJobs(detailedJobs, userId);
    }
  }
}
