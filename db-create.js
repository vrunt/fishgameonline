const fs = require("fs");
const dbFile = "./.data/sqlite.db";
const exists = fs.existsSync(dbFile);
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database(dbFile);

// if ./.data/sqlite.db does not exist, create it, otherwise print records to console
//db.serialize(() => {
//  db.run(
//"CREATE TABLE Cards (id INTEGER PRIMARY KEY AUTOINCREMENT, value INTEGER, name TEXT, type TEXT, description TEXT)"

//"INSERT INTO Cards (name, type, value, description) VALUES ('Ace of Whales', 'Sample', 1, 'The Ace of the Whale suit.')"

//"DELETE FROM Cards"
//  );
//console.log("New table Cards created!");
//});

var suits = ["Squids", "Whales", "Turtles", "Hooks"];
var values = [
  "Ace",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten"
];

db.serialize(() => {
  for (var suit in suits) {
    for (var value in values) {
      db.run(
        "INSERT INTO Cards (name, type, value, description) VALUES ('" +
          values[value] +
          " of " +
          suits[suit] +
          "', 'Sample', " +
          (parseInt(value) + 1) +
          ", 'The " +
          values[value] +
          " of the " +
          suits[suit] +
          " suit.')"
      );
    }
  }
});
