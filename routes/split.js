// routes/splitGroups.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const SplitGroup = require("../models/SplitGroup");
const User = require("../models/User");
const { pushAndSave } = require("../utils/notifyHelpers"); // pushAndSave(userId, title, message, io)

///////////////////////
// Create Group
///////////////////////
router.post("/create", auth, async (req, res) => {
  const io = req.app.get("io"); // may be undefined in some environments
  try {
    const { title, creatorUPI, participants } = req.body;

    if (!title || !creatorUPI || !participants || !Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({ ok: false, error: "Missing fields: title, creatorUPI and participants are required" });
    }

    const finalParticipants = [];

    // Resolve each participant to a valid user ID
    for (const p of participants) {
      const identifier = (p.identifier || "").toString().trim().toLowerCase();
      if (!identifier) {
        return res.status(400).json({ ok: false, error: "Each participant must have an identifier" });
      }

      // Try to find by email, phone, or username
      const user =
        (await User.findOne({ email: identifier })) ||
        (await User.findOne({ phone: identifier })) ||
        (await User.findOne({ userName: identifier }));

      if (!user) {
        return res.status(404).json({ ok: false, error: `User not found: ${identifier}` });
      }

      finalParticipants.push({
        userId: user._id,
        amountToPay: Number(p.amountToPay) || 0,
      });
    }

    const group = await SplitGroup.create({
      title,
      creatorId: req.user._id,
      creatorUPI,
      participants: finalParticipants,
    });

    // Notify participants (and optionally creator)
    const creatorName = req.user.name || req.user.userName || "Someone";
    const notifTitle = "Split Created";
    const notifMessage = `${creatorName} created a split: "${title}"`;

    // notify each participant (concurrently)
    await Promise.all(
      finalParticipants.map(async (p) => {
        try {
          await pushAndSave(p.userId, notifTitle, notifMessage, io);
        } catch (e) {
          console.warn("notify participant failed:", p.userId, e?.message || e);
        }
      })
    );

    // also notify creator (optional)
    try {
      await pushAndSave(req.user._id, "Split Created", `You created the split "${title}"`, io);
    } catch (e) {
      // ignore
    }

    return res.json({ ok: true, group });
  } catch (err) {
    console.error("CREATE GROUP ERROR:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

///////////////////////
// Get groups created by user
///////////////////////
router.get("/my-created", auth, async (req, res) => {
  try {
    const groups = await SplitGroup.find({ creatorId: req.user._id })
      .populate("participants.userId", "name email userName")
      .sort({ createdAt: -1 });

    return res.json({ ok: true, groups });
  } catch (err) {
    console.error("MY CREATED GROUPS ERROR:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

///////////////////////
// Groups where user is a participant
///////////////////////
router.get("/my-participating", auth, async (req, res) => {
  try {
    const groups = await SplitGroup.find({
      "participants.userId": req.user._id,
      creatorId: { $ne: req.user._id },
    })
      .populate("creatorId", "name email userName")
      .sort({ createdAt: -1 });

    return res.json({ ok: true, groups });
  } catch (err) {
    console.error("MY PARTICIPATING GROUPS ERROR:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

///////////////////////
// Mark complete
///////////////////////
router.post("/complete/:groupId", auth, async (req, res) => {
  const io = req.app.get("io");
  try {
    const group = await SplitGroup.findById(req.params.groupId);
    if (!group) return res.status(404).json({ ok: false, error: "Group not found" });

    if (String(group.creatorId) !== String(req.user._id))
      return res.status(403).json({ ok: false, error: "Only creator can mark complete" });

    if (group.isCompleted) return res.json({ ok: true, message: "Group already completed", group });

    group.isCompleted = true;
    await group.save();

    // Notify participants
    const notifTitle = "Split Completed";
    const notifMessage = `Split "${group.title}" has been marked complete by the creator.`;

    await Promise.all(
      group.participants.map(async (p) => {
        try {
          await pushAndSave(p.userId, notifTitle, notifMessage, io);
        } catch (e) {
          console.warn("notify participant failed:", p.userId, e?.message || e);
        }
      })
    );

    // Notify creator too
    try {
      await pushAndSave(req.user._id, notifTitle, `You marked "${group.title}" as complete.`, io);
    } catch (e) {}

    return res.json({ ok: true, group });
  } catch (err) {
    console.error("COMPLETE GROUP ERROR:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

///////////////////////
// Edit group
///////////////////////
router.patch("/edit/:groupId", auth, async (req, res) => {
  const io = req.app.get("io");
  try {
    const { groupId } = req.params;
    const { title, creatorUPI, participants } = req.body;

    const group = await SplitGroup.findById(groupId);
    if (!group) return res.status(404).json({ ok: false, error: "Group not found" });

    if (String(group.creatorId) !== String(req.user._id))
      return res.status(403).json({ ok: false, error: "Only creator can edit" });

    if (title) group.title = title;
    if (creatorUPI) group.creatorUPI = creatorUPI;

    // If participants provided, rebuild participant array safely
    if (participants && Array.isArray(participants)) {
      const updatedParticipants = [];

      for (const p of participants) {
        let user = null;

        if (p.userId) {
          user = await User.findById(p.userId);
        } else {
          const identifier = (p.identifier || "").toString().trim().toLowerCase();
          if (!identifier) {
            return res.status(400).json({ ok: false, error: "Participant identifier required" });
          }

          user =
            (await User.findOne({ email: identifier })) ||
            (await User.findOne({ userName: identifier })) ||
            (await User.findOne({ phone: identifier }));
        }

        if (!user) {
          return res.status(404).json({ ok: false, error: `User not found: ${p.identifier || p.userId}` });
        }

        updatedParticipants.push({
          userId: user._id,
          amountToPay: Number(p.amountToPay) || 0,
        });
      }

      group.participants = updatedParticipants;
    }

    await group.save();

    // Notify participants about edit
    const notifTitle = "Split Updated";
    const notifMessage = `Split "${group.title}" has been updated by the creator.`;

    await Promise.all(
      group.participants.map(async (p) => {
        try {
          await pushAndSave(p.userId, notifTitle, notifMessage, io);
        } catch (e) {
          console.warn("notify participant failed:", p.userId, e?.message || e);
        }
      })
    );

    // Notify creator
    try {
      await pushAndSave(req.user._id, "Split Updated", `You updated the split "${group.title}".`, io);
    } catch (e) {}

    return res.json({ ok: true, group });
  } catch (err) {
    console.error("EDIT ERROR:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

///////////////////////
// Get single group details
///////////////////////
router.get("/:groupId", auth, async (req, res) => {
  try {
    const group = await SplitGroup.findById(req.params.groupId)
      .populate("creatorId", "name email userName")
      .populate("participants.userId", "name email userName");

    if (!group) {
      return res.status(404).json({ ok: false, error: "Group not found" });
    }

    return res.json({ ok: true, group });
  } catch (err) {
    console.error("GET GROUP ERROR:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

module.exports = router;
