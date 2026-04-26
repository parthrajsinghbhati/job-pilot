import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export async function saveFileLocally(fileContent: Buffer, destinationPath: string): Promise<string | null> {
  try {
    const fullPath = path.join(UPLOAD_DIR, destinationPath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, fileContent);
    return destinationPath;
  } catch (error) {
    console.error('Error saving file locally:', error);
    return null;
  }
}

export async function readFileLocally(filePath: string): Promise<Buffer | null> {
  try {
    const fullPath = path.join(UPLOAD_DIR, filePath);
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath);
    }
    return null;
  } catch (error) {
    console.error('Error reading file locally:', error);
    return null;
  }
}

export function getFileUrl(filePath: string): string {
  // In a real app, this would be a public URL
  // For local dev, we might serve it via an express route
  return `/uploads/${filePath}`;
}
