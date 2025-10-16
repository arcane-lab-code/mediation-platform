const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { auth, authorize } = require('../middleware/auth');

// Get sessions for a case
router.get('/case/:caseId', auth, async (req, res) => {
  try {
    const { caseId } = req.params;

    const result = await db.query(
      `SELECT s.*,
              (SELECT json_agg(json_build_object(
                'id', sp.id,
                'user_id', sp.user_id,
                'name', u.first_name || ' ' || u.last_name,
                'attendance_status', sp.attendance_status
              ))
              FROM session_participants sp
              LEFT JOIN users u ON sp.user_id = u.id
              WHERE sp.session_id = s.id) as participants
       FROM sessions s
       WHERE s.case_id = $1
       ORDER BY s.scheduled_date DESC`,
      [caseId]
    );

    res.json({ sessions: result.rows });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create session
router.post('/',
  auth,
  authorize('admin', 'mediator'),
  [
    body('case_id').isInt(),
    body('title').trim().notEmpty(),
    body('scheduled_date').isISO8601(),
    body('duration_minutes').optional().isInt({ min: 15 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        case_id,
        title,
        description,
        scheduled_date,
        duration_minutes,
        location,
        meeting_link
      } = req.body;

      // Get next session number
      const countResult = await db.query(
        'SELECT COUNT(*) as count FROM sessions WHERE case_id = $1',
        [case_id]
      );
      const sessionNumber = parseInt(countResult.rows[0].count) + 1;

      // Insert session
      const result = await db.query(
        `INSERT INTO sessions (case_id, session_number, title, description, scheduled_date, duration_minutes, location, meeting_link)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          case_id,
          sessionNumber,
          title,
          description || null,
          scheduled_date,
          duration_minutes || 60,
          location || 'Online',
          meeting_link || null
        ]
      );

      // Log activity
      await db.query(
        `INSERT INTO case_activities (case_id, user_id, activity_type, description)
         VALUES ($1, $2, 'session_scheduled', $3)`,
        [case_id, req.user.id, `Session "${title}" scheduled for ${scheduled_date}`]
      );

      res.status(201).json({
        message: 'Session created successfully',
        session: result.rows[0]
      });
    } catch (error) {
      console.error('Create session error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Update session
router.put('/:id',
  auth,
  authorize('admin', 'mediator'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        title,
        description,
        scheduled_date,
        duration_minutes,
        status,
        location,
        meeting_link,
        notes
      } = req.body;

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
      if (scheduled_date) {
        updates.push(`scheduled_date = $${paramCount}`);
        values.push(scheduled_date);
        paramCount++;
      }
      if (duration_minutes) {
        updates.push(`duration_minutes = $${paramCount}`);
        values.push(duration_minutes);
        paramCount++;
      }
      if (status) {
        updates.push(`status = $${paramCount}`);
        values.push(status);
        paramCount++;

        if (status === 'completed') {
          updates.push(`completed_at = CURRENT_TIMESTAMP`);
        }
      }
      if (location !== undefined) {
        updates.push(`location = $${paramCount}`);
        values.push(location);
        paramCount++;
      }
      if (meeting_link !== undefined) {
        updates.push(`meeting_link = $${paramCount}`);
        values.push(meeting_link);
        paramCount++;
      }
      if (notes !== undefined) {
        updates.push(`notes = $${paramCount}`);
        values.push(notes);
        paramCount++;
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      values.push(id);
      const query = `UPDATE sessions SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;

      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Session not found' });
      }

      res.json({
        message: 'Session updated successfully',
        session: result.rows[0]
      });
    } catch (error) {
      console.error('Update session error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Add participant to session
router.post('/:id/participants',
  auth,
  authorize('admin', 'mediator'),
  [body('user_id').isInt()],
  async (req, res) => {
    try {
      const { id } = req.params;
      const { user_id } = req.body;

      const result = await db.query(
        `INSERT INTO session_participants (session_id, user_id, attendance_status)
         VALUES ($1, $2, 'invited')
         RETURNING *`,
        [id, user_id]
      );

      res.status(201).json({
        message: 'Participant added successfully',
        participant: result.rows[0]
      });
    } catch (error) {
      console.error('Add participant error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

module.exports = router;
