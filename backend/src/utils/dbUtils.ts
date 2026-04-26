import { prisma } from '../lib/prisma';

export async function getExistingJobs(userId?: string): Promise<{ existingIds: Set<string>; existingCompanyTitleKeys: Set<string> }> {
  const existingIds = new Set<string>();
  const existingCompanyTitleKeys = new Set<string>();

  try {
    const whereClause = userId ? { user_id: userId } : {};
    const jobs = await prisma.job.findMany({
      where: whereClause,
      select: {
        job_id: true,
        company: true,
        job_title: true,
      }
    });

    for (const item of jobs) {
      if (item.job_id) {
        existingIds.add(String(item.job_id));
      }
      if (item.company && item.job_title) {
        const normalizedCompany = String(item.company).trim().toLowerCase();
        const normalizedTitle = String(item.job_title).trim().toLowerCase();
        existingCompanyTitleKeys.add(`${normalizedCompany}|${normalizedTitle}`);
      }
    }
  } catch (error) {
    console.error('Error fetching existing jobs from Prisma:', error);
  }

  return { existingIds, existingCompanyTitleKeys };
}

export async function saveJobs(jobsData: any[], userId?: string): Promise<void> {
  if (!jobsData || jobsData.length === 0) return;

  try {
    for (const job of jobsData) {
      if (job.job_id) {
        await prisma.job.upsert({
          where: { job_id: job.job_id },
          update: { ...job, user_id: userId },
          create: { ...job, user_id: userId },
        });
      }
    }
  } catch (error) {
    console.error('Error upserting jobs:', error);
  }
}

export async function updateJobScore(jobId: string, score: number, stage: 'initial' | 'custom' = 'initial'): Promise<void> {
  try {
    await prisma.job.update({
      where: { job_id: jobId },
      data: {
        resume_score: score,
        resume_score_stage: stage,
      }
    });
  } catch (error) {
    console.error(`Error updating job score ${jobId}:`, error);
  }
}

export async function saveCustomizedResume(resumeData: any, userId?: string): Promise<string | null> {
  try {
    const res = await prisma.customizedResume.create({
      data: {
        name: resumeData.name,
        email: resumeData.email,
        phone: resumeData.phone,
        location: resumeData.location,
        summary: resumeData.summary,
        skills: resumeData.skills,
        education: resumeData.education,
        experience: resumeData.experience,
        projects: resumeData.projects,
        certifications: resumeData.certifications,
        languages: resumeData.languages,
        links: resumeData.links,
        user_id: userId,
      }
    });
    return res.id;
  } catch (error) {
    console.error('Error saving customized resume:', error);
    return null;
  }
}

export async function saveBaseResume(resumeData: any, userId: string): Promise<void> {
  try {
    const existing = await prisma.baseResume.findFirst({
      where: { user_id: userId }
    });

    if (existing) {
      await prisma.baseResume.update({
        where: { id: existing.id },
        data: {
          resume_data: resumeData,
          updated_at: new Date(),
        }
      });
    } else {
      await prisma.baseResume.create({
        data: {
          resume_data: resumeData,
          user_id: userId,
        }
      });
    }
  } catch (error) {
    console.error('Error saving base resume:', error);
  }
}

export async function getBaseResume(userId: string): Promise<any | null> {
  try {
    const res = await prisma.baseResume.findFirst({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    });
    return res ? res.resume_data : null;
  } catch (error) {
    console.error('Error fetching base resume:', error);
    return null;
  }
}

export async function updateAgentStatus(userId: string, status: string): Promise<void> {
  try {
    await prisma.userPreference.upsert({
      where: { user_id: userId },
      update: { agent_status: status },
      create: {
        user_id: userId,
        agent_status: status,
      }
    });
  } catch (error) {
    console.error('Error updating agent status:', error);
  }
}

export async function getUserPreferences(userId: string): Promise<any | null> {
  try {
    return await prisma.userPreference.findUnique({
      where: { user_id: userId }
    });
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return null;
  }
}
