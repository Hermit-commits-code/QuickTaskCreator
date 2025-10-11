// db.js
const { MongoClient } = require('mongodb');
const uri =
  process.env.MONGODB_URI ||
  'mongodb+srv://hotcupofjoe2013:SuperDewgong.1@cluster0.ae2e4yb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const client = new MongoClient(uri);

async function connectDB() {
  if (!client.topology || !client.topology.isConnected()) {
    await client.connect();
  }
  return client.db('quicktaskcreator'); // You can use any db name you want
}

module.exports = connectDB;
