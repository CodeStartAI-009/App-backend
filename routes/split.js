const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const SplitGroup = require("../models/SplitGroup");
 

const User = require("../models/User"); 
/* Create Group */
router.post("/create", auth, async (req, res) => {
  try {
    const { title, creatorUPI, participants } = req.body;

    if (!title || !creatorUPI || !participants || participants.length === 0) {
      return res.json({ ok: false, error: "Missing fields" });
    }

    const finalParticipants = [];

    for (const p of participants) {
      const identifier = p.identifier.toLowerCase();

      const user =
        (await User.findOne({ email: identifier })) ||
        (await User.findOne({ phone: identifier })) ||
        (await User.findOne({ userName: identifier }));

      if (!user) {
        return res.json({
          ok: false,
          error: `User not found: ${identifier}`,
        });
      }

      finalParticipants.push({
        userId: user._id,
        amountToPay: p.amountToPay,
      });
    }

    const group = await SplitGroup.create({
      title,
      creatorId: req.user._id,
      creatorUPI,
      participants: finalParticipants,
    });

    res.json({ ok: true, group });
  } catch (err) {
    console.log("CREATE GROUP ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});


/* Get groups created by user */
router.get("/my-created", auth, async (req, res) => {
  const groups = await SplitGroup.find({ creatorId: req.user._id })
    .populate("participants.userId", "name");
  res.json({ ok: true, groups });
});

/* Groups where user is a participant */
router.get("/my-participating", auth, async (req, res) => {
  const groups = await SplitGroup.find({
    "participants.userId": req.user._id,
    creatorId: { $ne: req.user._id },
  }).populate("creatorId", "name");
  res.json({ ok: true, groups });
});

/* Mark complete */
router.post("/complete/:groupId", auth, async (req, res) => {
  const group = await SplitGroup.findById(req.params.groupId);

  if (!group) return res.json({ ok: false, error: "Group not found" });
  if (String(group.creatorId) !== String(req.user._id))
    return res.json({ ok: false, error: "Only creator can mark complete" });

  group.isCompleted = true;
  await group.save();

  res.json({ ok: true });
});

/* Edit group */
/* Edit group */
router.patch("/edit/:groupId", auth, async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await SplitGroup.findById(groupId);
    if (!group) return res.json({ ok: false, error: "Group not found" });

    if (String(group.creatorId) !== String(req.user._id))
      return res.json({ ok: false, error: "Only creator can edit" });

    const { title, creatorUPI, participants } = req.body;

    if (title) group.title = title;
    if (creatorUPI) group.creatorUPI = creatorUPI;

    // rebuild participant array safely
    const updatedParticipants = [];

    for (const p of participants) {
      let user = null;

      // if participant already has userId → trust it
      if (p.userId) {
        user = await User.findById(p.userId);
      } else {
        // otherwise resolve identifier (email / username / phone)
        user =
          (await User.findOne({ email: p.identifier })) ||
          (await User.findOne({ userName: p.identifier })) ||
          (await User.findOne({ phone: p.identifier }));
      }

      if (!user) {
        return res.json({
          ok: false,
          error: `User not found: ${p.identifier}`,
        });
      }

      updatedParticipants.push({
        userId: user._id,
        amountToPay: p.amountToPay,
      });
    }

    group.participants = updatedParticipants;

    await group.save();

    res.json({ ok: true, group });
  } catch (err) {
    console.log("EDIT ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* -----------------------------------------
   Get single group details
------------------------------------------*/
router.get("/:groupId", auth, async (req, res) => {
  try {
    const group = await SplitGroup.findById(req.params.groupId)
      .populate("creatorId", "name email")
      .populate("participants.userId", "name email");

    if (!group) {
      return res.status(404).json({ ok: false, error: "Group not found" });
    }

    res.json({ ok: true, group });
  } catch (err) {
    console.log("GET GROUP ERROR:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

module.exports = router;
