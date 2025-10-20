const db = require('../config/database');

// Get all posts (feed)
exports.getAllPosts = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    const [posts] = await db.query(
      `SELECT p.*, u.F_NAME, u.L_NAME, u.PROFILE_PIC_URL, u.HEADLINE,
        p.CREATED_AT as createdAt
       FROM POSTS p
       JOIN USERS u ON p.USER_ID = u.USER_ID
       WHERE u.STATUS = 'active'
       ORDER BY p.CREATED_AT DESC
       LIMIT ? OFFSET ?`,
      [parseInt(limit), parseInt(offset)]
    );
    
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get user's posts
exports.getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const [posts] = await db.query(
      `SELECT p.*, u.F_NAME, u.L_NAME, u.PROFILE_PIC_URL,
        p.CREATED_AT as createdAt
       FROM POSTS p
       JOIN USERS u ON p.USER_ID = u.USER_ID
       WHERE p.USER_ID = ?
       ORDER BY p.CREATED_AT DESC`,
      [userId]
    );
    
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single post
exports.getPost = async (req, res) => {
  try {
    const { postId } = req.params;
    
    const [posts] = await db.query(
      `SELECT p.*, u.F_NAME, u.L_NAME, u.PROFILE_PIC_URL, u.HEADLINE,
        p.CREATED_AT as createdAt
       FROM POSTS p
       JOIN USERS u ON p.USER_ID = u.USER_ID
       WHERE p.POST_ID = ?`,
      [postId]
    );
    
    if (posts.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    res.json(posts[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create post
exports.createPost = async (req, res) => {
  try {
    const { title, content, mediaUrl, postType } = req.body;
    
    const [result] = await db.query(
      `INSERT INTO POSTS (USER_ID, TITLE, CONTENT, MEDIA_URL, POST_TYPE)
      VALUES (?, ?, ?, ?, ?)`,
      [req.userId, title || null, content, mediaUrl || null, postType || 'text']
    );
    
    res.status(201).json({
      message: 'Post created successfully',
      postId: result.insertId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update post
exports.updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { title, content, mediaUrl } = req.body;
    
    // Verify ownership
    const [existing] = await db.query(
      'SELECT USER_ID FROM POSTS WHERE POST_ID = ?',
      [postId]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    if (existing[0].USER_ID !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    await db.query(
      `UPDATE POSTS SET TITLE = ?, CONTENT = ?, MEDIA_URL = ?, 
      UPDATED_AT = NOW() WHERE POST_ID = ?`,
      [title, content, mediaUrl, postId]
    );
    
    res.json({ message: 'Post updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete post
exports.deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    
    // Verify ownership
    const [existing] = await db.query(
      'SELECT USER_ID FROM POSTS WHERE POST_ID = ?',
      [postId]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    if (existing[0].USER_ID !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    await db.query('DELETE FROM POSTS WHERE POST_ID = ?', [postId]);
    
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Like/Unlike post
exports.togglePostLike = async (req, res) => {
  try {
    const { postId } = req.params;
    
    // Check if already liked
    const [existing] = await db.query(
      'SELECT * FROM POST_LIKES WHERE POST_ID = ? AND USER_ID = ?',
      [postId, req.userId]
    );
    
    if (existing.length > 0) {
      // Unlike
      await db.query(
        'DELETE FROM POST_LIKES WHERE POST_ID = ? AND USER_ID = ?',
        [postId, req.userId]
      );
      
      // Decrement count
      await db.query(
        'UPDATE POSTS SET LIKES_COUNT = LIKES_COUNT - 1 WHERE POST_ID = ?',
        [postId]
      );
      
      res.json({ message: 'Post unliked', liked: false });
    } else {
      // Like
      await db.query(
        'INSERT INTO POST_LIKES (POST_ID, USER_ID) VALUES (?, ?)',
        [postId, req.userId]
      );
      
      // Increment count
      await db.query(
        'UPDATE POSTS SET LIKES_COUNT = LIKES_COUNT + 1 WHERE POST_ID = ?',
        [postId]
      );
      
      res.json({ message: 'Post liked', liked: true });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get comments for a post
exports.getPostComments = async (req, res) => {
  try {
    const { postId } = req.params;
    
    const [comments] = await db.query(
      `SELECT c.*, u.F_NAME, u.L_NAME, u.PROFILE_PIC_URL
       FROM COMMENTS c
       JOIN USERS u ON c.USER_ID = u.USER_ID
       WHERE c.POST_ID = ?
       ORDER BY c.CREATED_AT DESC`,
      [postId]
    );
    
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add comment
exports.addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    
    const [result] = await db.query(
      'INSERT INTO COMMENTS (POST_ID, USER_ID, CONTENT) VALUES (?, ?, ?)',
      [postId, req.userId, content]
    );
    
    // Increment comment count
    await db.query(
      'UPDATE POSTS SET COMMENTS_COUNT = COMMENTS_COUNT + 1 WHERE POST_ID = ?',
      [postId]
    );
    
    res.status(201).json({
      message: 'Comment added successfully',
      commentId: result.insertId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete comment
exports.deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    
    // Verify ownership
    const [existing] = await db.query(
      'SELECT USER_ID, POST_ID FROM COMMENTS WHERE COMMENT_ID = ?',
      [commentId]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    if (existing[0].USER_ID !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    await db.query('DELETE FROM COMMENTS WHERE COMMENT_ID = ?', [commentId]);
    
    // Decrement comment count
    await db.query(
      'UPDATE POSTS SET COMMENTS_COUNT = COMMENTS_COUNT - 1 WHERE POST_ID = ?',
      [existing[0].POST_ID]
    );
    
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
