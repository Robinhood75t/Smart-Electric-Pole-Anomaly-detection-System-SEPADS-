// const http = require("http");
// const app = require("./app");
// const connectDB = require("./src/config/db");
// const { Server } = require("socket.io");
// // Load cron jobs
// require("./src/cron/cronJobs");

// connectDB();
// const PORT = 5000;


// const server = http.createServer(app);

// const io = new Server(server, {
//   cors: {
//     origin: "*"
//   }
// });

// // 🔥 store io globally
// const { setIO } = require("./src/socket");
// setIO(io);

// io.on("connection", (socket) => {
//   console.log("⚡ Frontend connected:", socket.id);
// });



// console.log("sending request to app.js");

// app.listen(PORT, () => {
//     console.log(`🚀 Server running on port ${PORT}`);
//   });

const http = require("http");
const app = require("./app");
const connectDB = require("./src/config/db");
const { Server } = require("socket.io");

// Load cron jobs
const startcron = require("./src/cron/cronJobs");



connectDB();
const PORT = 9000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});
app.set("io", io);
// 🔥 store io globally

startcron(io);

const { setIO } = require("./src/socket");
setIO(io);

io.on("connection", (socket) => {
  console.log("⚡ Frontend connected:", socket.id);

  // 🔥 join single pole
  socket.on("join-pole", (pole_id) => {
    socket.join(pole_id);
    console.log(`📍 ${socket.id} joined pole ${pole_id}`);
  });

  // 🔥 join multiple poles (recommended)
  socket.on("join-multiple-poles", (poles) => {
    poles.forEach((pole_id) => {
      socket.join(pole_id);
      console.log(`📍 ${socket.id} joined pole ${pole_id}`);
    });
  });

  // 🔥 optional: leave pole
  socket.on("leave-pole", (pole_id) => {
    socket.leave(pole_id);
    console.log(`🚪 ${socket.id} left pole ${pole_id}`);
  });

  socket.on("disconnect", () => {
    console.log("❌ Frontend disconnected:", socket.id);
  });
});

console.log("sending request to app.js");

// ✅ FIXED HERE
server.listen(process.env.PORT || PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
