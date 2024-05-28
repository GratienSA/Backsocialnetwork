const { Message } = require('../models/Message');
const  { Comment } = require('../models/comment');
const { LikeDislike } = require('../models/LikeDislike');
const client = require('../services/db');
const { ObjectId } = require('bson');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { extractToken } = require('../utils/extractToken');

const createMessage = async (request, response) => {
    const token = await extractToken(request);
    jwt.verify(token, process.env.MY_SUPER_SECRET_KEY, async (err, authData) => {
        if (err) {
            return response.status(401).json({ error: "Requête non autorisée le Token n'est pas bon" });
        }
        if (!request.body.title || !request.body.content) {
            return response.status(400).json({ error: "champs manquants" });
        }
        try {
            const message = new Message(
                authData.id,
                request.body.title,
                request.body.content,
                new Date().toLocaleDateString("fr")
            );
            const result = await client.db("network").collection("Message").insertOne(message);
            response.status(200).json(result);
        } catch (e) {
            console.error(e);
            response.status(500).json(e);
        }
    });
};

const getMyMessages = async (request, response) => {
    const token = await extractToken(request);
    try {
        const decodedToken = jwt.verify(token, process.env.MY_SUPER_SECRET_KEY);
        const messages = await client.db().collection('Message').find({ id_user: decodedToken.id }).toArray();
        response.status(200).json(messages);
    } catch (error) {
        console.error(error);
        response.status(500).json({ error: 'Error fetching user messages' });
    }
};

const getAllMessages = async (request, response) => {
    try {
        const messages = await client.db().collection('Message').find().sort({ publication_date: -1 }).toArray();
        response.status(200).json(messages);
    } catch (error) {
        console.error(error);
        response.status(500).json({ error: 'Error fetching all messages' });
    }
};

const deleteMessage = async (request, response) => {
    const token = await extractToken(request);
    try {
        const decodedToken = jwt.verify(token, process.env.MY_SUPER_SECRET_KEY);
        const id_message = new ObjectId(request.body.id_message);
        await client.db().collection('Message').deleteOne({ _id: id_message });
        response.status(200).json({ message: 'Message deleted successfully' });
    } catch (error) {
        console.error(error);
        response.status(500).json({ error: 'Error deleting the message' });
    }
};

const updateMessage = async (request, response) => {
    const token = await extractToken(request);
    try {
        const decodedToken = jwt.verify(token, process.env.MY_SUPER_SECRET_KEY);
        const id_message = new ObjectId(request.body.id_message);
        await client.db().collection('Message').updateOne(
            { _id: id_message },
            { $set: { content: request.body.content, title: request.body.title } }
        );
        response.status(200).json({ message: 'Message updated successfully' });
    } catch (error) {
        console.error(error);
        response.status(500).json({ error: 'Error updating the message' });
    }
};

const addLikeDislike = async (req, res) => {
    const token = await extractToken(req);
    jwt.verify(token, process.env.MY_SUPER_SECRET_KEY, async (err, authData) => {
        if (err) {
            return res.status(401).json({ error: "Requête non autorisée le Token n'est pas bon" });
        }
        const { id_message, type } = req.body;
        try {
            const newLikeDislike = await client.db("network").collection("LikeDislike").insertOne({
                id_message: new ObjectId(id_message),
                id_user: authData.id,
                type
            });
            res.status(201).json(newLikeDislike);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error while adding like/dislike', error });
        }
    });
};

// https://rtavenar.github.io/mongo_book/content/05_agreg.html#match


const countLikesDislikes = async (req, res) => {
    const { id_message } = req.params; 

    try {
        const counts = await client.db("network").collection("LikeDislike").aggregate([
            { $match: { id_message: new ObjectId(id_message) } }, // Filter by message ID
            { $group: { 
                _id: "$type", // Group by type (like or dislike)
                count: { $sum: 1 } // Count the number of each type
            }}
        ]).toArray();

        // Transform the result into a more convenient format
        const result = counts.reduce((acc, { _id, count }) => {
            acc[_id] = count;
            return acc;
        }, { like: 0, dislike: 0 }); // Initialize counts to 0 if not present

        res.status(200).json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error while counting likes/dislikes', error });
    }
};



const addComment = async (req, res) => {
    const token = await extractToken(req);
    jwt.verify(token, process.env.MY_SUPER_SECRET_KEY, async (err, authData) => {
        if (err) {
            return res.status(401).json({ error: "Requête non autorisée le Token n'est pas bon" });
        }
        const { id_message, content } = req.body;
        try {
            const newComment = await client.db("network").collection("Comment").insertOne({
                id_message: new ObjectId(id_message),
                content,          
            });
            res.status(201).json(newComment.ops[0]);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error while adding comment', error });
        }
    });
};

const getComments = async (req, res) => {
    try {
        const comments = await client.db().collection('Comment').find({ id_message: new ObjectId(req.params.id_message) }).toArray();
        res.status(200).json(comments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error while fetching comments', error });
    }
};

const likeComment = async (req, res) => {
    try {
        const { id_comment } = req.params;
        await client.db().collection('Comment').updateOne({ _id: new ObjectId(id_comment) }, { $inc: { likes: 1 } });
        res.status(200).json({ message: 'Comment liked' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error while liking comment', error });
    }
};

const dislikeComment = async (req, res) => {
    try {
        const { id_comment } = req.params;
        await client.db().collection('Comment').updateOne({ _id: new ObjectId(id_comment) }, { $inc: { dislikes: 1 } });
        res.status(200).json({ message: 'Comment disliked' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error while disliking comment', error });
    }
};

const editComment = async (req, res) => {
    const token = await extractToken(req);
    jwt.verify(token, process.env.MY_SUPER_SECRET_KEY, async (err, authData) => {
        if (err) {
            return res.status(401).json({ error: "Requête non autorisée le Token n'est pas bon" });
        }
        const { id_comment, content } = req.body;
        try {
            await client.db("network").collection("Comment").updateOne(
                { _id: new ObjectId(id_comment), id_user: authData.id },
                { $set: { content, comment_date: new Date() } }
            );
            res.status(200).json({ message: 'Comment edited' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error while editing comment', error });
        }
    });
};

const deleteComment = async (req, res) => {
    const token = await extractToken(req);
    jwt.verify(token, process.env.MY_SUPER_SECRET_KEY, async (err, authData) => {
        if (err) {
            return res.status(401).json({ error: "Requête non autorisée le Token n'est pas bon" });
        }
        const { id_comment } = req.params;
        try {
            await client.db("network").collection("Comment").deleteOne({ _id: new ObjectId(id_comment), id_user: authData.id });
            res.status(200).json({ message: 'Comment deleted' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error while deleting comment', error });
        }
    });
};


module.exports = {
    createMessage,
    getAllMessages,
    getMyMessages,
    updateMessage,
    deleteMessage,
    countLikesDislikes,
    addComment,
    getComments,
    addLikeDislike,
    likeComment,
    editComment,
    dislikeComment,
    deleteComment,
    
};
