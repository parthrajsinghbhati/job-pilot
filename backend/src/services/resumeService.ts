const pdfParse = require('pdf-parse');
import fs from 'fs';
import path from 'path';
import { primaryClient } from './llmService';
import { ResumeSchema, ResumeType, SummaryOutputSchema, SkillsOutputSchema, SingleExperienceOutputSchema, SingleProjectOutputSchema } from '../models';
import * as dbUtils from '../utils/dbUtils';
import * as fileUtils from '../utils/fileUtils';
import { createResumePdf } from './pdfService';
import * as config from '../config';

export async function extractTextFromPdf(pdfPath: string): Promise<string> {
  console.log(`Extracting text from: ${pdfPath}`);
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return '';
  }
}

export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting text from PDF buffer:', error);
    return '';
  }
}

export async function parseResumeWithAi(resumeText: string): Promise<ResumeType | null> {
  console.log('Processing resume with AI model...');
  const prompt = `Extract and return the structured resume information from the text below. 
  Only use what is explicitly stated in the text and do not infer or invent any details.
  
  CRITICAL: If any information is missing or not available in the text, use "NA" for that field. 
  This applies to all fields (e.g., summary, dates, location, links, etc.). 
  Do NOT leave fields empty or use empty strings.

  Resume text:
  ${resumeText}
  `;

  try {
    const parsedData = await primaryClient.generateContent(
      prompt,
      'You are a helpful assistant that parses resumes into structured JSON.',
      1,
      ResumeSchema
    ) as ResumeType;
    return parsedData;
  } catch (error) {
    console.error('Failed to parse resume with AI:', error);
    return null;
  }
}

async function personalizeSectionWithLlm(sectionName: string, sectionContent: any, fullResume: ResumeType, jobDetails: any): Promise<any> {
  if (!sectionContent || sectionContent === 'NA') return sectionContent;

  const resumeContext = { ...fullResume };
  // @ts-ignore
  delete resumeContext[sectionName];

  const promptIntro = `
  **Task:** Enhance the specified resume section for the target job application.

  **Target Job**
  - Title: ${jobDetails.job_title}
  - Company: ${jobDetails.company}
  - Seniority Level: ${jobDetails.level}
  - Job Description: ${jobDetails.description}

  ---

  **Full Resume Context (excluding the section being edited):**
  ${JSON.stringify(resumeContext)}

  **Resume Section to Enhance:** ${sectionName}
  `;

  const systemPrompt = `You are an expert resume writer and a precise JSON generation assistant.
  Your primary function is to enhance specified sections of a resume to better align with a target job description, based on the provided resume context and original section content.
  NEVER invent new information, skills, projects, job titles, or responsibilities not explicitly found in the original resume materials.`;

  try {
    if (sectionName === 'summary') {
      const specificInstructions = `
      **Original Content of This Section:**
      ${JSON.stringify(sectionContent)}

      ---
      **Instructions:**
      - Rewrite **only** the summary to be concise, impactful, and highly relevant to the Target Job.
      - **CRITICAL: Preserve core professional identity and experience level.**
      - Highlight 2-3 key qualifications.
      `;
      const res = await primaryClient.generateContent(promptIntro + specificInstructions, systemPrompt, 1, SummaryOutputSchema) as { summary: string };
      return res.summary;
    } else if (sectionName === 'skills') {
      const specificInstructions = `
      **Original Content of This Section:**
      ${JSON.stringify(sectionContent)}

      ---
      **Instructions:**
      - Compile a concise list (5-15 skills) of actual skills mentioned in the resume context that are relevant to the Target Job Description.
      `;
      const res = await primaryClient.generateContent(promptIntro + specificInstructions, systemPrompt, 1, SkillsOutputSchema) as { skills: string[] };
      return res.skills;
    } else if (sectionName === 'experience') {
      const results = [];
      for (const exp of sectionContent) {
        const specificInstructions = `
        **Original Content of This Specific Experience Item:**
        ${JSON.stringify(exp)}

        ---
        **Instructions:**
        - Enhance the 'description' field ONLY. Keep job_title, company, dates unchanged.
        - Integrate relevant skills from the Full Resume Context naturally.
        `;
        const res = await primaryClient.generateContent(promptIntro + specificInstructions, systemPrompt, 1, SingleExperienceOutputSchema) as { experience: any };
        results.push(res.experience);
      }
      return results;
    } else if (sectionName === 'projects') {
      const results = [];
      for (const proj of sectionContent) {
        const specificInstructions = `
        **Original Content of This Specific Project Item:**
        ${JSON.stringify(proj)}

        ---
        **Instructions:**
        - Enhance the 'description' field ONLY. Keep name, technologies unchanged.
        `;
        const res = await primaryClient.generateContent(promptIntro + specificInstructions, systemPrompt, 1, SingleProjectOutputSchema) as { project: any };
        results.push(res.project);
      }
      return results;
    }
  } catch (error) {
    console.error(`Error personalizing section ${sectionName}:`, error);
    return sectionContent; // fallback
  }

  return sectionContent;
}

export async function processJob(jobDetails: any, baseResumeDetails: ResumeType) {
  const jobId = jobDetails.job_id;
  if (!jobId) {
    console.error('Job details missing job_id.');
    return;
  }

  console.log(`--- Starting processing for job_id: ${jobId} ---`);

  try {
    const personalizedResumeData = JSON.parse(JSON.stringify(baseResumeDetails)) as ResumeType;
    
    // Personalize sections sequentially to avoid rate limits
    personalizedResumeData.summary = await personalizeSectionWithLlm('summary', baseResumeDetails.summary, baseResumeDetails, jobDetails);
    await new Promise(r => setTimeout(r, config.LLM_REQUEST_DELAY_SECONDS * 1000));
    
    personalizedResumeData.skills = await personalizeSectionWithLlm('skills', baseResumeDetails.skills, baseResumeDetails, jobDetails);
    await new Promise(r => setTimeout(r, config.LLM_REQUEST_DELAY_SECONDS * 1000));
    
    personalizedResumeData.experience = await personalizeSectionWithLlm('experience', baseResumeDetails.experience, baseResumeDetails, jobDetails);
    await new Promise(r => setTimeout(r, config.LLM_REQUEST_DELAY_SECONDS * 1000));
    
    personalizedResumeData.projects = await personalizeSectionWithLlm('projects', baseResumeDetails.projects, baseResumeDetails, jobDetails);

    // Generate PDF
    console.log(`Generating PDF for job_id: ${jobId}`);
    const pdfBytes = await createResumePdf(personalizedResumeData);

    // Upload PDF
    const destinationPath = `resume_${jobId}.pdf`;
    const resumePath = await fileUtils.saveFileLocally(pdfBytes, destinationPath);

    if (!resumePath) {
      console.error(`Failed to upload resume PDF for job_id: ${jobId}`);
      return;
    }

    // Save to customized resumes table
    const customizedResumeId = await dbUtils.saveCustomizedResume(personalizedResumeData);

    if (customizedResumeId) {
      // Update job record
      await dbUtils.updateJobWithResumeLink(jobId, customizedResumeId);
    }
  } catch (error) {
    console.error(`Error processing job ${jobId}:`, error);
  }
}
