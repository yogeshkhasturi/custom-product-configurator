'use strict';

const STORAGE_KEY = 'fenchel_projects';
const CART_KEY = 'cart';
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api') + '/projects';

function getLocalProjects() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

function saveLocalProjects(projects) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (err) {
    console.error('Failed to save projects cache to localStorage:', err);
  }
}

function normalizeProject(p) {
  if (!p) return null;
  return {
    ...p,
    id: p._id || p.id,
    isPublic: p.isPublic !== false,
    creatorName: p.creatorName || 'Community Designer',
    description: p.description || '',
    items: (p.items || []).map((i) => ({
      ...i,
      id: i._id || i.id,
    })),
  };
}

export async function getProjects(params = {}) {
  const { search, isPublic, sort } = params;
  try {
    const query = new URLSearchParams();
    if (search && search.trim()) query.set('search', search.trim());
    if (isPublic !== undefined && isPublic !== null) query.set('isPublic', String(isPublic));
    if (sort) query.set('sort', sort);

    const qs = query.toString();
    const url = qs ? `${API_BASE}?${qs}` : API_BASE;

    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const normalized = json.data.map(normalizeProject);
        // Only overwrite local cache if it's the general (unfiltered) fetch
        if (!search && isPublic === undefined) {
          saveLocalProjects(normalized);
        }
        return normalized;
      }
    }
  } catch (err) {
    console.warn('API getProjects failed, reading local fallback:', err.message);
  }

  // Fallback to local
  let local = getLocalProjects();
  if (isPublic === 'true' || isPublic === true) {
    local = local.filter((p) => p.isPublic !== false);
  } else if (isPublic === 'false' || isPublic === false) {
    local = local.filter((p) => p.isPublic === false);
  }
  if (search && search.trim()) {
    const tokens = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    local = local.filter((p) => {
      // Must match all tokens
      return tokens.every((token) => {
        const inName = p.name?.toLowerCase().includes(token);
        const inCreator = p.creatorName?.toLowerCase().includes(token);
        const inDesc = p.description?.toLowerCase().includes(token);
        const inItems = p.items?.some((i) => {
          const inArea = i.areaName?.toLowerCase().includes(token);
          const inProd = i.productName?.toLowerCase().includes(token);
          const inSku = i.sku?.toLowerCase().includes(token);
          const inSummary = i.summaryRows?.some(
            (s) => s.label?.toLowerCase().includes(token) || s.value?.toLowerCase().includes(token)
          );
          return inArea || inProd || inSku || inSummary;
        });
        return inName || inCreator || inDesc || inItems;
      });
    });
  }
  return local;
}

export async function createProject(name, options = {}) {
  const trimmed = (name || '').trim() || 'Untitled Project';
  const { isPublic = true, creatorName = 'Community Designer', description = '' } = options;
  const payload = {
    name: trimmed,
    isPublic: Boolean(isPublic),
    creatorName: (creatorName || 'Community Designer').trim(),
    description: (description || '').trim(),
  };

  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        const created = normalizeProject(json.data);
        const local = getLocalProjects();
        local.unshift(created);
        saveLocalProjects(local);
        return created;
      }
    }
  } catch (err) {
    console.warn('API createProject failed, saving locally:', err.message);
  }

  // Fallback
  const projects = getLocalProjects();
  const fallback = {
    id: 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    name: trimmed,
    isPublic: Boolean(isPublic),
    creatorName: (creatorName || 'Community Designer').trim(),
    description: (description || '').trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: [],
  };
  projects.unshift(fallback);
  saveLocalProjects(projects);
  return fallback;
}

export async function toggleProjectVisibility(projectId, isPublic) {
  try {
    const res = await fetch(`${API_BASE}/${projectId}/visibility`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublic }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        const updated = normalizeProject(json.data);
        const local = getLocalProjects();
        const idx = local.findIndex((p) => p.id === projectId);
        if (idx >= 0) local[idx] = updated;
        saveLocalProjects(local);
        return updated;
      }
    }
  } catch (err) {
    console.warn('API toggleProjectVisibility failed, updating locally:', err.message);
  }

  const local = getLocalProjects();
  const project = local.find((p) => p.id === projectId);
  if (project) {
    project.isPublic = isPublic;
    saveLocalProjects(local);
  }
  return project;
}

export async function cloneProject(projectId, customName = '') {
  try {
    const res = await fetch(`${API_BASE}/${projectId}/clone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: customName, isPublic: false }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        const created = normalizeProject(json.data);
        const local = getLocalProjects();
        local.unshift(created);
        saveLocalProjects(local);
        return created;
      }
    }
  } catch (err) {
    console.warn('API cloneProject failed, falling back locally:', err.message);
  }

  const local = getLocalProjects();
  const original = local.find((p) => p.id === projectId);
  if (!original) return null;

  const cloned = {
    ...JSON.parse(JSON.stringify(original)),
    id: 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    name: customName || `${original.name} (Copy)`,
    isPublic: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: (original.items || []).map((item) => ({
      ...item,
      id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    })),
  };
  local.unshift(cloned);
  saveLocalProjects(local);
  return cloned;
}

export async function addItemToProject(projectId, itemData) {
  const payload = {
    areaName: (itemData.areaName || '').trim() || 'General Area',
    productId: itemData.productId,
    productName: itemData.productName,
    sku: itemData.sku || '',
    quantity: Number(itemData.quantity) || 1,
    unitPrice: Number(itemData.unitPrice) || 0,
    stepSelections: itemData.stepSelections || {},
    summaryRows: itemData.summaryRows || [],
    image: itemData.image || '',
  };

  try {
    const res = await fetch(`${API_BASE}/${projectId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        const updated = normalizeProject(json.data);
        const local = getLocalProjects();
        const idx = local.findIndex((p) => p.id === projectId);
        if (idx >= 0) local[idx] = updated;
        else local.unshift(updated);
        saveLocalProjects(local);
        return { project: updated, item: updated.items[updated.items.length - 1] };
      }
    }
  } catch (err) {
    console.warn('API addItemToProject failed, saving locally:', err.message);
  }

  // Local fallback
  const projects = getLocalProjects();
  let project = projects.find((p) => p.id === projectId);
  if (!project) {
    project = {
      id: projectId || 'proj_' + Date.now(),
      name: 'My Project',
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    projects.unshift(project);
  }

  const newItem = {
    id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    ...payload,
    totalPrice: payload.unitPrice * payload.quantity,
    addedAt: new Date().toISOString(),
  };

  project.items.push(newItem);
  project.updatedAt = new Date().toISOString();
  saveLocalProjects(projects);
  return { project, item: newItem };
}

export async function removeItemFromProject(projectId, itemId) {
  try {
    const res = await fetch(`${API_BASE}/${projectId}/items/${itemId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        const updated = normalizeProject(json.data);
        const local = getLocalProjects();
        const idx = local.findIndex((p) => p.id === projectId);
        if (idx >= 0) local[idx] = updated;
        saveLocalProjects(local);
        return updated;
      }
    }
  } catch (err) {
    console.warn('API removeItemFromProject failed, updating locally:', err.message);
  }

  const projects = getLocalProjects();
  const project = projects.find((p) => p.id === projectId);
  if (!project) return null;
  project.items = project.items.filter((i) => i.id !== itemId);
  project.updatedAt = new Date().toISOString();
  saveLocalProjects(projects);
  return project;
}

export async function deleteProject(projectId) {
  try {
    const res = await fetch(`${API_BASE}/${projectId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      let local = getLocalProjects();
      local = local.filter((p) => p.id !== projectId);
      saveLocalProjects(local);
      return local;
    }
  } catch (err) {
    console.warn('API deleteProject failed, updating locally:', err.message);
  }

  let projects = getLocalProjects();
  projects = projects.filter((p) => p.id !== projectId);
  saveLocalProjects(projects);
  return projects;
}

export async function orderProjectToCart(projectId, explicitProject = null) {
  const projects = getLocalProjects();
  const project = explicitProject || projects.find((p) => p.id === projectId);
  if (!project || !project.items || project.items.length === 0) {
    return { success: false, message: 'Project has no items to order.' };
  }

  try {
    // 1. Notify API that project was ordered
    fetch(`${API_BASE}/${projectId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ordered' }),
    }).catch((e) => console.warn('Status update API error:', e.message));

    // 2. Add each item into the cart
    const rawCart = localStorage.getItem(CART_KEY);
    const cart = rawCart ? JSON.parse(rawCart) : [];

    for (const item of project.items) {
      cart.push({
        productId: item.productId,
        productName: `${item.productName} (${item.areaName})`,
        projectName: project.name,
        areaName: item.areaName,
        sku: item.sku,
        stepSelections: item.stepSelections,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        image: item.image,
        addedAt: new Date().toISOString(),
      });
    }

    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    project.status = 'ordered';
    project.orderedAt = new Date().toISOString();
    saveLocalProjects(projects);

    return {
      success: true,
      itemsCount: project.items.length,
      totalUnits: project.items.reduce((sum, i) => sum + i.quantity, 0),
    };
  } catch (err) {
    console.error('Failed to add project to cart:', err);
    return { success: false, message: 'Failed to add project items to cart.' };
  }
}
