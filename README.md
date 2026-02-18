# Discord Voice Bot

An open-source Discord bot for managing temporary voice channels with a Join-to-Create system.

## Features
- **Join to Create:** Automatically creates a voice channel when you join the generator channel.
- **Auto Delete:** Deletes channels when they become empty.
- **Channel Controls:** Dropdown menus to lock, unlock, hide, unhide, rename, and set user limits.
- **User Actions:** Kick, transfer ownership, invite users, or claim abandoned channels.
- **Persistence:** Settings and active channels are stored in SQLite.

## Prerequisites: Creating a Discord Bot

Before setting up the code, you need to create a bot application on Discord:

1.  **Developer Portal:** Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2.  **New Application:** Click "New Application" and give it a name.
3.  **Get Client ID:**
    -   Go to the **OAuth2** tab.
    -   Copy the `Client ID`. Save this for your `.env` file (`CLIENT_ID`).
4.  **Create Bot User:**
    -   Go to the **Bot** tab.
    -   Click "Reset Token" to reveal your token.
    -   Copy the token immediately. Save this for your `.env` file (`DISCORD_TOKEN`).
5.  **Enable Intents:**
    -   Still on the **Bot** tab, scroll down to **Privileged Gateway Intents**.
    -   Enable **Server Members Intent**, **Message Content Intent**, and **Presence Intent**.
    -   Click "Save Changes".
6.  **Invite Bot:**
    -   Go to **OAuth2** -> **URL Generator**.
    -   Select scopes: `bot` and `applications.commands`.
    -   Select permissions: `Administrator` (easiest) or manually select `Manage Channels`, `Move Members`, `Manage Roles`, `Send Messages`, `Create Instant Invite`.
    -   Copy the generated URL and invite the bot to your server.

## Setup

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Configuration:**
    -   Create a `.env` file in the project root.
    -   Add your `DISCORD_TOKEN` and `CLIENT_ID` obtained above.
    ```env
    DISCORD_TOKEN=your_token_here
    CLIENT_ID=your_client_id_here
    ```

3.  **Start the Bot:**
    ```bash
    npm start
    ```

## Usage
-   **Admin:** Run `/setup` to create the "Join to Create" channel and category.
-   **User:** Join the "Join to Create" channel. A new channel will be created for you with control menus.

## Deployment (Railway)

To deploy on Railway with persistent storage:

1.  **Environment Variables:** Set `DISCORD_TOKEN`, `CLIENT_ID`, and `DB_PATH=/app/data/voicebot.db`.
2.  **Volume:** Add a Railway Volume mounted at `/app/data`.
