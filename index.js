require("dotenv").config();

const express = require("express");
const request = require("request");
const app = express();

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

app.use(express.json());

console.log("PAGE_ACCESS_TOKEN:", PAGE_ACCESS_TOKEN); // Debugging: Ensure token is loaded
console.log("VERIFY_TOKEN:", VERIFY_TOKEN); // Debugging: Ensure token is loaded

// Verify webhook
app.get("/webhook", (req, res) => {
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      console.log("WEBHOOK_VERIFICATION_FAILED");
      res.sendStatus(403);
    }
  } else {
    console.log("WEBHOOK_VERIFICATION_NO_MODE_OR_TOKEN");
    res.sendStatus(400);
  }
});

// Handle messages
app.post("/webhook", (req, res) => {
  let body = req.body;

  if (body.object === "page") {
    body.entry.forEach((entry) => {
      let webhookEvent = entry.messaging[0];
      console.log("Webhook event:", webhookEvent);

      let senderPsid = webhookEvent.sender.id;
      if (webhookEvent.message) {
        console.log("Received message:", webhookEvent.message);
        handleMessage(senderPsid, webhookEvent.message);
      }
    });

    res.status(200).send("EVENT_RECEIVED");
  } else {
    res.sendStatus(404);
  }
});

function handleMessage(senderPsid, receivedMessage) {
  let response;

  if (receivedMessage.text) {
    const message = receivedMessage.text;

    response = {
      text: `You sent the message: "${receivedMessage.text}". Now send me an image!`,
    };
    sendMessage(senderPsid, response);
  } else if (receivedMessage.attachments) {
    let attachmentUrl = receivedMessage.attachments[0].payload.url;
    response = {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [
            {
              title: "Is this the right picture?",
              subtitle: "Tap a button to answer.",
              image_url: attachmentUrl,
              buttons: [
                {
                  type: "postback",
                  title: "Yes!",
                  payload: "yes",
                },
                {
                  type: "postback",
                  title: "No!",
                  payload: "no",
                },
              ],
            },
          ],
        },
      },
    };
    sendMessage(senderPsid, response);
  }
}

const sendMessage = (recipientId, message) => {
  let requestBody = {
    recipient: {
      id: recipientId,
    },
    message: message,
  };

  request(
    {
      uri: "https://graph.facebook.com/v19.0/me/messages",
      qs: { access_token: PAGE_ACCESS_TOKEN },
      method: "POST",
      json: requestBody,
    },
    (err, res, body) => {
      if (!err) {
        console.log("Request body:", requestBody);
        console.log("Message sent successfully:", body);
      } else {
        console.error("Unable to send message:", err);
        console.error("Response body:", body); // Log the response body for debugging
      }
    }
  );
};

app.listen(process.env.PORT || 1337, () => console.log("Webhook is listening"));
