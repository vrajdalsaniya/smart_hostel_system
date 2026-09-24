import { Router } from 'express';
import {
  listPlans,
  createPlan,
  updatePlan,
  deletePlan,
  listSubscriptions,
  getActiveSubscription,
  subscribePlan,
  updateSubscriptionStatus,
  updateRegisteredDevice,
  regenerateVoucher,
  getHotspots,
  getWifiStats
} from '../controllers/wifiController.js';
import { allowRoles, authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// Plans
router.get('/plans', listPlans);
router.post('/plans', allowRoles('admin'), createPlan);
router.put('/plans/:id', allowRoles('admin'), updatePlan);
router.delete('/plans/:id', allowRoles('admin'), deletePlan);

// Subscriptions
router.get('/subscriptions', listSubscriptions);
router.get('/active', getActiveSubscription);
router.post('/subscribe', subscribePlan);
router.put('/subscriptions/:id/status', allowRoles('admin'), updateSubscriptionStatus);
router.put('/subscriptions/:id/device', updateRegisteredDevice);
router.post('/subscriptions/:id/regenerate-voucher', regenerateVoucher);

// Hotspots & Stats
router.get('/hotspots', getHotspots);
router.get('/stats', allowRoles('admin'), getWifiStats);

export default router;
