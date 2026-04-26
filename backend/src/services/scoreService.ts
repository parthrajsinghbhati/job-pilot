import * as config from '../config';
import { prisma } from '../lib/prisma';
import { primaryClient as llmClient } from './llmService';
const pdfParse = require('pdf-parse');
import axios from 'axios';

function formatResumeToText(resumeData: any): string {
  if (!resumeData) return 'Resume data is not available.';
  
  // If it's a Prisma object with separate fields, we use them
  // If it's a nested JSON object (like in base_resume), we use those
  const name = resumeData.name || 'N/A';
  const email = resumeData.email || 'N/A';
  const phone = resumeData.phone || '';
  const location = resumeData.location || '';
  const summary = resumeData.summary || '';
  const skills = Array.isArray(resumeData.skills) ? resumeData.skills.join(', ') : (resumeData.skills || '');
  const experience = Array.isArray(resumeData.experience) ? resumeData.experience : [];

  const lines: string[] = [];
  lines.push(`Name: ${name}`);
  lines.push(`Email: ${email}`);
  if (phone) lines.push(`Phone: ${phone}`);
  if (location) lines.push(`Location: ${location}`);
  
  lines.push('\n---\n');
  if (summary) {
    lines.push('Summary:');
    lines.push(summary);
    lines.push('\n---\n');
  }

  if (skills) {
    lines.push('Skills:');
    lines.push(skills);
    lines.push('\n---\n');
  }

  if (experience.length > 0) {
    lines.push('Experience:');
    experience.forEach((exp: any) => {
      lines.push(`\n* ${exp.job_title || 'N/A'} at ${exp.company || 'N/A'}`);
      if (exp.location) lines.push(`  Location: ${exp.location}`);
      lines.push(`  Dates: ${exp.start_date || '?'} - ${exp.end_date || 'Present'}`);
      if (exp.description) {
        lines.push('  Description:');
        exp.description.split('\n').forEach((line: string) => {
          if (line.trim()) lines.push(`    - ${line.trim()}`);
        });
      }
    });
    lines.push('\n---\n');
  }

  return lines.join('\n');
}

async function getResumeScoreFromAi(resumeText: string, jobDetails: any): Promise<number | null> {
  if (!resumeText || !jobDetails?.description) return null;

  const prompt = `
    You are a scoring assistant. You will be given a resume and a job description.  
    Based **only** on the information provided, **return exactly one integer between 0 and 100** (inclusive) that represents the candidate’s suitability for the role.  
    Do **not** return any words, punctuation, or explanation—only the integer.

    --- RESUME ---
    ${resumeText}
    --- END RESUME ---

    --- JOB DESCRIPTION ---
    Job Title: ${jobDetails.job_title || 'N/A'}
    Company: ${jobDetails.company || 'N/A'}
    Level: ${jobDetails.level || 'N/A'}

    ${jobDetails.description}
    --- END JOB DESCRIPTION ---

    Score (0–100):
  `;

  try {
    const response = await llmClient.generateContent(prompt) as string;
    const score = parseInt(response.trim(), 10);
    return !isNaN(score) && score >= 0 && score <= 100 ? score : null;
  } catch (error) {
    console.error('Error getting resume score from AI:', error);
    return null;
  }
}

async function extractTextFromPdfUrl(pdfUrl: string): Promise<string | null> {
  try {
    const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
    const data = await pdfParse(Buffer.from(response.data));
    return data.text || null;
  } catch (error) {
    console.error('Error extracting text from PDF URL:', error);
    return null;
  }
}

export async function scoreJobs() {
  console.log('--- Starting Job Scoring ---');
  
  // Phase 1: Initial Scoring
  const baseResume = await prisma.baseResume.findFirst({
    where: { user_id: undefined } // Or whatever identifies the base resume
  });
  
  if (baseResume) {
    const resumeText = formatResumeToText(baseResume.resume_data);
    const jobsToScore = await prisma.job.findMany({
      where: {
        resume_score: null,
      },
      take: config.JOBS_TO_SCORE_PER_RUN,
    });

    if (jobsToScore) {
      for (const job of jobsToScore) {
        const score = await getResumeScoreFromAi(resumeText, job);
        if (score !== null) {
          await prisma.job.update({
            where: { job_id: job.job_id },
            data: { 
              resume_score: score, 
              resume_score_stage: 'initial' 
            }
          });
        }
      }
    }
  }

  // Phase 2: Rescoring with Custom Resumes
  const jobsToRescore = await prisma.job.findMany({
    where: {
      customized_resume_id: { not: null },
      resume_score_stage: 'initial',
    },
    take: config.JOBS_TO_SCORE_PER_RUN,
  });

  if (jobsToRescore) {
    for (const job of jobsToRescore) {
      if (!job.customized_resume_id) continue;
      const customResume = await prisma.customizedResume.findUnique({
        where: { id: job.customized_resume_id }
      });
      
      let customResumeText = null;
      if (customResume) {
        customResumeText = formatResumeToText(customResume);
      }

      if (customResumeText) {
        const score = await getResumeScoreFromAi(customResumeText, job);
        if (score !== null) {
          await prisma.job.update({
            where: { job_id: job.job_id },
            data: { 
              resume_score: score, 
              resume_score_stage: 'custom' 
            }
          });
        }
      }
    }
  }
  console.log('--- Job Scoring Finished ---');
}
