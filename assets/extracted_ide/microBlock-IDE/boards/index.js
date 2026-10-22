for (const id of [
    "atom-vx", // Add PT-BOT Atom VX
    "atom-mini",
    "strom-mini",
    "buildbot", // Add PT-BOT Build BOT
]) {
    document.write(`<script src="boards/${id}/index.js"></script>`);
}
