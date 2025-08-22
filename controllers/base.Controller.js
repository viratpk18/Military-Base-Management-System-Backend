// controllers/base.controller.js
import Base from '../DB/models/base.model.js';

// CREATE
export const createBase = async (req, res) => {
  try {
    const { name, state, district } = req.body;

    const existing = await Base.findOne({ name });
    if (existing) return res.status(400).json({ message: 'Base with this name already exists' });

    const base = await Base.create({ name, state, district });
    res.status(201).json({ message: 'Base created successfully', base });
  } catch (error) {
    console.error('Error creating base:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// READ ALL
export const getAllBases = async (req, res) => {
  try {
    const bases = await Base.find().sort({ createdAt: -1 });
    res.status(200).json({ bases });
  } catch (error) {
    console.error('Error fetching bases:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// READ ONE
export const getBaseById = async (req, res) => {
  try {
    const base = await Base.findById(req.params.id);
    if (!base) return res.status(404).json({ message: 'Base not found' });

    res.status(200).json({ base });
  } catch (error) {
    console.error('Error fetching base:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// UPDATE
export const updateBase = async (req, res) => {
  try {
    const base = await Base.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!base) return res.status(404).json({ message: 'Base not found' });

    res.status(200).json({ message: 'Base updated successfully', base });
  } catch (error) {
    console.error('Error updating base:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// DELETE
export const deleteBase = async (req, res) => {
  try {
    const base = await Base.findByIdAndDelete(req.params.id);
    if (!base) return res.status(404).json({ message: 'Base not found' });

    res.status(200).json({ message: 'Base deleted successfully' });
  } catch (error) {
    console.error('Error deleting base:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
