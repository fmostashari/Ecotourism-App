const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { db, initDb } = require("./database.js");
const jwt = require("jsonwebtoken");

const SECRET_KEY = "tourism_app_030455422";

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

initDb(() => {
  console.log("Database initialization complete.");
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

const authenticateAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).send({ message: "Access Forbidden: Admin role required." });
  }
};

const authenticateHost = (req, res, next) => {
  if (req.user && (req.user.role === "host" || req.user.role === "admin")) {
    if (req.user.can_host === 1) {
      next(); // کاربر میزبان یا ادمینِ مجاز است
    } else {
      res.status(403).send({
        message: "Access Forbidden: Hosting privileges are suspended.",
      });
    }
  } else {
    res
      .status(403)
      .send({ message: "Access Forbidden: Host or Admin role required." });
  }
};

const checkCanBook = (req, res, next) => {
  if (req.user && req.user.status === "active" && req.user.can_book === 1) {
    next();
  } else {
    res.status(403).send({
      message:
        "Booking Forbidden: Your account is suspended or booking is disabled.",
    });
  }
};

app.post("/Register", async (req, res) => {
  try {
    const { UserName, Password, PhoneNumber } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(Password, salt);

    const sql = `INSERT INTO Users (username, password, phoneNumber, role, status, can_book, can_host) VALUES (?, ?, ?, 'tourist', 'active', 1, 0)`;
    db.run(sql, [UserName, hashedPassword, PhoneNumber], function (err) {
      if (err) {
        return res
          .status(400)
          .json({ code: 700, message: "Username already exists." });
      }

      const userPayload = {
        id: this.lastID,
        username: UserName,
        role: "tourist",
        status: "active",
        can_book: 1,
        can_host: 0,
      };

      const token = jwt.sign(userPayload, SECRET_KEY, { expiresIn: "7d" });

      res.status(201).json({
        code: 600,
        message: "User registered successfully.",
        data: {
          token: token,
          user: userPayload,
        },
      });
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.post("/Login", (req, res) => {
  try {
    const { UserName, Password } = req.body;
    const sql = `SELECT * FROM Users WHERE username = ?`;

    db.get(sql, [UserName], async (err, user) => {
      if (err) {
        return res.status(500).json({ message: "Server error" });
      }

      if (!user) {
        return res.status(404).json({ code: 1, message: "User not found." });
      }

      const isMatch = await bcrypt.compare(Password, user.password);
      if (!isMatch) {
        return res
          .status(400)
          .json({ code: 2, message: "Invalid credentials." });
      }
      const userPayload = {
        id: user.id,
        username: user.username,
        role: user.role,
        status: user.status,
        can_book: user.can_book,
        can_host: user.can_host,
      };

      const token = jwt.sign(userPayload, SECRET_KEY, { expiresIn: "7d" });

      res.status(200).json({
        code: 0,
        message: "Login successful",
        data: {
          token: token,
          user: userPayload,
        },
      });
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.post("/users/become-host", authenticateToken, (req, res) => {
  const userId = req.user.id;

  const newRole = "host";
  const canHost = 1;

  const sql = `UPDATE Users SET role = ?, can_host = ? WHERE id = ?`;
  db.run(sql, [newRole, canHost, userId], function (err) {
    if (err) {
      return res.status(500).json({ message: "Server error" });
    }

    const updatedUserPayload = {
      ...req.user,
      role: newRole,
      can_host: canHost,
    };

    const newToken = jwt.sign(updatedUserPayload, SECRET_KEY, {
      expiresIn: "7d",
    });

    res.status(200).json({
      message: "User role updated to host",
      data: {
        token: newToken,
        user: updatedUserPayload,
      },
    });
  });
});

app.get("/users/profile", authenticateToken, (req, res) => {
  const userId = req.user.id;
  const sql = `SELECT id, username, phoneNumber, role, status, can_book, can_host FROM Users WHERE id = ?`;

  db.get(sql, [userId], (err, user) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Server error", error: err.message });
    }
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    res.status(200).json({ data: user });
  });
});

app.put("/users/profile", authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { UserName, PhoneNumber } = req.body;

  if (!UserName || !PhoneNumber) {
    return res
      .status(400)
      .json({ message: "UserName and PhoneNumber are required." });
  }

  const sql = `UPDATE Users SET username = ?, phoneNumber = ? WHERE id = ?`;

  db.run(sql, [UserName, PhoneNumber, userId], function (err) {
    if (err) {
      if (err.message.includes("UNIQUE constraint failed: Users.username")) {
        return res
          .status(409)
          .json({ code: 700, message: "Username already exists." });
      }
      return res
        .status(500)
        .json({ message: "Server error", error: err.message });
    }

    const updatedUserPayload = {
      ...req.user,
      username: UserName,
    };

    const newToken = jwt.sign(updatedUserPayload, SECRET_KEY, {
      expiresIn: "7d",
    });

    res.status(200).json({
      message: "Profile updated successfully.",
      data: { token: newToken, user: updatedUserPayload },
    });
  });
});

app.post("/accommodations", authenticateToken, authenticateHost, (req, res) => {
  const { name, address, description, price, stars, image_url } = req.body;
  const owner_id = req.user.id;

  const sql = `INSERT INTO Accommodations (owner_id, name, address, price_per_night, description, star_rating, image_url, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_review')`;

  db.run(
    sql,
    [owner_id, name, address, price, description, stars, image_url],
    function (err) {
      if (err) {
        return res
          .status(500)
          .json({ message: "Server error", error: err.message });
      }
      res.status(201).json({
        message: "Accommodation submitted for review successfully",
        data: { id: this.lastID },
      });
    }
  );
});

app.get("/accommodations", (req, res) => {
  const sql = `SELECT * FROM Accommodations WHERE status = 'approved'`;

  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: "Server error" });
    }
    res.status(200).json({ data: rows });
  });
});

app.get("/accommodations/:id", (req, res) => {
  const sql = `SELECT * FROM Accommodations WHERE id = ?`;
  db.get(sql, [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ message: "Server error" });
    }
    if (!row) {
      return res.status(404).json({ message: "Accommodation not found" });
    }
    res.status(200).json({ data: row });
  });
});

app.get(
  "/host/accommodations",
  authenticateToken,
  authenticateHost,
  (req, res) => {
    const userId = req.user.id;

    const sql = `SELECT * FROM Accommodations WHERE owner_id = ?`;
    db.all(sql, [userId], (err, rows) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Server error", error: err.message });
      }
      res.status(200).json({ data: rows });
    });
  }
);

app.put(
  "/host/accommodations/:id",
  authenticateToken,
  authenticateHost,
  (req, res) => {
    const accommodationId = req.params.id;
    const userId = req.user.id;
    const { name, address, description, price, stars, image_url } = req.body;

    const getSql = `SELECT owner_id FROM Accommodations WHERE id = ?`;
    db.get(getSql, [accommodationId], (err, accommodation) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Server error", error: err.message });
      }
      if (!accommodation) {
        return res.status(404).json({ message: "Accommodation not found" });
      }
      if (accommodation.owner_id !== userId) {
        return res
          .status(403)
          .json({ message: "You are not the owner of this accommodation." });
      }

      const updateSql = `UPDATE Accommodations 
                       SET name = ?, address = ?, price_per_night = ?, description = ?, star_rating = ?, image_url = ?, status = 'pending_review'
                       WHERE id = ?`;
      db.run(
        updateSql,
        [name, address, price, description, stars, image_url, accommodationId],
        function (err) {
          if (err) {
            return res
              .status(500)
              .json({ message: "Server error", error: err.message });
          }
          res
            .status(200)
            .json({ message: "Accommodation updated successfully." });
        }
      );
    });
  }
);

app.delete(
  "/host/accommodations/:id",
  authenticateToken,
  authenticateHost,
  (req, res) => {
    const accommodationId = req.params.id;
    const userId = req.user.id;

    const getSql = `SELECT owner_id FROM Accommodations WHERE id = ?`;
    db.get(getSql, [accommodationId], (err, accommodation) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Server error", error: err.message });
      }
      if (!accommodation) {
        return res.status(404).json({ message: "Accommodation not found" });
      }
      if (accommodation.owner_id !== userId) {
        return res
          .status(403)
          .json({ message: "You are not the owner of this accommodation." });
      }

      const deleteSql = `DELETE FROM Accommodations WHERE id = ?`;
      db.run(deleteSql, [accommodationId], function (err) {
        if (err) {
          return res
            .status(500)
            .json({ message: "Server error", error: err.message });
        }
        res
          .status(200)
          .json({ message: "Accommodation deleted successfully." });
      });
    });
  }
);

app.post("/bookings", authenticateToken, checkCanBook, async (req, res) => {
  try {
    const {
      accommodation_id,
      check_in_date,
      check_out_date,
      number_of_guests,
    } = req.body;
    const user_id = req.user.id;

    if (
      !accommodation_id ||
      !check_in_date ||
      !check_out_date ||
      !number_of_guests
    ) {
      return res
        .status(400)
        .json({ message: "All booking fields are required." });
    }

    const inDate = new Date(check_in_date);
    const outDate = new Date(check_out_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(inDate.getTime()) || isNaN(outDate.getTime())) {
      return res
        .status(400)
        .json({ message: "Invalid date format. Use YYYY-MM-DD." });
    }
    if (inDate < today) {
      return res
        .status(400)
        .json({ message: "Check-in date cannot be in the past." });
    }
    if (outDate <= inDate) {
      return res
        .status(400)
        .json({ message: "Check-out date must be after check-in date." });
    }
    if (number_of_guests <= 0) {
      return res
        .status(400)
        .json({ message: "Number of guests must be at least 1." });
    }

    const accommodationSql = `SELECT id, status FROM Accommodations WHERE id = ?`;
    db.get(accommodationSql, [accommodation_id], async (err, accommodation) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Server error", error: err.message });
      }
      if (!accommodation) {
        return res.status(404).json({ message: "Accommodation not found." });
      }
      if (accommodation.status !== "approved") {
        return res
          .status(400)
          .json({ message: "Accommodation is not available for booking." });
      }

      const overlapSql = `
        SELECT COUNT(*) as count FROM Bookings
        WHERE accommodation_id = ?
          AND status IN ('pending', 'approved')
          AND (
            (check_in_date < ?) AND (check_out_date > ?)
          )
      `;
      db.get(
        overlapSql,
        [accommodation_id, check_out_date, check_in_date],
        (err, row) => {
          if (err) {
            return res
              .status(500)
              .json({ message: "Server error", error: err.message });
          }
          if (row.count > 0) {
            return res.status(409).json({
              message:
                "Accommodation is already booked for some part of the requested dates.",
            });
          }

          const insertSql = `
          INSERT INTO Bookings (user_id, accommodation_id, check_in_date, check_out_date, number_of_guests, status)
          VALUES (?, ?, ?, ?, ?, 'pending')
        `;
          db.run(
            insertSql,
            [
              user_id,
              accommodation_id,
              check_in_date,
              check_out_date,
              number_of_guests,
            ],
            function (err) {
              if (err) {
                return res
                  .status(500)
                  .json({ message: "Server error", error: err.message });
              }
              res.status(201).json({
                message: "Booking request created successfully.",
                data: { id: this.lastID, status: "pending" },
              });
            }
          );
        }
      );
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.get("/bookings/my-reservations", authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;

    const sql = `
      SELECT
        b.id,
        b.check_in_date,
        b.check_out_date,
        b.number_of_guests,
        b.status,
        b.created_at,
        a.id as accommodation_id,
        a.name as accommodation_name,
        a.address as accommodation_address,
        a.image_url as accommodation_image_url,
        a.price_per_night
      FROM Bookings b
      JOIN Accommodations a ON b.accommodation_id = a.id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
    `;

    db.all(sql, [userId], (err, rows) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Server error", error: err.message });
      }
      res.status(200).json({ data: rows });
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.get("/host/bookings", authenticateToken, authenticateHost, (req, res) => {
  try {
    const hostId = req.user.id;
    const sql = `
      SELECT
        b.id,
        b.check_in_date,
        b.check_out_date,
        b.number_of_guests,
        b.status,
        b.created_at,
        a.id as accommodation_id,
        a.name as accommodation_name,
        a.price_per_night,
        u.id as user_id,
        u.username as user_username,
        u.phoneNumber as user_phoneNumber
      FROM Bookings b
      JOIN Accommodations a ON b.accommodation_id = a.id
      JOIN Users u ON b.user_id = u.id
      WHERE a.owner_id = ?
      ORDER BY b.created_at DESC
    `;

    db.all(sql, [hostId], (err, rows) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Server error", error: err.message });
      }
      res.status(200).json({ data: rows });
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.post(
  "/host/bookings/:id/approve",
  authenticateToken,
  authenticateHost,
  (req, res) => {
    try {
      const bookingId = req.params.id;
      const hostId = req.user.id;

      const sql = `
      SELECT
        b.id,
        b.accommodation_id,
        b.status,
        a.owner_id
      FROM Bookings b
      JOIN Accommodations a ON b.accommodation_id = a.id
      WHERE b.id = ?
    `;

      db.get(sql, [bookingId], (err, booking) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Server error", error: err.message });
        }
        if (!booking) {
          return res
            .status(404)
            .json({ message: "Booking request not found." });
        }

        if (booking.owner_id !== hostId) {
          return res.status(403).json({
            message: "You are not authorized to approve this booking.",
          });
        }

        if (booking.status !== "pending") {
          return res.status(400).json({
            message: `Booking cannot be approved. Current status: ${booking.status}.`,
          });
        }

        const updateSql = `UPDATE Bookings SET status = 'approved' WHERE id = ?`;
        db.run(updateSql, [bookingId], function (err) {
          if (err) {
            return res
              .status(500)
              .json({ message: "Server error", error: err.message });
          }
          res.status(200).json({
            message: "Booking request approved successfully.",
            data: { id: bookingId, status: "approved" },
          });
        });
      });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

app.get("/favorites", authenticateToken, (req, res) => {
  const userId = req.user.id;
  const sql = `
    SELECT a.* FROM Accommodations a
    JOIN Favorites f ON a.id = f.accommodation_id
    WHERE f.user_id = ?
  `;

  db.all(sql, [userId], (err, rows) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Server error", error: err.message });
    }
    res.status(200).json({ data: rows });
  });
});

app.post("/favorites", authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { accommodation_id } = req.body;

  if (!accommodation_id) {
    return res.status(400).json({ message: "Accommodation ID is required." });
  }

  const sql = `INSERT INTO Favorites (user_id, accommodation_id) VALUES (?, ?)`;
  db.run(sql, [userId, accommodation_id], function (err) {
    if (err) {
      if (err.message.includes("UNIQUE constraint failed")) {
        return res.status(409).json({
          message: "This accommodation is already in your favorites.",
        });
      }
      return res
        .status(500)
        .json({ message: "Server error", error: err.message });
    }
    res.status(201).json({
      message: "Added to favorites successfully.",
      data: { userId, accommodation_id },
    });
  });
});

app.delete("/favorites/:accommodationId", authenticateToken, (req, res) => {
  const userId = req.user.id;
  const accommodationId = req.params.accommodationId;

  const sql = `DELETE FROM Favorites WHERE user_id = ? AND accommodation_id = ?`;
  db.run(sql, [userId, accommodationId], function (err) {
    if (err) {
      return res
        .status(500)
        .json({ message: "Server error", error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: "Favorite not found." });
    }
    res.status(200).json({ message: "Removed from favorites successfully." });
  });
});

app.post("/bookings/:id/cancel", authenticateToken, (req, res) => {
  const bookingId = req.params.id;
  const userId = req.user.id;

  const getSql = `SELECT user_id, status FROM Bookings WHERE id = ?`;
  db.get(getSql, [bookingId], (err, booking) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Server error", error: err.message });
    }
    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }
    if (booking.user_id !== userId) {
      return res
        .status(403)
        .json({ message: "You are not authorized to cancel this booking." });
    }
    if (!["pending", "approved"].includes(booking.status)) {
      return res.status(400).json({
        message: `This booking cannot be cancelled. Its status is '${booking.status}'.`,
      });
    }

    const updateSql = `UPDATE Bookings SET status = 'cancelled' WHERE id = ?`;
    db.run(updateSql, [bookingId], function (err) {
      if (err) {
        return res.status(500).json({
          message: "Server error while cancelling booking",
          error: err.message,
        });
      }
      if (this.changes === 0) {
        return res
          .status(404)
          .json({ message: "Booking not found during update." });
      }
      res.status(200).json({
        message: "Booking cancelled successfully.",
        data: { id: bookingId, status: "cancelled" },
      });
    });
  });
});

app.post(
  "/host/bookings/:id/reject",
  authenticateToken,
  authenticateHost,
  (req, res) => {
    try {
      const bookingId = req.params.id;
      const hostId = req.user.id;

      const sql = `
      SELECT
        b.id,
        b.status,
        a.owner_id
      FROM Bookings b
      JOIN Accommodations a ON b.accommodation_id = a.id
      WHERE b.id = ?
    `;

      db.get(sql, [bookingId], (err, booking) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Server error", error: err.message });
        }
        if (!booking) {
          return res
            .status(404)
            .json({ message: "Booking request not found." });
        }

        if (booking.owner_id !== hostId) {
          return res.status(403).json({
            message: "You are not authorized to reject this booking.",
          });
        }

        if (booking.status !== "pending") {
          return res.status(400).json({
            message: `Booking cannot be rejected. Current status: ${booking.status}.`,
          });
        }

        const updateSql = `UPDATE Bookings SET status = 'rejected' WHERE id = ?`;
        db.run(updateSql, [bookingId], function (err) {
          if (err) {
            return res
              .status(500)
              .json({ message: "Server error", error: err.message });
          }
          res.status(200).json({
            message: "Booking request rejected successfully.",
            data: { id: bookingId, status: "rejected" },
          });
        });
      });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

app.get(
  "/admin/listings/pending",
  authenticateToken,
  authenticateAdmin,
  (req, res) => {
    const sql = `SELECT * FROM Accommodations WHERE status = 'pending_review'`;
    db.all(sql, [], (err, rows) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Server error", error: err.message });
      }
      res.status(200).json({ data: rows });
    });
  }
);

app.put(
  "/admin/listings/:id/status",
  authenticateToken,
  authenticateAdmin,
  (req, res) => {
    const { status } = req.body;
    const accommodationId = req.params.id;

    const allowedStatuses = ["approved", "rejected", "suspended"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status provided." });
    }

    const sql = `UPDATE Accommodations SET status = ? WHERE id = ?`;
    db.run(sql, [status, accommodationId], function (err) {
      if (err) {
        return res
          .status(500)
          .json({ message: "Server error", error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ message: "Accommodation not found." });
      }
      res
        .status(200)
        .json({ message: `Accommodation status updated to ${status}.` });
    });
  }
);

app.get("/admin/users", authenticateToken, authenticateAdmin, (req, res) => {
  const sql = `SELECT id, username, phoneNumber, role, status, can_book, can_host FROM Users`;
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Server error", error: err.message });
    }
    res.status(200).json({ data: rows });
  });
});

app.put(
  "/admin/users/:id/access",
  authenticateToken,
  authenticateAdmin,
  (req, res) => {
    const userId = req.params.id;
    const { role, status, can_book, can_host } = req.body;

    if (
      role === undefined ||
      status === undefined ||
      can_book === undefined ||
      can_host === undefined
    ) {
      return res
        .status(400)
        .json({ message: "All access fields are required." });
    }

    if (
      Number(userId) === req.user.id &&
      req.user.role === "admin" &&
      role !== "admin"
    ) {
      return res
        .status(403)
        .json({ message: "Admin cannot revoke their own admin role." });
    }

    const sql = `UPDATE Users SET role = ?, status = ?, can_book = ?, can_host = ? WHERE id = ?`;
    db.run(sql, [role, status, can_book, can_host, userId], function (err) {
      if (err) {
        return res
          .status(500)
          .json({ message: "Server error", error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ message: "User not found." });
      }
      res.status(200).json({ message: "User access updated successfully." });
    });
  }
);

app.get(
  "/admin/users/:id",
  authenticateToken,
  authenticateAdmin,
  (req, res) => {
    const sql = `SELECT id, username, role, status, can_book, can_host FROM Users WHERE id = ?`;
    db.get(sql, [req.params.id], (err, row) => {
      if (err) return res.status(500).json({ message: "Server error" });
      if (!row) return res.status(404).json({ message: "User not found" });
      res.status(200).json({ data: row });
    });
  }
);

app.get(
  "/admin/dashboard",
  authenticateToken,
  authenticateAdmin,
  (req, res) => {
    let stats = {
      totalUsers: 0,
      totalHosts: 0,
      totalListings: 0,
      pendingListings: 0,
    };

    db.get("SELECT COUNT(*) as count FROM Users", [], (err, row) => {
      if (err) return res.status(500).json({ message: "DB error (Users)" });
      stats.totalUsers = row.count;

      db.get(
        "SELECT COUNT(*) as count FROM Users WHERE role = 'host'",
        [],
        (err, row) => {
          if (err) return res.status(500).json({ message: "DB error (Hosts)" });
          stats.totalHosts = row.count;

          db.get(
            "SELECT COUNT(*) as count FROM Accommodations",
            [],
            (err, row) => {
              if (err)
                return res
                  .status(500)
                  .json({ message: "DB error (All Listings)" });
              stats.totalListings = row.count;

              db.get(
                "SELECT COUNT(*) as count FROM Accommodations WHERE status = 'pending_review'",
                [],
                (err, row) => {
                  if (err)
                    return res
                      .status(500)
                      .json({ message: "DB error (Pending)" });
                  stats.pendingListings = row.count;

                  res.status(200).json({ data: stats });
                }
              );
            }
          );
        }
      );
    });
  }
);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server is running on http://10.195.163.64:${PORT}`);
});
