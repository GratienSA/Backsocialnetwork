const express = require('express');
const userRouter = require('./controllers/routes/user');
const messageRoutes = require('./controllers/routes/messages');
const { connect } = require('./services/db');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

app.use('/user', userRouter);
app.use('/message', messageRoutes);


app.use('/imageFile', express.static(__dirname + '/uploads'));

connect(process.env.DB_URL, (error) => {
    if (error) {
        console.log('Failed to connect');
        process.exit(-1);
    } else {
        console.log('Successfully connected');
    }
});

app.listen(process.env.PORT, () => {
    console.log(`I'm listening on port ${process.env.PORT}`);
});

