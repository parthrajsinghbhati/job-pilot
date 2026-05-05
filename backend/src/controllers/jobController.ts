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
        console.log(`🤖 BACKGROUND: Scraper starting for user ${user_id}...`);
        await scrapeLinkedin(query, location, user_id);
        console.log('🏁 Scraper done. Starting scoring...');
        const { scoreJobs } = await import('../services/scoreService');
        await scoreJobs();
        console.log('🏁 Scoring done.');
      } catch (err) {
        console.error('💥 Scraper/Scoring crashed:', err);
      }
    })();

    res.json({ message: 'Searching...', user_id, query });
  } catch (error: any) {
    console.error('Error triggering scrape:', error);
    res.status(500).json({ error: error.message });
  }
};

import { primaryClient as llmClient } from '../services/llmService';
import { formatResumeToText } from '../services/scoreService';

export const tailorResume = async (req: Request, res: Response) => {
  const job_id = req.params.job_id;
  const user_id = req.body.user_id || req.query.user_id;

  try {
    const job = await prisma.job.findUnique({ where: { job_id } });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const baseResume = await prisma.baseResume.findFirst({ where: { user_id } });
    if (!baseResume) return res.status(400).json({ error: 'Please upload a base resume first' });

    const resumeText = formatResumeToText(baseResume.resume_data);
    
    const prompt = `
      You are an expert resume writer. Given the candidate's base resume and the job description, tailor the resume to highlight the most relevant skills and experiences for this specific role.
      
      Output ONLY a valid JSON object containing the tailored resume with the following structure:
      {
        "name": "string",
        "email": "string",
        "phone": "string",
        "location": "string",
        "summary": "string",
        "skills": ["string"],
        "experience": [{"job_title": "string", "company": "string", "start_date": "string", "end_date": "string", "location": "string", "description": "string"}],
        "education": [{"degree": "string", "institution": "string", "year": "string"}],
        "projects": [{"name": "string", "description": "string", "url": "string"}]
      }
      Do NOT include any markdown formatting, only the raw JSON string.

      --- BASE RESUME ---
      ${resumeText}
      
      --- JOB DESCRIPTION ---
      Job Title: ${job.job_title}
      Company: ${job.company}
      Level: ${job.level}
      
      ${job.description}
    `;

    const responseText = await llmClient.generateContent(prompt) as string;
    
    // Attempt to parse JSON. Sometimes LLMs wrap it in markdown.
    let tailoredJson;
    try {
      const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      tailoredJson = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse tailored resume JSON:', responseText);
      return res.status(500).json({ error: 'Failed to generate tailored resume structure from AI.' });
    }

    // Save to CustomizedResume
    const customizedResume = await prisma.customizedResume.create({
      data: {
        user_id,
        name: tailoredJson.name || 'N/A',
        email: tailoredJson.email || 'N/A',
        phone: tailoredJson.phone || null,
        location: tailoredJson.location || null,
        summary: tailoredJson.summary || null,
        skills: tailoredJson.skills || [],
        experience: tailoredJson.experience || [],
        education: tailoredJson.education || [],
        projects: tailoredJson.projects || [],
      }
    });

    // Update job with customized resume
    await prisma.job.update({
      where: { job_id },
      data: { customized_resume_id: customizedResume.id }
    });

    res.json({ customizedResume });

  } catch (error: any) {
    console.error('Error tailoring resume:', error);
    res.status(500).json({ error: error.message });
  }
};
