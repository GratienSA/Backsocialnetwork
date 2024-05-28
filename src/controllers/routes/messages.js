const express = require('express');
const {
    createMessage, getAllMessages, getMyMessages,
    updateMessage, deleteMessage, addComment,
    getComments, addLikeDislike, countLikesDislikes,likeComment,
    editComment, dislikeComment,deleteComment,

} = require('../messageController');
const { verifyToken } = require('../../utils/extractToken');

const router = express.Router();

router.route('/create').post(verifyToken, createMessage);
router.route('/all').get(getAllMessages);
router.route('/mine').post(verifyToken, getMyMessages);
router.route('/update').patch(verifyToken, updateMessage);
router.route('/delete').delete(verifyToken, deleteMessage);

router.post('/like-dislike', verifyToken, addLikeDislike);
router.get('/LikesDislikes/:id_message/count', countLikesDislikes);

router.post('/message/comment', addComment);
router.get('/comments/:id_message', getComments);
router.post('/comments/like/:id_comment', likeComment);
router.post('/comments/dislike/:id_comment', dislikeComment);
router.put('/comments/edit', editComment);
router.delete('/comments/:id_comment', deleteComment);




module.exports = router;