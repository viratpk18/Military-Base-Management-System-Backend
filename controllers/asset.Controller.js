// controllers/asset.controller.js
import Asset from '../DB/models/asset.model.js';

// CREATE
export const createAsset = async (req, res) => {
  try {
    const { name, category, unit, description } = req.body;

    const existing = await Asset.findOne({ name });
    if (existing) return res.status(400).json({ message: 'Asset already exists' });

    const asset = await Asset.create({ name, category, unit, description });
    res.status(201).json({ message: 'Asset created successfully', asset });
  } catch (error) {
    console.error('Error creating asset:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// READ ALL
export const getAllAssets = async (req, res) => {
  try {
    const assets = await Asset.find().sort({ createdAt: -1 });
    res.status(200).json({ assets });
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// READ ONE BY ID
export const getAssetById = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    res.status(200).json({ asset });
  } catch (error) {
    console.error('Error fetching asset:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// UPDATE
export const updateAsset = async (req, res) => {
  try {
    const asset = await Asset.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    res.status(200).json({ message: 'Asset updated successfully', asset });
  } catch (error) {
    console.error('Error updating asset:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// DELETE
export const deleteAsset = async (req, res) => {
  try {
    const asset = await Asset.findByIdAndDelete(req.params.id);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    res.status(200).json({ message: 'Asset deleted successfully' });
  } catch (error) {
    console.error('Error deleting asset:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
