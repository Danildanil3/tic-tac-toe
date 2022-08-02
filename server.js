const net = require("net");
const stream = require("stream");
let players = [];
let field = [0, 0, 0, 0, 0, 0, 0, 0, 0];
const rowSplitter = "---+---+---\n";
let WhoseTurn;
let whoIsX;

function getRandom() {
  return Boolean(Math.round(Math.random()));
}

function gameStatus(field) {
  let matrices = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (let matrix of matrices) {
    if (field[matrix[0]] == field[matrix[1]] && field[matrix[1]] == field[matrix[2]] && field[matrix[0]] != "") {
      return field[matrix[0]] === 1 ? "x" : "0";
    }
  }
  let isEmpty = (currentValue) => currentValue === 0;
  if (field.some(isEmpty)) {
    return "turn";
  }
  return "end";
}

function renderField(field) {
  function numToMark(num) {
    switch (num) {
      case 0:
        return " ";
      case 1:
        return "x";
      case -1:
        return "0";
      default:
        return "!" + num;
    }
  }

  function renderRow(row) {
    return row.map((c) => ` ${numToMark(c)} `).join("|") + "\n";
  }

  const rows = [0, 3, 6].map((start) => field.slice(start, start + 3));
  return rows.map(renderRow).join(rowSplitter);
}

const server = net.createServer((socket) => {
  const clientInfo = `${socket.remoteAddress}:${socket.remotePort}`;
  console.log(`+ ${clientInfo} - connected`);

  socket.write("\x1b[37;46;1mRules of the game\x1b[0m\r\n");
  socket.write("\t\x1b[3m*Turn order is determined randomly\n");
  socket.write("\t*You can make a move when it's your turn\n");
  socket.write("\t*To make a move, enter a number from 1 to 9.\n");
  socket.write("\tWhere 1 is the top left corner and 9 is the bottom right\x1b[0m\n");

  if (players.length < 2) {
    players.push(socket);
    socket.write("\x1b[31;49m\nWaiting for another player\x1b[0m");
  }
  if (players.length === 2) {
    WhoseTurn = getRandom();
    whoIsX = Number(WhoseTurn);

    players.forEach((player) => {
      player.write("\x1b[31;47m\nWe're ready to start!\x1b[0m\n");
      player.write(renderField(field));
    });

    if (WhoseTurn) {
      players[0].write("\x1b[31;49m\nNow is \x1b[3mnot\x1b[0m\x1b[31;49m your turn\x1b[0m\n");
      players[1].write("\x1b[31;49m\nIt's your turn!\x1b[0m\n");
      players[1].write("\x1b[31;49m\n> \x1b[0m");
    } else {
      players[1].write("\x1b[31;49m\nNow is \x1b[3mnot\x1b[0m\x1b[31;49m your turn\x1b[0m\n");
      players[0].write("\x1b[31;49m\nIt's your turn!\x1b[0m\n");
      players[0].write("\x1b[31;49m\n> \x1b[0m");
    }
  }

  socket.on("data", (message) => {
    message = message.toString().replace(/[\n\r]/g, "");
    if (socket === players[Number(WhoseTurn)]) {
      if (message.length === 1 && message !== "0" && field[Number(message) - 1] === 0) {
        field[Number(message) - 1] = Number(WhoseTurn) === whoIsX ? 1 : -1;

        players.forEach((player) => {
          player.write(`\n${renderField(field)}`);
        });

        switch (gameStatus(field)) {
          case "x":
            players[whoIsX].write(`\n\x1b[30;42mYOU WIN!\x1b[0m`);
            players[Number(!Boolean(whoIsX))].write(`\n\x1b[30;42mYOU LOSE :(\x1b[0m`);
            break;
          case "0":
            players[whoIsX].write(`\n\x1b[30;42mYOU LOSE :(\x1b[0m`);
            players[whoIsX === 1 ? 0 : 1].write(`\n\x1b[30;42mYOU WIN!\x1b[0m`);
            field = Array.from(Array(9)).fill(0);
            break;
          case "end":
            players[0].write(`\n\x1b[30;42mDRAW!\x1b[0m`);
            players[1].write(`\n\x1b[30;42mDRAW!\x1b[0m`);
            field = Array.from(Array(9)).fill(0);
            break;
        }
        WhoseTurn = !WhoseTurn;
        players[Number(WhoseTurn)].write("\x1b[31;49m\n> \x1b[0m");
      } else {
        socket.write("\x1b[31;49m\n[1-9]> \x1b[0m");
      }
    }
    process.stdout.write(`\n${clientInfo} : ${message}`);
  });

  socket.on("close", () => {
    console.log(`- ${clientInfo} - closed`);
  });
});

server.listen(1337, "127.0.0.1");
