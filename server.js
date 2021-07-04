require('dotenv').config();

const path = require('path');
const chalk = require('chalk');
const express = require('express');
const webpush = require('web-push');

const serverName = `http://localhost:${process.env.PORT}/`;

webpush.setVapidDetails(serverName, process.env.APP_SERVER_PUBLIC_KEY, process.env.APP_SERVER_PRIVATE_KEY);

let pushSubscription = null;

function unsubscribe() {
  pushSubscription = null;
  console.log(chalk.cyan('[DB] Delete subscription'));
}

function auth(req, res, next) {
  if (req.query.key !== process.env.PUSH_SECRET) {
    return res.sendStatus(403);
  }

  next();
}

async function push(req, res) {
  if (!pushSubscription) {
    return res.sendStatus(404);
  }

  try {
    const result = await webpush.sendNotification(pushSubscription, JSON.stringify(req.body));
    res.sendStatus(result.statusCode);
  } catch (error) {
    console.log(chalk.red(`[PUSH] ${error.body || error.message}`));

    if (error.statusCode === 404 || error.statusCode === 410) {
      unsubscribe();
    }

    res.sendStatus(error.statusCode || 500);
  }
}

const app = express();

app.use(express.static(path.resolve(__dirname, 'public')));

app.get('/key', (req, res) => {
  res.send(process.env.APP_SERVER_PUBLIC_KEY);
});

app.post(
  '/subscribe',
  express.json(),
  (req, res, next) => {
    pushSubscription = req.body;
    console.log(chalk.cyan('[DB] New subscription'));
    req.body = { title: '🔔 已訂閱開啟小鈴鐺' };
    next();
  },
  push
);

app.delete('/unsubscribe', (req, res) => {
  unsubscribe();
  res.sendStatus(204);
});

app.post('/push', auth, express.json(), push);

app.listen(process.env.PORT, () => {
  console.log(chalk.yellow.bold(`[SERVER] start at: ${serverName}`));
});
