# TSB Raid Bot - Upgraded Website Build

## New stuff

- Better landing page in `public/index.html`
- Dynamic `/invite` route that uses your `CLIENT_ID` from `.env`
- `/api/status` route for the website status text
- New Discord commands: `/help` and `/config`
- Raid/backup embeds now include a direct **Join Server** button
- `/setup_raid` supports optional `clan_name`
- Safer user input: blocks accidental `@everyone` and `@here` mentions inside embed text

## Setup

```bash
npm install
npm start
```

Create `.env` from `.env.example`:

```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_client_id_here
PORT=3000
INVITE_PERMISSIONS=2147485696
```

## Deploy to VM

```bash
scp tsb-raid-bot-upgraded.zip ubuntu@YOUR_SERVER_IP:~
ssh ubuntu@YOUR_SERVER_IP
unzip tsb-raid-bot-upgraded.zip
cd tsb-raid-bot-upgraded
npm install
cp .env.example .env
nano .env
npm start
```

Run in screen:

```bash
screen -S raidbot
npm start
# detach with Ctrl+A then D
```
