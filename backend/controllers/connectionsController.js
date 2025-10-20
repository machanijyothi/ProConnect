const db = require('../config/database');

// Get user connections (accepted)
exports.getUserConnections = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const [connections] = await db.query(
      `SELECT u.USER_ID, u.F_NAME, u.L_NAME, u.HEADLINE, 
       u.PROFILE_PIC_URL, u.CITY, u.COUNTRY, c.ACCEPTED_AT
       FROM CONNECTIONS c
       JOIN USERS u ON (c.RECEIVER_ID = u.USER_ID OR c.REQUEST_ID = u.USER_ID)
       WHERE (c.REQUEST_ID = ? OR c.RECEIVER_ID = ?)
       AND c.STATUS = 'accepted'
       AND u.USER_ID != ?
       ORDER BY c.ACCEPTED_AT DESC`,
      [userId, userId, userId]
    );
    
    res.json(connections);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get pending connection requests (received)
exports.getPendingRequests = async (req, res) => {
  try {
    const userId = req.userId;
    
    const [requests] = await db.query(
      `SELECT c.CONNECTION_ID, c.REQUESTED_AT, 
       u.USER_ID, u.F_NAME, u.L_NAME, u.HEADLINE, 
       u.PROFILE_PIC_URL
       FROM CONNECTIONS c
       JOIN USERS u ON c.REQUEST_ID = u.USER_ID
       WHERE c.RECEIVER_ID = ? AND c.STATUS = 'pending'
       ORDER BY c.REQUESTED_AT DESC`,
      [userId]
    );
    
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get sent connection requests
exports.getSentRequests = async (req, res) => {
  try {
    const userId = req.userId;
    
    const [requests] = await db.query(
      `SELECT c.CONNECTION_ID, c.REQUESTED_AT, 
       u.USER_ID, u.F_NAME, u.L_NAME, u.HEADLINE, 
       u.PROFILE_PIC_URL
       FROM CONNECTIONS c
       JOIN USERS u ON c.RECEIVER_ID = u.USER_ID
       WHERE c.REQUEST_ID = ? AND c.STATUS = 'pending'
       ORDER BY c.REQUESTED_AT DESC`,
      [userId]
    );
    
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Check connection status between two users
exports.getConnectionStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.userId;
    
    const [connections] = await db.query(
      `SELECT STATUS FROM CONNECTIONS 
       WHERE (REQUEST_ID = ? AND RECEIVER_ID = ?)
       OR (REQUEST_ID = ? AND RECEIVER_ID = ?)`,
      [currentUserId, userId, userId, currentUserId]
    );
    
    if (connections.length === 0) {
      return res.json({ status: 'not_connected' });
    }
    
    res.json({ status: connections[0].STATUS });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Send connection request
exports.sendConnectionRequest = async (req, res) => {
  try {
    const { receiverId } = req.body;
    const requesterId = req.userId;
    
    // Check if connection already exists
    const [existing] = await db.query(
      `SELECT * FROM CONNECTIONS 
       WHERE (REQUEST_ID = ? AND RECEIVER_ID = ?)
       OR (REQUEST_ID = ? AND RECEIVER_ID = ?)`,
      [requesterId, receiverId, receiverId, requesterId]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ 
        error: 'Connection request already exists' 
      });
    }
    
    const [result] = await db.query(
      'INSERT INTO CONNECTIONS (REQUEST_ID, RECEIVER_ID, STATUS) VALUES (?, ?, ?)',
      [requesterId, receiverId, 'pending']
    );
    
    res.status(201).json({
      message: 'Connection request sent',
      connectionId: result.insertId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Accept connection request
exports.acceptConnectionRequest = async (req, res) => {
  try {
    const { connectionId } = req.params;
    
    // Verify this request is for current user
    const [connection] = await db.query(
      'SELECT * FROM CONNECTIONS WHERE CONNECTION_ID = ? AND RECEIVER_ID = ?',
      [connectionId, req.userId]
    );
    
    if (connection.length === 0) {
      return res.status(404).json({ error: 'Connection request not found' });
    }
    
    await db.query(
      `UPDATE CONNECTIONS SET STATUS = 'accepted', ACCEPTED_AT = NOW() 
       WHERE CONNECTION_ID = ?`,
      [connectionId]
    );
    
    res.json({ message: 'Connection request accepted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Reject connection request
exports.rejectConnectionRequest = async (req, res) => {
  try {
    const { connectionId } = req.params;
    
    // Verify this request is for current user
    const [connection] = await db.query(
      'SELECT * FROM CONNECTIONS WHERE CONNECTION_ID = ? AND RECEIVER_ID = ?',
      [connectionId, req.userId]
    );
    
    if (connection.length === 0) {
      return res.status(404).json({ error: 'Connection request not found' });
    }
    
    await db.query(
      `UPDATE CONNECTIONS SET STATUS = 'rejected' WHERE CONNECTION_ID = ?`,
      [connectionId]
    );
    
    res.json({ message: 'Connection request rejected' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Remove connection
exports.removeConnection = async (req, res) => {
  try {
    const { connectionId } = req.params;
    
    // Verify user is part of this connection
    const [connection] = await db.query(
      `SELECT * FROM CONNECTIONS WHERE CONNECTION_ID = ? 
       AND (REQUEST_ID = ? OR RECEIVER_ID = ?)`,
      [connectionId, req.userId, req.userId]
    );
    
    if (connection.length === 0) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    
    await db.query('DELETE FROM CONNECTIONS WHERE CONNECTION_ID = ?', [connectionId]);
    
    res.json({ message: 'Connection removed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
