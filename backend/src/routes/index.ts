import { Router } from 'express';
import * as jobController from '../controllers/jobController';
import * as preferencesController from '../controllers/preferencesController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.get('/health', jobController.getHealth);
router.get('/jobs/:user_id', authenticate, jobController.getJobs);
router.post('/scrape', authenticate, jobController.triggerScrape);

router.get('/preferences/:user_id', authenticate, preferencesController.getPreferences);
router.post('/preferences', authenticate, preferencesController.updatePreferences);

export default router;
