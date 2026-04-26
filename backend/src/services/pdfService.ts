import puppeteer from 'puppeteer';
import { ResumeType } from '../models';

export async function createResumePdf(resumeData: ResumeType): Promise<Buffer> {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  const getSkillsHtml = () => {
    if (!resumeData.skills || resumeData.skills.length === 0 || resumeData.skills[0] === 'NA') return '';
    return `
      <div class="section">
        <h2>SKILLS</h2>
        <div class="divider"></div>
        <ul class="skills-grid">
          ${resumeData.skills.map(s => `<li>${s}</li>`).join('')}
        </ul>
      </div>
    `;
  };

  const getExperienceHtml = () => {
    if (!resumeData.experience || resumeData.experience.length === 0) return '';
    return `
      <div class="section">
        <h2>PROFESSIONAL EXPERIENCE</h2>
        <div class="divider"></div>
        ${resumeData.experience.map(exp => `
          <div class="item">
            <div class="item-header">
              <div class="title">${exp.job_title !== 'NA' ? exp.job_title : ''}</div>
              <div class="date">${(exp.start_date !== 'NA' ? exp.start_date : '')} - ${(exp.end_date !== 'NA' ? exp.end_date : 'Present')}</div>
            </div>
            <div class="subtitle">${exp.company !== 'NA' ? exp.company : ''} ${exp.location !== 'NA' ? '| ' + exp.location : ''}</div>
            <ul class="bullets">
              ${exp.description !== 'NA' ? exp.description.split('.').filter(s => s.trim().length > 0).map(s => `<li>${s.trim()}.</li>`).join('') : ''}
            </ul>
          </div>
        `).join('')}
      </div>
    `;
  };

  const getProjectsHtml = () => {
    if (!resumeData.projects || resumeData.projects.length === 0) return '';
    return `
      <div class="section">
        <h2>PROJECTS</h2>
        <div class="divider"></div>
        ${resumeData.projects.map(proj => `
          <div class="item">
            <div class="item-header">
              <div class="title">${proj.name !== 'NA' ? proj.name : ''}</div>
            </div>
            <ul class="bullets">
              ${proj.description !== 'NA' ? proj.description.split('.').filter(s => s.trim().length > 0).map(s => `<li>${s.trim()}.</li>`).join('') : ''}
            </ul>
            ${proj.technologies && proj.technologies.length > 0 && proj.technologies[0] !== 'NA' ? `<div class="tech"><i>Technologies:</i> ${proj.technologies.join(', ')}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  };

  const getEducationHtml = () => {
    if (!resumeData.education || resumeData.education.length === 0) return '';
    return `
      <div class="section">
        <h2>EDUCATION</h2>
        <div class="divider"></div>
        ${resumeData.education.map(edu => `
          <div class="item">
            <div class="item-header">
              <div class="title">${edu.degree !== 'NA' ? edu.degree : ''} ${edu.field_of_study !== 'NA' ? ', ' + edu.field_of_study : ''}</div>
              <div class="date">${edu.start_year !== 'NA' ? edu.start_year : ''} - ${edu.end_year !== 'NA' ? edu.end_year : ''}</div>
            </div>
            <div class="subtitle">${edu.institution !== 'NA' ? edu.institution : ''}</div>
          </div>
        `).join('')}
      </div>
    `;
  };

  const getLinksHtml = () => {
    const parts = [];
    if (resumeData.links?.linkedin && resumeData.links.linkedin !== 'NA') parts.push(`<a href="${resumeData.links.linkedin}">LinkedIn</a>`);
    if (resumeData.links?.github && resumeData.links.github !== 'NA') parts.push(`<a href="${resumeData.links.github}">GitHub</a>`);
    if (resumeData.links?.portfolio && resumeData.links.portfolio !== 'NA') parts.push(`<a href="${resumeData.links.portfolio}">Portfolio</a>`);
    return parts.join(' | ');
  };

  const getContactHtml = () => {
    const parts = [];
    if (resumeData.email && resumeData.email !== 'NA') parts.push(resumeData.email);
    if (resumeData.phone && resumeData.phone !== 'NA') parts.push(resumeData.phone);
    if (resumeData.location && resumeData.location !== 'NA') parts.push(resumeData.location);
    return parts.join(' | ');
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Helvetica', Arial, sans-serif; font-size: 11px; line-height: 1.4; color: #212121; margin: 0; padding: 40px; }
        .header { text-align: left; margin-bottom: 20px; }
        .name { font-size: 26px; font-weight: bold; color: #1976D2; margin-bottom: 5px; text-transform: uppercase; }
        .contact { font-size: 10px; color: #455A64; margin-bottom: 5px; }
        .links a { color: #1976D2; text-decoration: none; border-bottom: 1px solid #1976D2; }
        .section { margin-bottom: 15px; }
        h2 { font-size: 13px; font-weight: bold; color: #1976D2; margin: 0 0 2px 0; text-transform: uppercase; }
        .divider { border-bottom: 1px solid #2C3E50; margin-bottom: 8px; }
        .skills-grid { display: grid; grid-template-columns: repeat(3, 1fr); list-style-type: disc; padding-left: 20px; margin: 0; }
        .item { margin-bottom: 12px; }
        .item-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .title { font-size: 12px; font-weight: bold; color: #1976D2; }
        .date { font-size: 10px; font-style: italic; color: #757575; text-align: right; }
        .subtitle { font-size: 11px; font-weight: bold; color: #455A64; margin-bottom: 4px; }
        .bullets { margin: 0; padding-left: 20px; }
        .bullets li { margin-bottom: 3px; }
        .tech { font-size: 10px; color: #757575; margin-top: 4px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="name">${resumeData.name || ''}</div>
        <div class="contact">${getContactHtml()}</div>
        <div class="contact links">${getLinksHtml()}</div>
      </div>
      
      ${resumeData.summary && resumeData.summary !== 'NA' ? `
        <div class="section">
          <h2>PROFESSIONAL SUMMARY</h2>
          <div class="divider"></div>
          <p style="margin: 0;">${resumeData.summary}</p>
        </div>
      ` : ''}

      ${getSkillsHtml()}
      ${getExperienceHtml()}
      ${getEducationHtml()}
      ${getProjectsHtml()}

    </body>
    </html>
  `;

  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  
  const pdfBuffer = await page.pdf({
    format: 'Letter',
    printBackground: true,
    margin: { top: '0.6in', bottom: '0.6in', left: '0.6in', right: '0.6in' }
  });

  await browser.close();
  return Buffer.from(pdfBuffer);
}
