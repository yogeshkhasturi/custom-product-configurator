const express = require('express');
const {
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
} = require('../controllers/projectController');

const router = express.Router();

router.get('/', getProjects);
router.post('/', createProject);
router.get('/:id', getProject);
router.put('/:id', updateProject);
router.patch('/:id/visibility', updateProjectVisibility);
router.post('/:id/clone', cloneProject);
router.delete('/:id', deleteProject);
router.post('/:id/items', addItemToProject);
router.delete('/:id/items/:itemId', removeItemFromProject);
router.patch('/:id/status', updateProjectStatus);

module.exports = router;
