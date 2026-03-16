import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { db } from '../../db/index.js';

const router = Router();

/**
 * Create a new transaction log
 * POST /api/transaction-logs
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const hotelId = req.context?.hotelId || req.user?.hotelId || '';
    const hotelCode = req.context?.hotelCode || req.user?.hotelCode || '';
    const { user } = req;
    const transactionLogsTable = db.transactionLogs;

    const {
      eventType,
      entityType,
      entityId,
      description,
      metadata,
      previousState,
      newState,
    } = req.body;

    if (!eventType || !entityType || !entityId || !description) {
      res.status(400).json({
        success: false,
        error: { message: 'Missing required fields: eventType, entityType, entityId, description' },
      });
      return;
    }

    // Fetch user displayName from users table
    let userName = 'Unknown User';
    if (user) {
      const userRecord = await db.users.getById(user.sub);
      userName = userRecord?.displayName || userRecord?.username || 'Unknown User';
    }

    const transactionLog = {
      id: `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      hotelId,
      hotelCode,
      eventType,
      entityType,
      entityId,
      userId: user?.sub || 'unknown',
      userName,
      timestamp: new Date().toISOString(),
      description,
      metadata: metadata || {},
      previousState: previousState || null,
      newState: newState || null,
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('user-agent') || 'unknown',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await transactionLogsTable.insert(transactionLog);

    res.json({ success: true, data: transactionLog });
  } catch (error) {
    next(error);
  }
});

/**
 * Get all transaction logs with optional filters
 * GET /api/transaction-logs
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const hotelId = req.context?.hotelId || req.user?.hotelId || '';
    const hotelCode = req.context?.hotelCode || req.user?.hotelCode || '';
    const transactionLogsTable = db.transactionLogs;

    const {
      eventType,
      entityType,
      entityId,
      userId,
      startDate,
      endDate,
      limit = '100',
    } = req.query;

    let logs = await transactionLogsTable.getAll();

    // Filter by hotel
    logs = logs.filter((log: any) => log.hotelId === hotelId && log.hotelCode === hotelCode);

    // Apply filters
    if (eventType) {
      logs = logs.filter((log: any) => log.eventType === eventType);
    }
    if (entityType) {
      logs = logs.filter((log: any) => log.entityType === entityType);
    }
    if (entityId) {
      logs = logs.filter((log: any) => log.entityId === entityId);
    }
    if (userId) {
      logs = logs.filter((log: any) => log.userId === userId);
    }
    if (startDate) {
      logs = logs.filter((log: any) => log.timestamp >= startDate);
    }
    if (endDate) {
      logs = logs.filter((log: any) => log.timestamp <= endDate);
    }

    // Sort by timestamp descending (newest first)
    logs.sort((a: any, b: any) => b.timestamp.localeCompare(a.timestamp));

    // Apply limit
    const limitNum = parseInt(limit as string, 10);
    if (limitNum > 0) {
      logs = logs.slice(0, limitNum);
    }

    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
});

/**
 * Get transaction log by ID
 * GET /api/transaction-logs/:id
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const hotelId = req.context?.hotelId || req.user?.hotelId || '';
    const { id } = req.params;
    const transactionLogsTable = db.transactionLogs;

    const log = await transactionLogsTable.getById(id);

    if (!log) {
      res.status(404).json({
        success: false,
        error: { message: 'Transaction log not found' },
      });
      return;
    }

    if (log.hotelId !== hotelId) {
      res.status(403).json({
        success: false,
        error: { message: 'Access denied' },
      });
      return;
    }

    res.json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
});

/**
 * Get transaction logs by entity
 * GET /api/transaction-logs/entity
 */
router.get('/entity/logs', authenticate, async (req, res, next) => {
  try {
    const hotelId = req.context?.hotelId || req.user?.hotelId || '';
    const hotelCode = req.context?.hotelCode || req.user?.hotelCode || '';
    const { entityType, entityId } = req.query;
    const transactionLogsTable = db.transactionLogs;

    if (!entityType || !entityId) {
      res.status(400).json({
        success: false,
        error: { message: 'Missing required parameters: entityType, entityId' },
      });
      return;
    }

    let logs = await transactionLogsTable.getAll();
    logs = logs.filter(
      (log: any) =>
        log.hotelId === hotelId &&
        log.hotelCode === hotelCode &&
        log.entityType === entityType &&
        log.entityId === entityId
    );

    logs.sort((a: any, b: any) => b.timestamp.localeCompare(a.timestamp));

    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
});

/**
 * Get audit trail for a specific entity
 * GET /api/transaction-logs/audit-trail/:entityId
 */
router.get('/audit-trail/:entityId', authenticate, async (req, res, next) => {
  try {
    const hotelId = req.context?.hotelId || req.user?.hotelId || '';
    const hotelCode = req.context?.hotelCode || req.user?.hotelCode || '';
    const { entityId } = req.params;
    const transactionLogsTable = db.transactionLogs;

    let logs = await transactionLogsTable.getAll();
    logs = logs.filter(
      (log: any) =>
        log.hotelId === hotelId &&
        log.hotelCode === hotelCode &&
        log.entityId === entityId
    );

    logs.sort((a: any, b: any) => a.timestamp.localeCompare(b.timestamp));

    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
});

export default router;
