const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { auth, authorize } = require('../middleware/auth');

// Get all cases (with filters)
router.get('/', auth, async (req, res) => {
  try {
    const { status, priority, mediator_id } = req.query;
    let query = `
      SELECT c.*,
             u1.first_name || ' ' || u1.last_name as creator_name,
             u2.first_name || ' ' || u2.last_name as mediator_name
      FROM cases c
      LEFT JOIN users u1 ON c.created_by = u1.id
      LEFT JOIN users u2 ON c.assigned_mediator = u2.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    // Filter by user role
    if (req.user.role === 'client') {
      query += ` AND (c.created_by = $${paramCount} OR c.id IN (
        SELECT case_id FROM case_parties WHERE user_id = $${paramCount}
      ))`;
      params.push(req.user.id);
      paramCount++;
    } else if (req.user.role === 'mediator') {
      query += ` AND c.assigned_mediator = $${paramCount}`;
      params.push(req.user.id);
      paramCount++;
    }

    if (status) {
      query += ` AND c.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (priority) {
      query += ` AND c.priority = $${paramCount}`;
      params.push(priority);
      paramCount++;
    }

    if (mediator_id) {
      query += ` AND c.assigned_mediator = $${paramCount}`;
      params.push(mediator_id);
      paramCount++;
    }

    query += ' ORDER BY c.created_at DESC';

    const result = await db.query(query, params);
    res.json({ cases: result.rows });
  } catch (error) {
    console.error('Get cases error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get case by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const caseResult = await db.query(
      `SELECT c.*,
              u1.first_name || ' ' || u1.last_name as creator_name,
              u1.email as creator_email,
              u2.first_name || ' ' || u2.last_name as mediator_name,
              u2.email as mediator_email
       FROM cases c
       LEFT JOIN users u1 ON c.created_by = u1.id
       LEFT JOIN users u2 ON c.assigned_mediator = u2.id
       WHERE c.id = $1`,
      [id]
    );

    if (caseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Case not found' });
    }

    // Check access
    const caseData = caseResult.rows[0];
    if (req.user.role === 'client') {
      const partyCheck = await db.query(
        'SELECT id FROM case_parties WHERE case_id = $1 AND user_id = $2',
        [id, req.user.id]
      );
      if (caseData.created_by !== req.user.id && partyCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (req.user.role === 'mediator' && caseData.assigned_mediator !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get parties
    const parties = await db.query(
      `SELECT cp.*, u.first_name, u.last_name, u.email, u.phone
       FROM case_parties cp
       LEFT JOIN users u ON cp.user_id = u.id
       WHERE cp.case_id = $1`,
      [id]
    );

    // Get sessions
    const sessions = await db.query(
      'SELECT * FROM sessions WHERE case_id = $1 ORDER BY scheduled_date DESC',
      [id]
    );

    // Get recent activities
    const activities = await db.query(
      `SELECT ca.*, u.first_name || ' ' || u.last_name as user_name
       FROM case_activities ca
       LEFT JOIN users u ON ca.user_id = u.id
       WHERE ca.case_id = $1
       ORDER BY ca.created_at DESC
       LIMIT 20`,
      [id]
    );

    res.json({
      case: caseData,
      parties: parties.rows,
      sessions: sessions.rows,
      activities: activities.rows
    });
  } catch (error) {
    console.error('Get case error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new case
router.post('/',
  auth,
  [
    body('title').trim().notEmpty(),
    body('description').optional().trim(),
    body('category').optional().trim(),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, description, category, priority } = req.body;

      // Generate case number
      const year = new Date().getFullYear();
      const countResult = await db.query(
        'SELECT COUNT(*) as count FROM cases WHERE EXTRACT(YEAR FROM created_at) = $1',
        [year]
      );
      const caseNumber = `MED-${year}-${String(parseInt(countResult.rows[0].count) + 1).padStart(4, '0')}`;

      // Insert case
      const result = await db.query(
        `INSERT INTO cases (case_number, title, description, category, priority, created_by, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending')
         RETURNING *`,
        [caseNumber, title, description, category || null, priority || 'medium', req.user.id]
      );

      const newCase = result.rows[0];

      // Log activity
      await db.query(
        `INSERT INTO case_activities (case_id, user_id, activity_type, description)
         VALUES ($1, $2, 'case_created', $3)`,
        [newCase.id, req.user.id, `Case "${title}" was created`]
      );

      res.status(201).json({
        message: 'Case created successfully',
        case: newCase
      });
    } catch (error) {
      console.error('Create case error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Update case
router.put('/:id',
  auth,
  authorize('admin', 'mediator'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, status, priority, category, assigned_mediator, resolution_summary } = req.body;

      // Check if case exists
      const caseCheck = await db.query('SELECT * FROM cases WHERE id = $1', [id]);
      if (caseCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Case not found' });
      }

      const oldCase = caseCheck.rows[0];

      // Build update query
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (title) {
        updates.push(`title = $${paramCount}`);
        values.push(title);
        paramCount++;
      }
      if (description !== undefined) {
        updates.push(`description = $${paramCount}`);
        values.push(description);
        paramCount++;
      }
      if (status) {
        updates.push(`status = $${paramCount}`);
        values.push(status);
        paramCount++;

        if (status === 'resolved' || status === 'closed') {
          updates.push(`resolution_date = CURRENT_TIMESTAMP`);
        }
      }
      if (priority) {
        updates.push(`priority = $${paramCount}`);
        values.push(priority);
        paramCount++;
      }
      if (category !== undefined) {
        updates.push(`category = $${paramCount}`);
        values.push(category);
        paramCount++;
      }
      if (assigned_mediator !== undefined) {
        updates.push(`assigned_mediator = $${paramCount}`);
        values.push(assigned_mediator);
        paramCount++;
      }
      if (resolution_summary !== undefined) {
        updates.push(`resolution_summary = $${paramCount}`);
        values.push(resolution_summary);
        paramCount++;
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      values.push(id);
      const query = `UPDATE cases SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;

      const result = await db.query(query, values);

      // Log activity
      const changes = [];
      if (status && status !== oldCase.status) {
        changes.push(`Status changed from "${oldCase.status}" to "${status}"`);
      }
      if (assigned_mediator && assigned_mediator !== oldCase.assigned_mediator) {
        changes.push('Mediator assigned');
      }

      if (changes.length > 0) {
        await db.query(
          `INSERT INTO case_activities (case_id, user_id, activity_type, description)
           VALUES ($1, $2, 'case_updated', $3)`,
          [id, req.user.id, changes.join('; ')]
        );
      }

      res.json({
        message: 'Case updated successfully',
        case: result.rows[0]
      });
    } catch (error) {
      console.error('Update case error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Delete case
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query('DELETE FROM cases WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Case not found' });
    }

    res.json({ message: 'Case deleted successfully' });
  } catch (error) {
    console.error('Delete case error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add party to case
router.post('/:id/parties',
  auth,
  authorize('admin', 'mediator'),
  [
    body('user_id').isInt(),
    body('party_type').isIn(['claimant', 'respondent']),
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      const { user_id, party_type, organization, representative } = req.body;

      const result = await db.query(
        `INSERT INTO case_parties (case_id, user_id, party_type, organization, representative)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [id, user_id, party_type, organization || null, representative || null]
      );

      // Log activity
      await db.query(
        `INSERT INTO case_activities (case_id, user_id, activity_type, description)
         VALUES ($1, $2, 'party_added', $3)`,
        [id, req.user.id, `Party added as ${party_type}`]
      );

      res.status(201).json({
        message: 'Party added successfully',
        party: result.rows[0]
      });
    } catch (error) {
      console.error('Add party error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

module.exports = router;
