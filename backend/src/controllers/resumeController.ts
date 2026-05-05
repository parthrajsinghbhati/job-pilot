import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { primaryClient as llmClient } from '../services/llmService';
import { z } from 'zod';
const pdfParse = require('pdf-parse');

const ResumeSchema = z.object({
  name: z.string().default('N/A'),
  email: z.string().default('N/A'),
  phone: z.string().default('N/A'),
  location: z.string().default('N/A'),
  summary: z.string().default('N/A'),
  skills: z.array(z.string()).default([]),
  experience: z.array(z.object({
    job_title: z.string().default('N/A'),
    company: z.string().default('N/A'),
    start_date: z.string().default('N/A'),
    end_date: z.string().default('N/A'),
    location: z.string().default('N/A'),
    description: z.string().default('N/A')
  })).default([]),
  education: z.array(z.object({
    degree: z.string().default('N/A'),
    institution: z.string().default('N/A'),
    year: z.string().default('N/A')
  })).default([]),
  projects: z.array(z.object({
    name: z.string().default('N/A'),
    description: z.string().default('N/A'),
    url: z.string().default('N/A')
  })).default([])
});

export const getBaseResume = async (req: Request, res: Response) => {
  const user_id = req.params.user_id;
  try {
    const baseResume = await prisma.baseResume.findFirst({
      where: { user_id }
    });
    res.json({ baseResume });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateBaseResume = async (req: Request, res: Response) => {
  const { user_id, resume_data } = req.body;
  
  try {
    const existing = await prisma.baseResume.findFirst({
      where: { user_id }
    });

    let baseResume;
    if (existing) {
      baseResume = await prisma.baseResume.update({
        where: { id: existing.id },
        data: { resume_data }
      });
    } else {
      baseResume = await prisma.baseResume.create({
        data: {
          user_id,
          resume_data
        }
      });
    }

    res.json({ baseResume });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const uploadAndParseResume = async (req: Request, res: Response) => {
  const { user_id, fileBase64 } = req.body;

  if (!user_id || !fileBase64) {
    console.error('❌ Missing user_id or fileBase64');
    return res.status(400).json({ error: 'user_id and fileBase64 are required' });
  }

  try {
    console.log(`📄 Starting PDF parsing for user: ${user_id}`);
    // 1. Extract text from PDF
    const buffer = Buffer.from(fileBase64, 'base64');
    console.log(`📦 Buffer created, size: ${buffer.length} bytes`);
    
    const { PDFParse } = require('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const rawText = result.text;
    console.log(`📝 Extracted text length: ${rawText?.length || 0}`);

    if (!rawText || rawText.trim().length === 0) {
      console.error('❌ PDF extraction returned no text');
      return res.status(400).json({ error: 'Could not extract text from PDF' });
    }

    // 2. Use LLM to structure the resume
    console.log('🤖 Sending text to LLM for structuring...');
    const prompt = `
      Extract the professional information from the following raw resume text and return it as a structured JSON object.
      
      --- RAW RESUME TEXT ---
      ${rawText}
    `;

    const structuredData = await llmClient.generateContent(
      prompt,
      'You are a professional resume parser. Extract information into the requested JSON format.',
      0.1, // Low temperature for consistency
      ResumeSchema
    );
    console.log('✅ LLM structured data received');

    // 3. Save or update BaseResume
    const existing = await prisma.baseResume.findFirst({
      where: { user_id }
    });

    let baseResume;
    if (existing) {
      baseResume = await prisma.baseResume.update({
        where: { id: existing.id },
        data: { resume_data: structuredData as any }
      });
    } else {
      baseResume = await prisma.baseResume.create({
        data: {
          user_id,
          resume_data: structuredData as any
        }
      });
    }

    res.json({ baseResume, structuredData });
  } catch (error: any) {
    console.error('❌ Error parsing PDF resume:', error);
    res.status(500).json({ error: error.message || 'Unknown error during resume parsing' });
  }
};
