'use client';
import { useState, useEffect, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import Link from 'next/link';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import PublicIcon from '@mui/icons-material/Public';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import FolderSpecialOutlinedIcon from '@mui/icons-material/FolderSpecialOutlined';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TuneIcon from '@mui/icons-material/Tune';
import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined';
import CloseIcon from '@mui/icons-material/Close';
import ShareIcon from '@mui/icons-material/Share';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import RemoveIcon from '@mui/icons-material/Remove';

import {
  getProjects,
  createProject,
  updateProject,
  updateProjectItem,
  deleteProject,
  removeItemFromProject,
  orderProjectToCart,
  toggleProjectVisibility,
  cloneProject,
} from '../../lib/projectsStorage';

const CATEGORY_TAGS = ['All', 'Lobby', 'Living Room', 'Restaurant', 'Guest Room', 'Bedroom', 'Pendant'];

export default function ProjectsPage() {
  const [activeTab, setActiveTab] = useState(0); // 0 = Explore Community Projects, 1 = My Projects
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState('All');
  const [sortBy, setSortBy] = useState('latest');

  // My Projects selection
  const [activeProjectId, setActiveProjectId] = useState(null);

  // Modal dialog states: Create
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectCreator, setNewProjectCreator] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectIsPublic, setNewProjectIsPublic] = useState(true);

  // Modal dialog states: Edit Project
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectCreator, setEditProjectCreator] = useState('');
  const [editProjectDesc, setEditProjectDesc] = useState('');
  const [editProjectIsPublic, setEditProjectIsPublic] = useState(true);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Modal dialog states: Edit Item
  const [editItemDialogOpen, setEditItemDialogOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editItemAreaName, setEditItemAreaName] = useState('');
  const [editItemQuantity, setEditItemQuantity] = useState(1);
  const [isSavingItemEdit, setIsSavingItemEdit] = useState(false);

  // Feedback notifications
  const [statusMessage, setStatusMessage] = useState({ text: '', severity: 'success' });
  const [isOrdering, setIsOrdering] = useState(false);
  const [isCloning, setIsCloning] = useState(false);

  useEffect(() => {
    document.title = 'Projects Showcase & Manager | Fenchel Shades';
    loadAllProjects();
  }, []);

  const loadAllProjects = async () => {
    setIsLoading(true);
    try {
      const list = await getProjects();
      setProjects(list || []);
      if (list && list.length > 0 && !activeProjectId) {
        setActiveProjectId(list[0].id);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (text, severity = 'success') => {
    setStatusMessage({ text, severity });
    setTimeout(() => {
      setStatusMessage({ text: '', severity: 'success' });
    }, 6000);
  };

  // Helper to match search query across all project metadata, items, and shade specifications
  const matchesProjectSearch = (p, query) => {
    if (!p) return false;
    if (!query || !query.trim()) return true;
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return true;

    return tokens.every((token) => {
      // 1. Project level
      if (p.name && p.name.toLowerCase().includes(token)) return true;
      if (p.creatorName && p.creatorName.toLowerCase().includes(token)) return true;
      if (p.description && p.description.toLowerCase().includes(token)) return true;

      // 2. Items level
      if (Array.isArray(p.items)) {
        const itemMatch = p.items.some((i) => {
          if (i.areaName && i.areaName.toLowerCase().includes(token)) return true;
          if (i.productName && i.productName.toLowerCase().includes(token)) return true;
          if (i.sku && i.sku.toLowerCase().includes(token)) return true;

          // Check custom shade summary specs (covering, fabric, attachment, dimensions, etc.)
          if (Array.isArray(i.summaryRows)) {
            const specMatch = i.summaryRows.some((s) => {
              const labelMatch = s.label && String(s.label).toLowerCase().includes(token);
              const valMatch = s.value && String(s.value).toLowerCase().includes(token);
              const titleMatch = s.stepTitle && String(s.stepTitle).toLowerCase().includes(token);
              return labelMatch || valMatch || titleMatch;
            });
            if (specMatch) return true;
          }

          // Check step selections
          if (i.stepSelections && typeof i.stepSelections === 'object') {
            try {
              if (JSON.stringify(i.stepSelections).toLowerCase().includes(token)) return true;
            } catch (e) { }
          }

          // Check image filename
          if (i.image && i.image.toLowerCase().includes(token)) return true;

          return false;
        });

        if (itemMatch) return true;
      }

      return false;
    });
  };

  // Debounced server-side search sync
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const remote = await getProjects({ search: searchQuery });
        if (Array.isArray(remote)) {
          setProjects(remote);
        }
      } catch (err) {
        console.error('Remote search error:', err);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filtered public projects for the "Explore" view
  const publicProjects = useMemo(() => {
    return projects
      .filter((p) => {
        // Must be public
        if (p.isPublic === false) return false;

        // Filter by tag if selected
        if (activeTag !== 'All') {
          const tagLower = activeTag.toLowerCase();
          const matchesTag =
            p.name?.toLowerCase().includes(tagLower) ||
            p.description?.toLowerCase().includes(tagLower) ||
            p.items?.some(
              (i) =>
                i.areaName?.toLowerCase().includes(tagLower) ||
                i.productName?.toLowerCase().includes(tagLower) ||
                i.summaryRows?.some(
                  (s) =>
                    String(s.value || '').toLowerCase().includes(tagLower) ||
                    String(s.label || '').toLowerCase().includes(tagLower)
                )
            );
          if (!matchesTag) return false;
        }

        // Filter by search query
        return matchesProjectSearch(p, searchQuery);
      })
      .sort((a, b) => {
        if (sortBy === 'oldest') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
        return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
      });
  }, [projects, searchQuery, activeTag, sortBy]);

  // Filtered projects for the "My Projects Workspace" view
  const workspaceProjects = useMemo(() => {
    return projects.filter((p) => matchesProjectSearch(p, searchQuery));
  }, [projects, searchQuery]);

  // Create Project
  const handleCreateProject = async () => {
    const trimmed = newProjectName.trim();
    if (!trimmed) return;

    const created = await createProject(trimmed, {
      isPublic: newProjectIsPublic,
      creatorName: newProjectCreator.trim() || 'Designer Community',
      description: newProjectDesc.trim(),
    });

    setNewProjectName('');
    setNewProjectCreator('');
    setNewProjectDesc('');
    setNewProjectIsPublic(true);
    setCreateDialogOpen(false);

    await loadAllProjects();
    if (created?.id) {
      setActiveProjectId(created.id);
      setActiveTab(1); // switch to My Projects
    }
    showToast(`Project "${created.name}" created successfully!`);
  };

  // Open Edit Project
  const handleOpenEditProject = (proj) => {
    if (!proj) return;
    setEditingProjectId(proj.id);
    setEditProjectName(proj.name || '');
    setEditProjectCreator(proj.creatorName || '');
    setEditProjectDesc(proj.description || '');
    setEditProjectIsPublic(proj.isPublic !== false);
    setEditDialogOpen(true);
  };

  // Save Edit Project
  const handleSaveEditProject = async () => {
    const trimmedName = editProjectName.trim();
    if (!trimmedName) {
      showToast('Project name cannot be empty.', 'error');
      return;
    }
    setIsSavingEdit(true);
    try {
      const updated = await updateProject(editingProjectId, {
        name: trimmedName,
        creatorName: editProjectCreator.trim(),
        description: editProjectDesc.trim(),
        isPublic: editProjectIsPublic,
      });
      if (updated) {
        setProjects((prev) =>
          prev.map((p) => (p.id === editingProjectId ? { ...p, ...updated } : p))
        );
        showToast(`Project "${trimmedName}" updated successfully!`);
        setEditDialogOpen(false);
      } else {
        showToast('Failed to update project.', 'error');
      }
    } catch (err) {
      console.error('Error updating project:', err);
      showToast('Error updating project.', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Open Edit Item
  const handleOpenEditItem = (proj, item) => {
    if (!item) return;
    setEditingItemId(item.id);
    setEditItemAreaName(item.areaName || '');
    setEditItemQuantity(item.quantity || 1);
    setEditItemDialogOpen(true);
  };

  // Save Edit Item
  const handleSaveEditItem = async () => {
    const trimmedArea = editItemAreaName.trim();
    if (!trimmedArea) {
      showToast('Area or room name is required.', 'error');
      return;
    }
    const q = Math.max(1, Number(editItemQuantity) || 1);
    setIsSavingItemEdit(true);
    try {
      const updated = await updateProjectItem(activeProject?.id, editingItemId, {
        areaName: trimmedArea,
        quantity: q,
      });
      if (updated) {
        await loadAllProjects();
        showToast(`Shade item updated! (${trimmedArea}, Qty: ${q})`);
        setEditItemDialogOpen(false);
      } else {
        showToast('Failed to update shade item.', 'error');
      }
    } catch (err) {
      console.error('Error updating item:', err);
      showToast('Error updating shade item.', 'error');
    } finally {
      setIsSavingItemEdit(false);
    }
  };

  // Quick adjust item quantity
  const handleUpdateItemQuantity = async (projId, itemId, newQty) => {
    const q = Math.max(1, Number(newQty) || 1);
    try {
      await updateProjectItem(projId, itemId, { quantity: q });
      await loadAllProjects();
      showToast(`Quantity updated to ${q}.`);
    } catch (err) {
      console.error('Error updating quantity:', err);
      showToast('Failed to update quantity.', 'error');
    }
  };

  // Delete Project
  const handleDeleteProject = async (projId) => {
    if (typeof window !== 'undefined' && !window.confirm('Are you sure you want to delete this project?')) {
      return;
    }
    const updated = await deleteProject(projId);
    setProjects(updated || []);
    if (activeProjectId === projId) {
      setActiveProjectId(updated?.[0]?.id || null);
    }
    showToast('Project deleted successfully.', 'info');
  };

  // Remove Item
  const handleRemoveItem = async (projId, itemId) => {
    await removeItemFromProject(projId, itemId);
    await loadAllProjects();
    showToast('Item removed from project.', 'info');
  };

  // Toggle Visibility
  const handleToggleVisibility = async (projId, currentVisibility) => {
    const newVisibility = !currentVisibility;
    await toggleProjectVisibility(projId, newVisibility);
    setProjects((prev) =>
      prev.map((p) => (p.id === projId ? { ...p, isPublic: newVisibility } : p))
    );
    showToast(
      newVisibility
        ? 'Project is now PUBLIC and searchable in the Community Showcase!'
        : 'Project is now PRIVATE.'
    );
  };

  // Clone Project
  const handleCloneProject = async (proj) => {
    setIsCloning(true);
    try {
      const cloned = await cloneProject(proj.id, `${proj.name} (Customized)`);
      await loadAllProjects();
      if (cloned?.id) {
        setActiveProjectId(cloned.id);
        setActiveTab(1); // Jump to My Projects
      }
      if (viewingProject) setViewingProject(null);
      showToast(`Cloned "${proj.name}" into your workspace! You can now customize it.`);
    } catch (err) {
      showToast('Failed to clone project.', 'error');
    } finally {
      setIsCloning(false);
    }
  };

  // Order Project To Cart
  const handleOrderProject = async (proj) => {
    setIsOrdering(true);
    try {
      const res = await orderProjectToCart(proj.id, proj);
      if (res.success) {
        showToast(
          `Project "${proj.name}" added to cart! ${res.itemsCount} areas (${res.totalUnits} shades total) are ready for checkout.`
        );
        await loadAllProjects();
        if (viewingProject) setViewingProject(null);
      } else {
        showToast(res.message || 'Failed to order project.', 'error');
      }
    } catch (err) {
      showToast('Error adding project to cart.', 'error');
    } finally {
      setIsOrdering(false);
    }
  };

  const activeProject =
    (activeTab === 1 && workspaceProjects.length > 0
      ? workspaceProjects.find((p) => p.id === activeProjectId) || workspaceProjects[0]
      : projects.find((p) => p.id === activeProjectId) || projects[0]) || null;
  const totalShadesCount = activeProject?.items?.reduce((acc, item) => acc + (item.quantity || 1), 0) || 0;
  const projectTotalCost = activeProject?.items?.reduce((acc, item) => acc + (item.totalPrice || 0), 0) || 0;

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', color: '#0f172a', py: { xs: 3, md: 5 } }}>
      <Box sx={{ maxWidth: 1240, mx: 'auto', px: { xs: 2, sm: 3, md: 4 } }}>

        {/* Top Header & Navigation */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Button
              component={Link}
              href="/products"
              size="small"
              startIcon={<ArrowBackIcon />}
              sx={{ color: '#64748b', textTransform: 'none', fontWeight: 600, fontSize: 13 }}
            >
              Back to Products
            </Button>
          </Box>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{
              bgcolor: '#0f172a',
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 700,
              fontSize: 13,
              px: 2.5,
              py: 1,
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.12)',
              '&:hover': { bgcolor: '#1e293b' },
            }}
          >
            Create New Project
          </Button>
        </Box>

        {/* Hero Banner */}
        <Box
          sx={{
            p: { xs: 3, md: 4 },
            mb: 4,
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0369a1 100%)',
            color: '#fff',
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.15)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ maxWidth: 760, position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(255,255,255,0.12)', px: 1.5, py: 0.5, borderRadius: '20px', mb: 1.5 }}>
              <PublicIcon sx={{ fontSize: 16, color: '#38bdf8' }} />
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#e0f2fe', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Fenchel Shades · Project Showcase
              </Typography>
            </Box>
            <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: 26, sm: 34, md: 40 }, mb: 1, lineHeight: 1.2 }}>
              Explore & Share Public Projects
            </Typography>
            <Typography sx={{ color: '#cbd5e1', fontSize: { xs: 14, sm: 16 }, mb: 3, lineHeight: 1.6 }}>
              Discover real bespoke lighting installations crafted by designers and clients. Search public setups, inspect custom shade dimensions, or clone an entire project setup directly into your workspace.
            </Typography>

            {/* Live Search Input */}
            <Paper
              elevation={0}
              sx={{
                p: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '12px',
                bgcolor: '#fff',
                maxWidth: 620,
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              }}
            >
              <SearchIcon sx={{ color: '#64748b', ml: 1, mr: 1 }} />
              <TextField
                fullWidth
                variant="standard"
                placeholder="Search projects by name, designer, room (e.g. Lobby, Living Room), or shade style..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  disableUnderline: true,
                  sx: { fontSize: 14, color: '#0f172a' },
                }}
              />
              {searchQuery && (
                <IconButton size="small" onClick={() => setSearchQuery('')} sx={{ color: '#94a3b8' }}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              )}
            </Paper>
          </Box>
        </Box>

        {/* Status Toast Alert */}
        {statusMessage.text && (
          <Alert
            severity={statusMessage.severity}
            icon={<CheckCircleOutlineIcon fontSize="inherit" />}
            onClose={() => setStatusMessage({ text: '', severity: 'success' })}
            sx={{ mb: 3, borderRadius: '12px' }}
          >
            {statusMessage.text}
          </Alert>
        )}

        {/* View Switcher Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: '#e2e8f0', mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(e, val) => setActiveTab(val)}
            sx={{
              '& .MuiTabs-indicator': { bgcolor: '#0284c7', height: 3, borderRadius: '3px 3px 0 0' },
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 700,
                fontSize: 15,
                color: '#64748b',
                minHeight: 48,
                '&.Mui-selected': { color: '#0284c7' },
              },
            }}
          >
            <Tab
              icon={<ExploreOutlinedIcon sx={{ fontSize: 20 }} />}
              iconPosition="start"
              label={`Explore Public Projects (${publicProjects.length})`}
            />
            <Tab
              icon={<FolderSpecialOutlinedIcon sx={{ fontSize: 20 }} />}
              iconPosition="start"
              label={`My Projects Workspace (${workspaceProjects.length}${searchQuery.trim() ? ` / ${projects.length}` : ''})`}
            />
          </Tabs>
        </Box>

        {/* ============================================================== */}
        {/* TAB 0: PUBLIC PROJECTS EXPLORER                                */}
        {/* ============================================================== */}
        {activeTab === 0 && (
          <Box>
            {/* Filter chips & sorting bar */}
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                mb: 3,
              }}
            >
              {/* Category Filter Chips */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#64748b', mr: 0.5 }}>
                  Filter:
                </Typography>
                {CATEGORY_TAGS.map((tag) => {
                  const isSelected = activeTag === tag;
                  return (
                    <Chip
                      key={tag}
                      label={tag}
                      clickable
                      onClick={() => setActiveTag(tag)}
                      sx={{
                        fontWeight: 600,
                        fontSize: 12,
                        bgcolor: isSelected ? '#0f172a' : '#fff',
                        color: isSelected ? '#fff' : '#475569',
                        border: '1px solid',
                        borderColor: isSelected ? '#0f172a' : '#e2e8f0',
                        '&:hover': {
                          bgcolor: isSelected ? '#1e293b' : '#f1f5f9',
                        },
                      }}
                    />
                  );
                })}
              </Box>

              {/* Sort By Select */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Sort:</Typography>
                <FormControl size="small">
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    sx={{
                      bgcolor: '#fff',
                      fontSize: 13,
                      borderRadius: '8px',
                      height: 36,
                      minWidth: 140,
                    }}
                  >
                    <MenuItem value="latest">Latest First</MenuItem>
                    <MenuItem value="oldest">Oldest First</MenuItem>
                    <MenuItem value="name">Alphabetical</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>

            {/* Public Projects Grid */}
            {isLoading ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <CircularProgress size={36} sx={{ color: '#0284c7' }} />
                <Typography sx={{ color: '#64748b', mt: 2, fontSize: 14 }}>
                  Loading community projects...
                </Typography>
              </Box>
            ) : publicProjects.length === 0 ? (
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 4, md: 8 },
                  textAlign: 'center',
                  borderRadius: '16px',
                  border: '1px dashed #cbd5e1',
                  bgcolor: '#fff',
                }}
              >
                <PublicIcon sx={{ fontSize: 60, color: '#94a3b8', mb: 2 }} />
                <Typography variant="h6" fontWeight={700} sx={{ color: '#0f172a', mb: 1 }}>
                  No matching public projects found
                </Typography>
                <Typography sx={{ color: '#64748b', maxWidth: 440, mx: 'auto', mb: 3, fontSize: 14 }}>
                  {searchQuery && activeTag !== 'All'
                    ? `No projects matched "${searchQuery}" in the "${activeTag}" category.`
                    : searchQuery
                      ? `No projects matched "${searchQuery}". Try searching for another room, shade style, or material.`
                      : 'Be the first to share your bespoke shade project with the community!'}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                  {activeTag !== 'All' && (
                    <Button
                      variant="outlined"
                      onClick={() => setActiveTag('All')}
                      sx={{ borderRadius: '8px', textTransform: 'none' }}
                    >
                      Clear Category ({activeTag})
                    </Button>
                  )}
                  {searchQuery && (
                    <Button
                      variant="outlined"
                      onClick={() => setSearchQuery('')}
                      sx={{ borderRadius: '8px', textTransform: 'none' }}
                    >
                      Clear Search
                    </Button>
                  )}
                  {!searchQuery && activeTag === 'All' && (
                    <Button
                      variant="contained"
                      onClick={() => setCreateDialogOpen(true)}
                      sx={{ bgcolor: '#0f172a', borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}
                    >
                      Create First Public Project
                    </Button>
                  )}
                </Box>
              </Paper>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
                  gap: 3,
                }}
              >
                {publicProjects.map((proj) => {
                  const itemCount = proj.items?.length || 0;
                  const totalUnits = proj.items?.reduce((acc, i) => acc + (i.quantity || 1), 0) || 0;
                  const totalPrice = proj.items?.reduce((acc, i) => acc + (i.totalPrice || 0), 0) || 0;
                  const previewImages = proj.items?.map((i) => i.image).filter(Boolean) || [];

                  return (
                    <Paper
                      key={proj.id}
                      elevation={0}
                      sx={{
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        bgcolor: '#fff',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        overflow: 'hidden',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          borderColor: '#cbd5e1',
                          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
                          transform: 'translateY(-2px)',
                        },
                      }}
                    >
                      <Box sx={{ p: 2.5 }}>
                        {/* Top Meta: Public chip & Date */}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                          <Chip
                            icon={<PublicIcon sx={{ fontSize: '14px !important', color: '#0284c7' }} />}
                            label="Public Showcase"
                            size="small"
                            sx={{
                              bgcolor: '#f0f9ff',
                              color: '#0369a1',
                              fontWeight: 700,
                              fontSize: 11,
                              border: '1px solid #bae6fd',
                            }}
                          />
                          <Typography sx={{ fontSize: 11, color: '#94a3b8' }}>
                            {new Date(proj.createdAt || Date.now()).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </Typography>
                        </Box>

                        {/* Title & Creator */}
                        <Typography
                          variant="h6"
                          component={Link}
                          href={`/projects/${proj.id}`}
                          fontWeight={800}
                          sx={{
                            color: '#0f172a',
                            fontSize: 18,
                            lineHeight: 1.3,
                            mb: 0.5,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            textDecoration: 'none',
                            display: 'block',
                            transition: 'color 0.15s ease',
                            '&:hover': { color: '#0284c7' },
                          }}
                          title={proj.name}
                        >
                          {proj.name}
                        </Typography>
                        <Typography sx={{ fontSize: 13, color: '#64748b', mb: 2 }}>
                          Shared by <strong style={{ color: '#334155' }}>{proj.creatorName || 'Community Member'}</strong>
                        </Typography>

                        {/* Description (if present) */}
                        {proj.description && (
                          <Typography
                            sx={{
                              fontSize: 13,
                              color: '#475569',
                              mb: 2,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              lineHeight: 1.5,
                            }}
                          >
                            {proj.description}
                          </Typography>
                        )}

                        {/* Visual Thumbnail Gallery Preview */}
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            p: 1.5,
                            borderRadius: '12px',
                            bgcolor: '#f8fafc',
                            border: '1px solid #f1f5f9',
                            mb: 2,
                            minHeight: 64,
                          }}
                        >
                          {previewImages.length > 0 ? (
                            previewImages.slice(0, 4).map((img, idx) => (
                              <Box
                                key={idx}
                                sx={{
                                  width: 44,
                                  height: 44,
                                  borderRadius: '8px',
                                  bgcolor: '#fff',
                                  border: '1px solid #e2e8f0',
                                  p: 0.25,
                                  flexShrink: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <img
                                  src={img}
                                  alt="Shade Preview"
                                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                />
                              </Box>
                            ))
                          ) : (
                            <Typography sx={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                              No preview images attached
                            </Typography>
                          )}
                          {previewImages.length > 4 && (
                            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>
                              +{previewImages.length - 4} more
                            </Typography>
                          )}
                        </Box>

                        {/* Areas Tag chips */}
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
                          {proj.items?.slice(0, 3).map((item, iIdx) => (
                            <Chip
                              key={iIdx}
                              label={item.areaName}
                              size="small"
                              sx={{
                                fontSize: 11,
                                height: 22,
                                bgcolor: '#f1f5f9',
                                color: '#334155',
                                border: '1px solid #e2e8f0',
                              }}
                            />
                          ))}
                          {itemCount > 3 && (
                            <Chip
                              label={`+${itemCount - 3} areas`}
                              size="small"
                              sx={{ fontSize: 11, height: 22, bgcolor: '#f1f5f9', color: '#64748b' }}
                            />
                          )}
                        </Box>

                        {/* Metrics Row */}
                        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', pt: 1, borderTop: '1px dashed #e2e8f0' }}>
                          <Box>
                            <Typography sx={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                              Configuration
                            </Typography>
                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                              {itemCount} {itemCount === 1 ? 'Area' : 'Areas'} · {totalUnits} Shades
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography sx={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                              Project Total
                            </Typography>
                            <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#0284c7' }}>
                              ${totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>

                      {/* Card Bottom CTA Actions */}
                      <Box
                        sx={{
                          p: 1.5,
                          px: 2.5,
                          bgcolor: '#f8fafc',
                          borderTop: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 1,
                        }}
                      >
                        <Button
                          component={Link}
                          href={`/projects/${proj.id}`}
                          size="small"
                          startIcon={<VisibilityOutlinedIcon />}
                          sx={{ textTransform: 'none', fontWeight: 700, fontSize: 10, color: '#0f172a', border: "1px solid black", padding: "4px", borderRadius: "8px" }}
                        >
                          View Details
                        </Button>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Tooltip title="Share this project across apps">
                            <IconButton
                              size="small"
                              onClick={async () => {
                                if (typeof window !== 'undefined') {
                                  const url = `${window.location.origin}/projects/${proj.id}`;
                                  const shareData = {
                                    title: `${proj.name} | Fenchel Shades`,
                                    text: proj.description || `Check out "${proj.name}" bespoke lampshade project!`,
                                    url,
                                  };
                                  if (typeof navigator !== 'undefined' && navigator.share) {
                                    try {
                                      await navigator.share(shareData);
                                      return;
                                    } catch (err) {
                                      if (err.name === 'AbortError') return;
                                    }
                                  }
                                  navigator.clipboard.writeText(url);
                                  showToast(`Link to "${proj.name}" copied to clipboard!`);
                                }
                              }}
                              sx={{
                                border: '1px solid #e2e8f0',
                                bgcolor: '#fff',
                                color: '#475569',
                                '&:hover': { bgcolor: '#f1f5f9', color: '#0284c7' },
                              }}
                            >
                              <ShareIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Clone into your workspace to customize">
                            <IconButton
                              size="small"
                              onClick={() => handleCloneProject(proj)}
                              disabled={isCloning}
                              sx={{
                                border: '1px solid #e2e8f0',
                                bgcolor: '#fff',
                                color: '#475569',
                                '&:hover': { bgcolor: '#f1f5f9', color: '#0284c7' },
                              }}
                            >
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Button
                            size="small"
                            variant="contained"
                            disabled={isOrdering || itemCount === 0}
                            onClick={() => handleOrderProject(proj)}
                            startIcon={<ShoppingCartOutlinedIcon sx={{ fontSize: '16px !important' }} />}
                            sx={{
                              bgcolor: '#0f172a',
                              borderRadius: '6px',
                              textTransform: 'none',
                              fontWeight: 700,
                              fontSize: 12,
                              px: 1.5,
                              '&:hover': { bgcolor: '#1e293b' },
                            }}
                          >
                            Order Setup
                          </Button>
                        </Box>
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            )}
          </Box>
        )}

        {/* ============================================================== */}
        {/* TAB 1: MY PROJECTS WORKSPACE                                   */}
        {/* ============================================================== */}
        {activeTab === 1 && (
          <Box>
            {projects.length === 0 ? (
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 4, md: 8 },
                  textAlign: 'center',
                  borderRadius: '16px',
                  border: '1px dashed #cbd5e1',
                  bgcolor: '#fff',
                }}
              >
                <FolderSpecialOutlinedIcon sx={{ fontSize: 64, color: '#94a3b8', mb: 2 }} />
                <Typography variant="h5" fontWeight={700} sx={{ color: '#0f172a', mb: 1 }}>
                  No Projects Created Yet
                </Typography>
                <Typography sx={{ color: '#64748b', maxWidth: 460, mx: 'auto', mb: 3, fontSize: 14 }}>
                  Designers can group multiple custom shades for different spaces (Lobby, Guest Rooms, Dining) under a single project, order them all together, or publish them for the community.
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                  <Button
                    variant="contained"
                    onClick={() => setCreateDialogOpen(true)}
                    sx={{ bgcolor: '#0f172a', borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}
                  >
                    Create First Project
                  </Button>
                  <Button
                    component={Link}
                    href="/products"
                    variant="outlined"
                    sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                  >
                    Browse & Configure Shades
                  </Button>
                </Box>
              </Paper>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '320px 1fr' },
                  gap: 3,
                  alignItems: 'start',
                }}
              >
                {/* Left Sidebar: Projects Selector */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Your Projects ({workspaceProjects.length}{searchQuery.trim() ? ` / ${projects.length}` : ''})
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => setCreateDialogOpen(true)}
                      sx={{ textTransform: 'none', fontSize: 12, fontWeight: 700, color: '#0284c7' }}
                    >
                      New
                    </Button>
                  </Box>

                  {workspaceProjects.length === 0 ? (
                    <Paper
                      elevation={0}
                      sx={{ p: 2.5, textAlign: 'center', borderRadius: '12px', border: '1px dashed #cbd5e1', bgcolor: '#fff' }}
                    >
                      <Typography sx={{ fontSize: 13, color: '#64748b', mb: 1 }}>
                        No projects match "{searchQuery}"
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setSearchQuery('')}
                        sx={{ fontSize: 11, textTransform: 'none', borderRadius: '6px' }}
                      >
                        Clear Search
                      </Button>
                    </Paper>
                  ) : (
                    workspaceProjects.map((proj) => {
                      const isSelected = proj.id === activeProject?.id;
                      const totalItems = proj.items?.length || 0;
                      const totalCost = proj.items?.reduce((acc, i) => acc + (i.totalPrice || 0), 0) || 0;

                      return (
                        <Paper
                          key={proj.id}
                          elevation={0}
                          onClick={() => setActiveProjectId(proj.id)}
                          sx={{
                            p: 2,
                            borderRadius: '12px',
                            cursor: 'pointer',
                            border: '2px solid',
                            borderColor: isSelected ? '#0284c7' : '#e2e8f0',
                            bgcolor: isSelected ? '#f0f9ff' : '#fff',
                            transition: 'all 0.15s ease',
                            '&:hover': {
                              borderColor: isSelected ? '#0284c7' : '#cbd5e1',
                            },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                              {proj.name}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              {proj.status === 'ordered' && (
                                <Chip label="Ordered" size="small" color="success" sx={{ height: 20, fontSize: 11 }} />
                              )}
                              <Tooltip title="Edit project">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditProject(proj);
                                  }}
                                  sx={{ p: 0.5, color: '#64748b', '&:hover': { color: '#0284c7', bgcolor: '#f0f9ff' } }}
                                >
                                  <EditOutlinedIcon sx={{ fontSize: 15 }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography sx={{ fontSize: 12, color: '#64748b' }}>
                              {totalItems} {totalItems === 1 ? 'area' : 'areas'} • ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Typography>
                            <Chip
                              icon={proj.isPublic ? <PublicIcon sx={{ fontSize: '12px !important' }} /> : <LockOutlinedIcon sx={{ fontSize: '12px !important' }} />}
                              label={proj.isPublic ? 'Public' : 'Private'}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: 10,
                                fontWeight: 700,
                                bgcolor: proj.isPublic ? '#e0f2fe' : '#f1f5f9',
                                color: proj.isPublic ? '#0369a1' : '#64748b',
                              }}
                            />
                          </Box>
                        </Paper>
                      );
                    })
                  )}
                </Box>

                {/* Right Area: Active Project Workspace */}
                {activeProject && (
                  <Paper
                    elevation={0}
                    sx={{
                      borderRadius: '16px',
                      border: '1px solid #e2e8f0',
                      bgcolor: '#fff',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Project Workspace Header */}
                    <Box sx={{ p: { xs: 2.5, md: 3 }, borderBottom: '1px solid #e2e8f0', bgcolor: '#fff' }}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
                        <Box sx={{ maxWidth: { xs: '100%', md: 620 } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                              WORKSPACE
                            </Typography>
                            {/* Public/Private Toggle in Header */}
                            <FormControlLabel
                              control={
                                <Switch
                                  size="small"
                                  checked={Boolean(activeProject.isPublic)}
                                  onChange={() => handleToggleVisibility(activeProject.id, activeProject.isPublic)}
                                  color="primary"
                                />
                              }
                              label={
                                <Typography sx={{ fontSize: 12, fontWeight: 700, color: activeProject.isPublic ? '#0284c7' : '#64748b' }}>
                                  {activeProject.isPublic ? 'Public Showcase' : 'Private'}
                                </Typography>
                              }
                              sx={{ m: 0, ml: 1 }}
                            />
                          </Box>
                          <Typography variant="h4" fontWeight={800} sx={{ color: '#0f172a', mt: 0.25 }}>
                            {activeProject.name}
                          </Typography>
                          <Typography sx={{ fontSize: 13, color: '#64748b', mt: 0.5 }}>
                            Created {new Date(activeProject.createdAt).toLocaleDateString()} · Designer: {activeProject.creatorName || 'You'}
                          </Typography>
                          {activeProject.description && (
                            <Typography sx={{ fontSize: 13, color: '#475569', mt: 1, lineHeight: 1.5 }}>
                              {activeProject.description}
                            </Typography>
                          )}
                        </Box>

                        {/* Top Buttons */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<EditOutlinedIcon />}
                            onClick={() => handleOpenEditProject(activeProject)}
                            sx={{
                              borderRadius: '8px',
                              textTransform: 'none',
                              fontSize: 12,
                              fontWeight: 700,
                              color: '#0284c7',
                              borderColor: '#0284c7',
                              '&:hover': { bgcolor: '#f0f9ff', borderColor: '#0369a1' },
                            }}
                          >
                            Edit Project
                          </Button>

                          <Button
                            component={Link}
                            href={`/projects/${activeProject.id}`}
                            variant="outlined"
                            size="small"
                            startIcon={<VisibilityOutlinedIcon />}
                            sx={{ borderRadius: '8px', textTransform: 'none', fontSize: 12, fontWeight: 700, color: '#0f172a', borderColor: '#cbd5e1' }}
                          >
                            View Full Page
                          </Button>

                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            onClick={() => handleDeleteProject(activeProject.id)}
                            startIcon={<DeleteOutlineIcon />}
                            sx={{ borderRadius: '8px', textTransform: 'none', fontSize: 12 }}
                          >
                            Delete
                          </Button>

                          <Button
                            variant="contained"
                            disabled={isOrdering || (activeProject.items?.length || 0) === 0}
                            onClick={() => handleOrderProject(activeProject)}
                            startIcon={isOrdering ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <ShoppingCartOutlinedIcon />}
                            sx={{
                              bgcolor: '#0f172a',
                              borderRadius: '8px',
                              textTransform: 'none',
                              fontWeight: 700,
                              fontSize: 14,
                              px: 2.5,
                              py: 1,
                              '&:hover': { bgcolor: '#1e293b' },
                            }}
                          >
                            Order Project
                          </Button>
                        </Box>
                      </Box>
                    </Box>

                    {/* Areas & Items List */}
                    <Box sx={{ p: { xs: 2, md: 3 } }}>
                      {(!activeProject.items || activeProject.items.length === 0) ? (
                        <Box sx={{ textAlign: 'center', py: 6 }}>
                          <Typography sx={{ color: '#64748b', mb: 2, fontSize: 14 }}>
                            No shades have been added to this project yet.
                          </Typography>
                          <Button
                            component={Link}
                            href="/products"
                            variant="contained"
                            startIcon={<TuneIcon />}
                            sx={{ bgcolor: '#0f172a', borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}
                          >
                            Configure a Shade & Add Here
                          </Button>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {activeProject.items.map((item, index) => (
                            <Box
                              key={item.id || index}
                              sx={{
                                display: 'flex',
                                flexDirection: { xs: 'column', sm: 'row' },
                                alignItems: { sm: 'center' },
                                justifyContent: 'space-between',
                                p: 2,
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                bgcolor: '#f8fafc',
                                gap: 2,
                                transition: 'all 0.15s ease',
                                '&:hover': {
                                  borderColor: '#cbd5e1',
                                  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                                },
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
                                {item.image ? (
                                  <Box
                                    sx={{
                                      width: 70,
                                      height: 70,
                                      borderRadius: '10px',
                                      bgcolor: '#fff',
                                      border: '1px solid #e2e8f0',
                                      p: 0.5,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0,
                                    }}
                                  >
                                    <img
                                      src={item.image}
                                      alt={item.productName}
                                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                    />
                                  </Box>
                                ) : null}

                                <Box sx={{ minWidth: 0 }}>
                                  <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                                    {item.areaName}
                                  </Typography>
                                  <Typography sx={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>
                                    {item.productName}
                                  </Typography>

                                  {/* Specs tags */}
                                  {item.summaryRows && item.summaryRows.length > 0 && (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.75 }}>
                                      {item.summaryRows.map((s, sIdx) => (
                                        <Chip
                                          key={sIdx}
                                          label={`${s.label}: ${s.value}`}
                                          size="small"
                                          sx={{
                                            fontSize: 11,
                                            height: 22,
                                            bgcolor: '#fff',
                                            border: '1px solid #e2e8f0',
                                            color: '#334155',
                                          }}
                                        />
                                      ))}
                                    </Box>
                                  )}
                                </Box>
                              </Box>

                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: { xs: 'space-between', sm: 'flex-end' },
                                  gap: { xs: 1.5, sm: 2 },
                                  borderTop: { xs: '1px solid #e2e8f0', sm: 'none' },
                                  pt: { xs: 1.5, sm: 0 },
                                }}
                              >
                                {/* Quick Quantity Adjuster */}
                                <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', p: 0.25 }}>
                                  <IconButton
                                    size="small"
                                    disabled={item.quantity <= 1}
                                    onClick={() => handleUpdateItemQuantity(activeProject.id, item.id, item.quantity - 1)}
                                    sx={{ p: 0.5, color: '#475569' }}
                                    title="Decrease quantity"
                                  >
                                    <RemoveIcon sx={{ fontSize: 14 }} />
                                  </IconButton>
                                  <Typography sx={{ px: 1, fontSize: 13, fontWeight: 800, minWidth: 26, textAlign: 'center', color: '#0f172a' }}>
                                    {item.quantity}
                                  </Typography>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleUpdateItemQuantity(activeProject.id, item.id, item.quantity + 1)}
                                    sx={{ p: 0.5, color: '#475569' }}
                                    title="Increase quantity"
                                  >
                                    <AddIcon sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </Box>

                                <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                                  <Typography sx={{ fontSize: 11, color: '#94a3b8' }}>
                                    (${item.unitPrice.toFixed(2)} ea)
                                  </Typography>
                                </Box>

                                <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0f172a', minWidth: 80, textAlign: 'right' }}>
                                  ${item.totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </Typography>

                                <Tooltip title="Edit room name or specs">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenEditItem(activeProject, item)}
                                    sx={{ color: '#64748b', '&:hover': { color: '#0284c7', bgcolor: '#f0f9ff' } }}
                                  >
                                    <EditOutlinedIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>

                                <Tooltip title="Remove item">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleRemoveItem(activeProject.id, item.id)}
                                    sx={{ color: '#94a3b8', '&:hover': { color: '#ef4444', bgcolor: '#fef2f2' } }}
                                  >
                                    <DeleteOutlineIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Box>

                    {/* Summary Footer */}
                    {activeProject.items && activeProject.items.length > 0 && (
                      <Box
                        sx={{
                          p: { xs: 2.5, md: 3 },
                          bgcolor: '#f1f5f9',
                          borderTop: '1px solid #e2e8f0',
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 2,
                        }}
                      >
                        <Box>
                          <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                            Total Project Output
                          </Typography>
                          <Typography sx={{ fontSize: 14, color: '#334155', fontWeight: 600 }}>
                            {activeProject.items.length} Areas • {totalShadesCount} Total Custom Shades
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography sx={{ fontSize: 12, color: '#64748b' }}>Project Total</Typography>
                            <Typography sx={{ fontSize: { xs: 22, md: 26 }, fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
                              ${projectTotalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Typography>
                          </Box>

                          <Button
                            variant="contained"
                            disabled={isOrdering}
                            onClick={() => handleOrderProject(activeProject)}
                            startIcon={isOrdering ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <ShoppingCartOutlinedIcon />}
                            sx={{
                              bgcolor: '#0f172a',
                              borderRadius: '8px',
                              textTransform: 'none',
                              fontWeight: 700,
                              fontSize: 14,
                              px: 3,
                              py: 1.2,
                              '&:hover': { bgcolor: '#1e293b' },
                            }}
                          >
                            Order Project
                          </Button>
                        </Box>
                      </Box>
                    )}
                  </Paper>
                )}
              </Box>
            )}
          </Box>
        )}
      </Box>



      {/* ============================================================== */}
      {/* CREATE NEW PROJECT DIALOG                                      */}
      {/* ============================================================== */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#0f172a' }}>Create New Project</DialogTitle>
        <DialogContent sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Group custom shades under a project name to coordinate spaces or share your designs publicly.
          </Typography>

          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Project Name *"
            placeholder="e.g. Modern Villa, Hotel Lobby, Master Suite"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
          />

          <TextField
            fullWidth
            size="small"
            label="Your Name or Studio (Optional)"
            placeholder="e.g. Sarah Jenkins Interiors"
            value={newProjectCreator}
            onChange={(e) => setNewProjectCreator(e.target.value)}
          />

          <TextField
            fullWidth
            multiline
            rows={2}
            size="small"
            label="Project Description (Optional)"
            placeholder="Briefly describe the theme, fabric styles, or lighting concept..."
            value={newProjectDesc}
            onChange={(e) => setNewProjectDesc(e.target.value)}
          />

          <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: '#f0f9ff', border: '1px solid #bae6fd' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={newProjectIsPublic}
                  onChange={(e) => setNewProjectIsPublic(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0369a1' }}>
                    Make Project Public
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: '#0284c7' }}>
                    Allow other users to search, explore, and get inspired by this project.
                  </Typography>
                </Box>
              }
              sx={{ m: 0 }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateDialogOpen(false)} sx={{ color: '#64748b', textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateProject}
            sx={{ bgcolor: '#0f172a', borderRadius: '8px', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#1e293b' } }}
          >
            Create Project
          </Button>
        </DialogActions>
      </Dialog>

      {/* ============================================================== */}
      {/* EDIT PROJECT DETAILS DIALOG                                    */}
      {/* ============================================================== */}
      <Dialog
        open={editDialogOpen}
        onClose={() => !isSavingEdit && setEditDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Edit Project Details</span>
          <IconButton size="small" onClick={() => setEditDialogOpen(false)} disabled={isSavingEdit}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Update your project title, designer identity, and description.
          </Typography>

          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Project Name *"
            placeholder="e.g. Modern Villa, Hotel Lobby"
            value={editProjectName}
            onChange={(e) => setEditProjectName(e.target.value)}
            disabled={isSavingEdit}
          />

          <TextField
            fullWidth
            size="small"
            label="Designer / Studio Name"
            placeholder="e.g. Studio Luxe, Sarah Jenkins"
            value={editProjectCreator}
            onChange={(e) => setEditProjectCreator(e.target.value)}
            disabled={isSavingEdit}
          />

          <TextField
            fullWidth
            multiline
            rows={3}
            size="small"
            label="Project Description"
            placeholder="Describe the aesthetic, rooms, fabric choices, or purpose of this project..."
            value={editProjectDesc}
            onChange={(e) => setEditProjectDesc(e.target.value)}
            disabled={isSavingEdit}
          />

          <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: '#f0f9ff', border: '1px solid #bae6fd' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={editProjectIsPublic}
                  onChange={(e) => setEditProjectIsPublic(e.target.checked)}
                  color="primary"
                  disabled={isSavingEdit}
                />
              }
              label={
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0369a1' }}>
                    Public Project Showcase
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: '#0284c7' }}>
                    {editProjectIsPublic ? 'Visible to everyone in Explore Showcase.' : 'Private (only visible in your personal workspace).'}
                  </Typography>
                </Box>
              }
              sx={{ m: 0 }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setEditDialogOpen(false)} disabled={isSavingEdit} sx={{ color: '#64748b', textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveEditProject}
            disabled={isSavingEdit || !editProjectName.trim()}
            startIcon={isSavingEdit ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : null}
            sx={{ bgcolor: '#0284c7', borderRadius: '8px', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#0369a1' } }}
          >
            {isSavingEdit ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ============================================================== */}
      {/* EDIT ITEM DIALOG                                               */}
      {/* ============================================================== */}
      <Dialog
        open={editItemDialogOpen}
        onClose={() => !isSavingItemEdit && setEditItemDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Edit Shade Item</span>
          <IconButton size="small" onClick={() => setEditItemDialogOpen(false)} disabled={isSavingItemEdit}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Rename the designated room or adjust the order quantity for this custom shade.
          </Typography>

          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Room / Area Name *"
            placeholder="e.g. Hotel Lobby, Guest Room 101, Dining Room"
            value={editItemAreaName}
            onChange={(e) => setEditItemAreaName(e.target.value)}
            disabled={isSavingItemEdit}
          />

          {/* Quick suggestions */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {['Lobby', 'Living Room', 'Dining Room', 'Guest Room', 'Master Bedroom', 'Corridor'].map((area) => (
              <Chip
                key={area}
                label={area}
                size="small"
                clickable
                onClick={() => setEditItemAreaName(area)}
                sx={{
                  fontSize: 11,
                  cursor: 'pointer',
                  bgcolor: editItemAreaName === area ? '#0284c7' : '#f1f5f9',
                  color: editItemAreaName === area ? '#fff' : '#475569',
                  fontWeight: editItemAreaName === area ? 700 : 500,
                }}
              />
            ))}
          </Box>

          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#475569', mb: 1 }}>
              Quantity
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <IconButton
                size="small"
                disabled={editItemQuantity <= 1 || isSavingItemEdit}
                onClick={() => setEditItemQuantity((prev) => Math.max(1, prev - 1))}
                sx={{ border: '1px solid #cbd5e1', borderRadius: '8px' }}
              >
                <RemoveIcon fontSize="small" />
              </IconButton>

              <TextField
                type="number"
                size="small"
                value={editItemQuantity}
                onChange={(e) => setEditItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                inputProps={{ min: 1, style: { textAlign: 'center', fontWeight: 700, width: 60 } }}
                disabled={isSavingItemEdit}
              />

              <IconButton
                size="small"
                disabled={isSavingItemEdit}
                onClick={() => setEditItemQuantity((prev) => prev + 1)}
                sx={{ border: '1px solid #cbd5e1', borderRadius: '8px' }}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setEditItemDialogOpen(false)} disabled={isSavingItemEdit} sx={{ color: '#64748b', textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveEditItem}
            disabled={isSavingItemEdit || !editItemAreaName.trim()}
            startIcon={isSavingItemEdit ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : null}
            sx={{ bgcolor: '#0284c7', borderRadius: '8px', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#0369a1' } }}
          >
            {isSavingItemEdit ? 'Saving...' : 'Save Item'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
