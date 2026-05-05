import express from 'express';
import cors from 'cors';
import path from 'path';
import routes from './routes';
import authRoutes from './routes/authRoutes';
import * as config from './config';
import { markExpiredJobs, checkJobActivity, deleteOldInactiveJobs } from './services/jobManagerService';
import { scoreJobs } from './services/scoreService';

const app = express();
const port = process.env.PORT || 8000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/auth', authRoutes);
app.use('/', routes);

app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Optional: Set up periodic background tasks
// Run job management every 24 hours
setInterval(async () => {
  console.log('Running scheduled job management tasks...');
  try {
    await markExpiredJobs();
    await checkJobActivity();
    await deleteOldInactiveJobs();
  } catch (err) {
    console.error('Error in scheduled job management:', err);
  }
}, 24 * 60 * 60 * 1000);

// Run job scoring every hour
setInterval(async () => {
  console.log('Running scheduled job scoring task...');
  try {
    await scoreJobs();
  } catch (err) {
    console.error('Error in scheduled job scoring:', err);
  }
}, 60 * 60 * 1000);
