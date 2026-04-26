import { z } from 'zod';

export const EducationSchema = z.object({
  degree: z.string().default(''),
  field_of_study: z.string().default(''),
  institution: z.string().default(''),
  start_year: z.string().default(''),
  end_year: z.string().default(''),
});

export const ExperienceSchema = z.object({
  job_title: z.string().default(''),
  company: z.string().default(''),
  location: z.string().default(''),
  start_date: z.string().default(''),
  end_date: z.string().default(''),
  description: z.string().default(''),
});

export const ProjectSchema = z.object({
  name: z.string().default(''),
  description: z.string().default(''),
  technologies: z.array(z.string()).default([]),
});

export const CertificationSchema = z.object({
  name: z.string().default(''),
  issuer: z.string().default(''),
  year: z.string().default(''),
});

export const LinksSchema = z.object({
  linkedin: z.string().default(''),
  github: z.string().default(''),
  portfolio: z.string().default(''),
});

export const ResumeSchema = z.object({
  name: z.string().default(''),
  email: z.string().default(''),
  phone: z.string().default(''),
  location: z.string().default(''),
  summary: z.string().default(''),
  skills: z.array(z.string()).default([]),
  education: z.array(EducationSchema).default([]),
  experience: z.array(ExperienceSchema).default([]),
  projects: z.array(ProjectSchema).default([]),
  certifications: z.array(CertificationSchema).default([]),
  languages: z.array(z.string()).default([]),
  links: LinksSchema.default({ linkedin: '', github: '', portfolio: '' }),
});

export type ResumeType = z.infer<typeof ResumeSchema>;

// --- Zod schemas for LLM structured output ---
export const SummaryOutputSchema = z.object({
  summary: z.string(),
});

export const SkillsOutputSchema = z.object({
  skills: z.array(z.string()),
});

export const ExperienceListOutputSchema = z.object({
  experience: z.array(ExperienceSchema),
});

export const SingleExperienceOutputSchema = z.object({
  experience: ExperienceSchema,
});

export const ProjectListOutputSchema = z.object({
  projects: z.array(ProjectSchema),
});

export const SingleProjectOutputSchema = z.object({
  project: ProjectSchema,
});

export const ValidationResponseSchema = z.object({
  is_valid: z.boolean(),
  reason: z.string(),
});
