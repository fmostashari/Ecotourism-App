const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const dbFile = "tourism.db";

const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log("Connected to the tourism.db SQLite database.");
});

const seedDb = () => {
  if (process.env.NODE_ENV === "production") {
    console.log("Skipping seeding in production environment.");
    return;
  }

  db.get("SELECT COUNT(*) as count FROM Users", (err, row) => {
    if (err) {
      console.error("Error checking user count:", err.message);
      return;
    }

    if (row.count === 0) {
      console.log("Database is empty. Seeding data...");

      const fakePassword = "123456";
      bcrypt.hash(fakePassword, 10, (err, hashedPassword) => {
        if (err) return console.error("Error hashing password:", err);

        db.serialize(() => {
          db.run(
            `INSERT INTO Users (username, password, phoneNumber, role, status, can_book, can_host) VALUES ('tourist_user', ?, '09120000001', 'tourist', 'active', 1, 0)`,
            [hashedPassword]
          );
          db.run(
            `INSERT INTO Users (username, password, phoneNumber, role, status, can_book, can_host) VALUES ('host_user', ?, '09120000002', 'host', 'active', 1, 1)`,
            [hashedPassword],
            function (err) {
              if (err) return console.error(err.message);
              const hostId = this.lastID;

              const dataPath = path.join(__dirname, "data.json");
              fs.readFile(dataPath, "utf8", (err, data) => {
                if (err) {
                  console.error("Could not read data.json for seeding:", err);
                  return;
                }
                const { hotels } = JSON.parse(data);
                const stmt = db.prepare(
                  `INSERT INTO Accommodations (owner_id, name, address, price_per_night, description, star_rating, image_url, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_review')`
                );     
                hotels.forEach((hotel) => {
                  stmt.run(
                    hostId,
                    hotel.name,
                    hotel.address,
                    hotel.price_per_night,
                    `Description for ${hotel.name}`,
                    hotel.star_rating,
                    hotel.image_url
                  );
                });
                stmt.finalize();
                console.log(
                  "Fake data seeded successfully. Test password is '123456'"
                );
              });
            }
          );
          db.run(
            `INSERT INTO Users (username, password, phoneNumber, role, status, can_book, can_host) VALUES ('admin', ?, '09120000003', 'admin', 'active', 1, 1)`,
            [hashedPassword]
          );
        });
      });
    } else {
      console.log("Database already contains data. Skipping seeding.");
    }
  });
};

const initDb = (callback) => {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS Users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        phoneNumber TEXT,
        role TEXT DEFAULT 'tourist', -- (tourist, host, admin)
        status TEXT NOT NULL DEFAULT 'active', -- (active, suspended)
        can_book INTEGER NOT NULL DEFAULT 1,
        can_host INTEGER NOT NULL DEFAULT 0
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS Accommodations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id INTEGER,
        name TEXT,
        address TEXT,
        price_per_night REAL,
        description TEXT,
        star_rating INTEGER,
        image_url TEXT,
        status TEXT DEFAULT 'pending_review',-- (draft, pending_review, approved, rejected, suspended)
        FOREIGN KEY (owner_id) REFERENCES Users (id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS Bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        accommodation_id INTEGER,
        check_in_date TEXT,
        check_out_date TEXT,
        number_of_guests INTEGER,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES Users (id),
        FOREIGN KEY (accommodation_id) REFERENCES Accommodations (id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS Favorites (
        user_id INTEGER,
        accommodation_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES Users (id) ON DELETE CASCADE,
        FOREIGN KEY (accommodation_id) REFERENCES Accommodations (id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, accommodation_id)
      )
    `);

    db.run(
      `
      CREATE TABLE IF NOT EXISTS Reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id INTEGER UNIQUE,
        user_id INTEGER,
        accommodation_id INTEGER,
        rating INTEGER,
        comment TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (booking_id) REFERENCES Bookings (id),
        FOREIGN KEY (user_id) REFERENCES Users (id),
        FOREIGN KEY (accommodation_id) REFERENCES Accommodations (id)
      )
    `,
      () => {
        console.log("Database tables checked/created.");
        seedDb();
        if (callback) callback();
      }
    );
  });
};

module.exports = { db, initDb, seedDb };
