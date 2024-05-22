require('dotenv').config()


const express = require('express');
// const bodyParser = require('body-parser');
const request = require('request');
const app = express();

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

app.use(express.json());

// Verify webhook
app.get('/webhook', (req, res) => {
    console.log('GET /webhook called');
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            console.log('WEBHOOK_VERIFICATION_FAILED');
            res.sendStatus(403);
        }
    }
});

// Handle messages
app.post('/webhook', (req, res) => {
    console.log('POST /webhook called');
    let body = req.body;
    console.log('Received body:', JSON.stringify(body, null, 2));

    if (body.object === 'page') {
        body.entry.forEach(entry => {
            let webhookEvent = entry.messaging[0];
            console.log('Webhook event:', webhookEvent);

            let senderPsid = webhookEvent.sender.id;
            if (webhookEvent.message) {
                handleMessage(senderPsid, webhookEvent.message);
            }
        });

        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

function handleMessage(senderPsid, receivedMessage) {
    let response;
    console.log('Received message:', receivedMessage);

    if (receivedMessage.text) {
        response = {
            'text': `You sent the message: "${receivedMessage.text}". Now send me an image!`
        };
    } else if (receivedMessage.attachments) {
        let attachmentUrl = receivedMessage.attachments[0].payload.url;
        response = {
            'attachment': {
                'type': 'template',
                'payload': {
                    'template_type': 'generic',
                    'elements': [{
                        'title': 'Is this the right picture?',
                        'subtitle': 'Tap a button to answer.',
                        'image_url': attachmentUrl,
                        'buttons': [
                            {
                                'type': 'postback',
                                'title': 'Yes!',
                                'payload': 'yes',
                            },
                            {
                                'type': 'postback',
                                'title': 'No!',
                                'payload': 'no',
                            }
                        ],
                    }]
                }
            }
        };
    }

    callSendAPI(senderPsid, response);
}

function callSendAPI(senderPsid, response) {
    let requestBody = {
        'recipient': {
            'id': senderPsid
        },
        'message': response
    };

    request({
        'uri': 'https://graph.facebook.com/v12.0/me/messages',
        'qs': { 'access_token': PAGE_ACCESS_TOKEN },
        'method': 'POST',
        'json': requestBody
    }, (err, res, body) => {
        if (!err) {
            console.log('Message sent!');
        } else {
            console.error('Unable to send message:', err);
        }
    });
}

app.listen(process.env.PORT || 1337, () => console.log('Webhook is listening'));
