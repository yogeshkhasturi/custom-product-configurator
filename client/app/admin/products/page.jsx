'use client';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import InventoryIcon from '@mui/icons-material/Inventory';
import { useGetProductsQuery, useDeleteProductMutation } from '../../../lib/productsApi';
import { resolveImageUrl } from '../../../lib/pricingUtils';

const statusColor = { active: 'success', inactive: 'default', draft: 'warning' };

export default function AdminProductsPage() {
  const router = useRouter();
  const { data, isLoading, isError } = useGetProductsQuery();
  const [deleteProduct] = useDeleteProductMutation();
  const products = data?.data || [];

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await deleteProduct(id).unwrap();
    } catch {
      alert('Failed to delete product.');
    }
  };

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: { xs: 4, md: 5 }, px: { xs: 2, md: 4 } }}>
        <Box sx={{ maxWidth: 1100, mx: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="overline" sx={{ color: 'secondary.main', letterSpacing: '0.15em', fontWeight: 700 }}>Admin Panel</Typography>
            <Typography variant="h4" fontWeight={700}>Products</Typography>
          </Box>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<AddIcon />}
            onClick={() => router.push('/admin/products/create')}
            sx={{ px: 3, py: 1.25 }}
          >
            New Product
          </Button>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
        {isError && <Alert severity="error" sx={{ mb: 3 }}>Failed to load products.</Alert>}

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}><CircularProgress /></Box>
        ) : (
          <Paper elevation={1} sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Product</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>SKU</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Base Price</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Box sx={{ py: 8, textAlign: 'center' }}>
                          <InventoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                          <Typography color="text.secondary" fontWeight={500}>No products yet</Typography>
                          <Typography variant="body2" color="text.disabled" mt={0.5}>Create your first product to get started.</Typography>
                          <Button variant="contained" startIcon={<AddIcon />} sx={{ mt: 3 }} onClick={() => router.push('/admin/products/create')}>
                            Create Product
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    products.map((p) => (
                      <TableRow key={p._id} hover sx={{ '&:last-child td': { border: 0 } }}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar
                              src={resolveImageUrl(p.images?.[0])}
                              variant="rounded"
                              sx={{ width: 40, height: 40, bgcolor: 'grey.100', border: '1px solid', borderColor: 'divider' }}
                            >
                              <InventoryIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                            </Avatar>
                            <Typography fontWeight={600} fontSize={14}>{p.name}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary" fontFamily="monospace">{p.sku}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography fontWeight={600} color="secondary.dark">${p.basePrice.toFixed(2)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={p.status} color={statusColor[p.status] || 'default'} size="small" sx={{ textTransform: 'capitalize' }} />
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                            <Tooltip title="View on site">
                              <IconButton size="small" onClick={() => router.push(`/products/${p._id}`)}>
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit">
                              <IconButton size="small" color="primary" onClick={() => router.push(`/admin/products/${p._id}`)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" color="error" onClick={() => handleDelete(p._id, p.name)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Box>
    </Box>
  );
}
