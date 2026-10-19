const Project = require('../models/Project');

const getProjects = async (req, res) => {
  try {
    const { search, isPublic, sort } = req.query;
    const filter = {};

    if (isPublic === 'true') {
      // Return public projects (or legacy projects where isPublic is undefined)
      filter.isPublic = { $ne: false };
    } else if (isPublic === 'false') {
      filter.isPublic = false;
    }

    if (search && search.trim()) {
      const q = search.trim();
      const words = q.split(/\s+/).filter(Boolean);
      const wordConditions = words.map((word) => {
        const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, 'i');
        return {
          $or: [
            { name: regex },
            { creatorName: regex },
            { description: regex },
            { 'items.productName': regex },
            { 'items.areaName': regex },
            { 'items.sku': regex },
            { 'items.summaryRows.value': regex },
            { 'items.summaryRows.label': regex },
            { 'items.summaryRows.stepTitle': regex },
          ],
        };
      });

      if (wordConditions.length > 0) {
        filter.$and = wordConditions;
      }
    }

    let sortOption = { updatedAt: -1 };
    if (sort === 'oldest') sortOption = { createdAt: 1 };
    if (sort === 'name') sortOption = { name: 1 };

    const projects = await Project.find(filter).sort(sortOption);
    res.json({ success: true, count: projects.length, data: projects });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve projects.', error: err.message });
  }
};

const getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve project.', error: err.message });
  }
};

const createProject = async (req, res) => {
  try {
    const { name, isPublic = true, creatorName = 'Community Designer', description = '' } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Project name is required.' });
    }
    const project = await Project.create({
      name: name.trim(),
      description: (description || '').trim(),
      creatorName: (creatorName || 'Community Designer').trim(),
      isPublic: Boolean(isPublic),
      items: [],
    });
    res.status(201).json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create project.', error: err.message });
  }
};

const addItemToProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const {
      areaName,
      productId,
      productName,
      sku,
      quantity = 1,
      unitPrice = 0,
      stepSelections = {},
      summaryRows = [],
      image = '',
    } = req.body;

    if (!areaName || !areaName.trim()) {
      return res.status(400).json({ success: false, message: 'Area or room name is required.' });
    }

    const qty = Math.max(1, Number(quantity) || 1);
    const unitP = Math.max(0, Number(unitPrice) || 0);
    const totalP = Math.round(unitP * qty * 100) / 100;

    project.items.push({
      areaName: areaName.trim(),
      productId: productId || '',
      productName: productName || 'Custom Lampshade',
      sku: sku || '',
      quantity: qty,
      unitPrice: unitP,
      totalPrice: totalP,
      stepSelections,
      summaryRows,
      image,
    });

    await project.save();
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to add item to project.', error: err.message });
  }
};

const removeItemFromProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const itemId = req.params.itemId;
    project.items = project.items.filter((item) => item._id !== itemId && item.id !== itemId);
    await project.save();

    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to remove item from project.', error: err.message });
  }
};

const updateProjectStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    if (status) {
      project.status = status;
      if (status === 'ordered') {
        project.orderedAt = new Date();
      }
    }

    await project.save();
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update project status.', error: err.message });
  }
};

const deleteProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }
    res.json({ success: true, message: 'Project deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete project.', error: err.message });
  }
};

const updateProject = async (req, res) => {
  try {
    const { name, isPublic, creatorName, description } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    if (name && name.trim()) project.name = name.trim();
    if (typeof isPublic === 'boolean') project.isPublic = isPublic;
    if (creatorName !== undefined) project.creatorName = creatorName.trim();
    if (description !== undefined) project.description = description.trim();

    await project.save();
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update project.', error: err.message });
  }
};

const updateProjectVisibility = async (req, res) => {
  try {
    const { isPublic } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    project.isPublic = Boolean(isPublic);
    await project.save();
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update visibility.', error: err.message });
  }
};

const cloneProject = async (req, res) => {
  try {
    const original = await Project.findById(req.params.id);
    if (!original) {
      return res.status(404).json({ success: false, message: 'Original project not found.' });
    }

    const customName = req.body.name || `${original.name} (Copy)`;
    const newItems = (original.items || []).map((item) => ({
      areaName: item.areaName,
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      stepSelections: item.stepSelections,
      summaryRows: item.summaryRows,
      image: item.image,
    }));

    const cloned = await Project.create({
      name: customName.trim(),
      description: original.description || '',
      creatorName: req.body.creatorName || 'My Project',
      isPublic: req.body.isPublic !== undefined ? Boolean(req.body.isPublic) : true,
      items: newItems,
    });

    res.status(201).json({ success: true, data: cloned, message: 'Project cloned successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to clone project.', error: err.message });
  }
};

module.exports = {
  getProjects,
  getProject,
  createProject,
  updateProject,
  updateProjectVisibility,
  cloneProject,
  addItemToProject,
  removeItemFromProject,
  updateProjectStatus,
  deleteProject,
};
