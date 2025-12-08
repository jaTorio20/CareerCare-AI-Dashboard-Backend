import express from 'express';
import Test from '../models/Test';

const router = express.Router()

router.post('/', async (req, res, next) => {
  try {
    const { name } = req.body;
    const newTest = new Test({ name });
    await newTest.save();
    res.status(201).json(newTest);
  } catch (err) {
    console.error("Failed to create test",err);
    next(err);
  }
});

export default router;

