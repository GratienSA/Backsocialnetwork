const express = require('express');
const { register, login, Logout, getAllUsers, valideAccount, insertProfilePicture, getUserProfile, reset_password_request,reset_password, searchTerm} = require('../UserController');
const router = express.Router();

router.post('/insert/picture', insertProfilePicture);
router.post('/register', register);
router.post('/login', login);
router.delete('/logout', Logout);
router.get('/all', getAllUsers);
router.get('/activate/:token', valideAccount);
router.get('/:id/profile', getUserProfile);
router.post('/reset-password-request', reset_password_request);
router.patch('/reset-password-request/:token', reset_password);
router.get('/search', searchTerm )

  

module.exports = router;
