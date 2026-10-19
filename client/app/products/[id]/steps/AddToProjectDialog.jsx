'use client';
import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import FolderSpecialOutlinedIcon from '@mui/icons-material/FolderSpecialOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import Link from 'next/link';

import { getProjects, createProject, addItemToProject } from '../../../../lib/projectsStorage';

const AREA_SUGGESTIONS = [
  'Hotel Lobby',
  'Lobby Pendant',
  'Guest Room',
  'Restaurant',
  'Bar / Lounge',
  'Corridor',
];

export default function AddToProjectDialog({
  open,
  onClose,
  product,
  stepSelections,
  summaryRows,
  unitPrice,
  initialQuantity = 1,
  previewImage = '',
}) {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isNewProject, setIsNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectIsPublic, setNewProjectIsPublic] = useState(true);
  const [areaName, setAreaName] = useState('Hotel Lobby');
  const [quantity, setQuantity] = useState(initialQuantity);
  const [savedSuccess, setSavedSuccess] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (open) {
      setQuantity(initialQuantity || 1);
      setSavedSuccess(null);
      setErrorMsg('');

      getProjects().then((existing) => {
        setProjects(existing || []);
        if (existing && existing.length > 0) {
          setSelectedProjectId(existing[0].id);
          setIsNewProject(false);
        } else {
          setIsNewProject(true);
          setNewProjectName('My Commercial Project');
        }
      });
    }
  }, [open, initialQuantity]);

  const handleSave = async () => {
    setErrorMsg('');
    let targetProjectId = selectedProjectId;

    if (isNewProject) {
      const trimmed = newProjectName.trim();
      if (!trimmed) {
        setErrorMsg('Please enter a project name.');
        return;
      }
      const created = await createProject(trimmed, { isPublic: newProjectIsPublic });
      targetProjectId = created.id;
    }

    const trimmedArea = areaName.trim();
    if (!trimmedArea) {
      setErrorMsg('Please specify an area or room name (e.g., Lobby, Guest Room).');
      return;
    }

    try {
      const result = await addItemToProject(targetProjectId, {
        areaName: trimmedArea,
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        quantity: quantity,
        unitPrice: unitPrice,
        stepSelections: stepSelections,
        summaryRows: summaryRows,
        image: previewImage,
      });

      setSavedSuccess({
        projectName: result.project?.name || 'Project',
        areaName: trimmedArea,
        quantity,
      });
    } catch (err) {
      setErrorMsg('Failed to save to project. Please try again.');
    }
  };

  const totalPrice = Math.round(unitPrice * quantity * 100) / 100;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          p: 1,
        },
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <FolderSpecialOutlinedIcon sx={{ color: '#0284c7' }} />
          <Typography variant="h6" fontWeight={700} sx={{ color: '#0f172a' }}>
            Add Shade to Project
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: '#64748b' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        {savedSuccess ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 56, color: '#16a34a', mb: 1.5 }} />
            <Typography variant="h6" fontWeight={700} sx={{ color: '#0f172a', mb: 0.5 }}>
              Added to Project!
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
              Successfully added <strong>{savedSuccess.quantity}x</strong> shades for <strong>{savedSuccess.areaName}</strong> in <strong>{savedSuccess.projectName}</strong>.
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={onClose}
                sx={{ borderRadius: '8px', textTransform: 'none', px: 2.5 }}
              >
                Done
              </Button>
              <Button
                component={Link}
                href="/projects"
                variant="contained"
                sx={{
                  bgcolor: '#0f172a',
                  borderRadius: '8px',
                  textTransform: 'none',
                  px: 2.5,
                  '&:hover': { bgcolor: '#1e293b' },
                }}
              >
                View in Projects Manager
              </Button>
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {errorMsg && <Alert severity="error">{errorMsg}</Alert>}

            {/* Product Summary Mini Card */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 1.5,
                borderRadius: '10px',
                bgcolor: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              {previewImage && (
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: '8px',
                    bgcolor: '#fff',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  <img src={previewImage} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </Box>
              )}
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }} noWrap>
                  {product.name}
                </Typography>
                <Typography sx={{ fontSize: 13, color: '#64748b' }}>
                  ${unitPrice.toFixed(2)} per shade
                </Typography>
              </Box>
            </Box>

            {/* Project Selection */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
                  Target Project
                </Typography>
                {projects.length > 0 && (
                  <Button
                    size="small"
                    onClick={() => setIsNewProject(!isNewProject)}
                    sx={{ textTransform: 'none', fontSize: 12, p: 0, minWidth: 0, color: '#0284c7' }}
                  >
                    {isNewProject ? 'Select Existing Project' : '+ New Project'}
                  </Button>
                )}
              </Box>

              {isNewProject ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="e.g. Downtown Boutique Hotel"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    autoFocus
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={newProjectIsPublic}
                        onChange={(e) => setNewProjectIsPublic(e.target.checked)}
                        color="primary"
                      />
                    }
                    label={
                      <Typography sx={{ fontSize: 12, color: '#64748b' }}>
                        Make project public in Community Showcase
                      </Typography>
                    }
                    sx={{ m: 0 }}
                  />
                </Box>
              ) : (
                <TextField
                  select
                  fullWidth
                  size="small"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                >
                  {projects.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name} ({p.items?.length || 0} items)
                    </MenuItem>
                  ))}
                </TextField>
              )}
            </Box>

            {/* Area / Space Specification */}
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#334155', mb: 0.5 }}>
                Area / Room Name
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="e.g. Hotel Lobby, Guest Room, Restaurant"
                value={areaName}
                onChange={(e) => setAreaName(e.target.value)}
              />
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
                {AREA_SUGGESTIONS.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    onClick={() => setAreaName(tag)}
                    sx={{
                      fontSize: 11,
                      cursor: 'pointer',
                      bgcolor: areaName === tag ? '#0284c7' : '#f1f5f9',
                      color: areaName === tag ? '#fff' : '#475569',
                      '&:hover': {
                        bgcolor: areaName === tag ? '#0369a1' : '#e2e8f0',
                      },
                    }}
                  />
                ))}
              </Box>
            </Box>

            {/* Quantity & Subtotal */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                pt: 1,
                borderTop: '1px solid #f1f5f9',
              }}
            >
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#334155', mb: 0.5 }}>
                  Quantity
                </Typography>
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    bgcolor: '#fff',
                  }}
                >
                  <IconButton
                    size="small"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                  >
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                  <Typography sx={{ px: 1.5, fontSize: 14, fontWeight: 700, minWidth: 28, textAlign: 'center' }}>
                    {quantity}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => setQuantity((q) => q + 1)}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>

              <Box sx={{ textAlign: 'right' }}>
                <Typography sx={{ fontSize: 12, color: '#64748b' }}>Area Subtotal</Typography>
                <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
                  ${totalPrice.toFixed(2)}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>

      {!savedSuccess && (
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} sx={{ color: '#64748b' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            sx={{
              bgcolor: '#0f172a',
              borderRadius: '8px',
              px: 3,
              fontWeight: 700,
              '&:hover': { bgcolor: '#1e293b' },
            }}
          >
            Save to Project
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
