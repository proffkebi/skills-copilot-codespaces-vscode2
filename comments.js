// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { randomBytes } = require('crypto'); // create random id
const axios = require('axios'); // make request to event bus

const app = express();
app.use(bodyParser.json());
app.use(cors());

const commentsByPostId = {};

app.get('/posts/:id/comments', (req, res) => {
	const postId = req.params.id;
	res.send(commentsByPostId[postId] || []);
});

app.post('/posts/:id/comments', async (req, res) => {
	const postId = req.params.id;
	const commentId = randomBytes(4).toString('hex');
	const { content } = req.body;
	const comments = commentsByPostId[postId] || [];
	comments.push({ id: commentId, content, status: 'pending' });
	commentsByPostId[postId] = comments;
	await axios.post('http://event-bus-srv:4005/events', {
		type: 'CommentCreated',
		data: {
			id: commentId,
			content,
			postId,
			status: 'pending',
		},
	});
	res.status(201).send(comments);
});

app.post('/events', async (req, res) => {
	console.log('Event Received', req.body.type);
	const { type, data } = req.body;
	if (type === 'CommentModerated') {
		const { id, postId, status, content } = data;
		const comments = commentsByPostId[postId];
		const comment = comments.find((comment) => comment.id === id);
		comment.status = status;
		await axios.post('http://event-bus-srv:4005/events', {
			type: 'CommentUpdated',
			data: {
				id,
				postId,
				status,
				content,
			},
		});
	}
	res.send({});
});

app.listen(4001, () => {
	console.log('Listening on 4001');
});