import chatService from '../services/chat.service.js';

export async function createConversation(req, res, next) {
  try {
    const { candidate_user_id } = req.body;
    if (!candidate_user_id) {
      return res.status(400).json({
        error: {
          code: 'MISSING_CANDIDATE_ID',
          message: 'candidate_user_id is required',
        },
      });
    }

    const conversation = await chatService.getOrCreateConversation(
      req.user.id,
      candidate_user_id
    );

    return res.status(201).json({
      success: true,
      conversation,
    });
  } catch (err) {
    next(err);
  }
}

export async function getConversations(req, res, next) {
  try {
    const conversations = await chatService.getUserConversations(req.user.id);
    return res.status(200).json({
      conversations,
      count: conversations.length,
    });
  } catch (err) {
    next(err);
  }
}

export async function getMessages(req, res, next) {
  try {
    const { id } = req.params;
    const { before, limit } = req.query;

    const result = await chatService.getConversationMessages(req.user.id, id, {
      before,
      limit,
    });

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function sendMessage(req, res, next) {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const result = await chatService.createMessage(req.user.id, id, content);

    return res.status(201).json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
}

export async function markAsRead(req, res, next) {
  try {
    const { id } = req.params;
    const result = await chatService.markMessagesAsRead(req.user.id, id);

    return res.status(200).json({
      success: true,
      updated_count: result.updated_count,
    });
  } catch (err) {
    next(err);
  }
}

export default {
  createConversation,
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
};
