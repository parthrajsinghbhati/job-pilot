import { Router } from 'express';
import * as jobController from '../controllers/jobController';
import * as preferencesController from '../controllers/preferencesController';
import * as resumeController from '../controllers/resumeController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.get('/health', jobController.getHealth);
router.get('/jobs/:user_id', authenticate, jobController.getJobs);
router.post('/jobs/:job_id/tailor', authenticate, jobController.tailorResume);
router.post('/scrape', authenticate, jobController.triggerScrape);

router.get('/preferences/:user_id', authenticate, preferencesController.getPreferences);
router.post('/preferences', authenticate, preferencesController.updatePreferences);

router.get('/resume/:user_id', authenticate, resumeController.getBaseResume);
router.post('/resume', authenticate, resumeController.updateBaseResume);
router.post('/resume/parse', authenticate, resumeController.uploadAndParseResume);

export default router;
