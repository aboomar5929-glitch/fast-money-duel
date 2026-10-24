# Fast Money Duel
A real-time two-phone survey game using Node.js, Express, and Socket.IO.

## Play locally
Run `npm install && npm start`, then visit http://localhost:3000.

## Deploy on Render
Upload these files to a GitHub repository. In Render select **New > Blueprint**, connect that repository, and deploy using `render.yaml`. Or create a **Web Service** using Node, build `npm install`, start `npm start`, and the Free plan.

Players open the same public URL. Player 1 creates a room and sends the invite link to player 2. Five timed rounds, 25 seconds each. The server computes scores. Rooms are held in memory; restarting the server clears active games. For production, add persistent storage and robust session reconnection.

Survey answer weights are illustrative game data, not sourced from real polling.
