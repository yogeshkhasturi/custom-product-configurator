'use client';
import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import TuneIcon from '@mui/icons-material/Tune';
import { useGetProductsQuery } from '../../lib/productsApi';
import { resolveImageUrl } from '../../lib/pricingUtils';

function ProductsList() {
  const router = useRouter();
  const { data, isLoading, isError } = useGetProductsQuery({ status: 'active' });
  const products = data?.data || [];

  return (
    <Box>
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: { xs: 6, md: 8 }, px: { xs: 2, md: 4 } }}>
        <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
          <Typography variant="overline" sx={{ color: 'secondary.main', letterSpacing: '0.2em', fontWeight: 700 }}>
            Our Collection
          </Typography>
          <Typography variant="h3" fontWeight={700} mt={0.5}>Custom Lampshades</Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.65)', mt: 1, maxWidth: 480 }}>
            Each shade is made to order. Select a product to configure your perfect fit.
          </Typography>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 5, md: 8 } }}>
        {isError && <Alert severity="error" sx={{ mb: 3 }}>Failed to load products.</Alert>}

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}><CircularProgress /></Box>
        ) : products.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 12 }}>
            <Typography variant="h6" color="text.secondary">No products available yet.</Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {products.map((p) => (
              <Grid item xs={12} sm={6} md={4} key={p._id}>
                <Card
                  elevation={1}
                  sx={{
                    height: '100%',
                    border: '1px solid',
                    borderColor: 'divider',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 32px rgba(0,0,0,0.12)' },
                  }}
                >
                  <CardActionArea onClick={() => router.push(`/products/${p._id}`)} sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                    <Box sx={{ position: 'relative', height: 240, bgcolor: 'grey.100', overflow: 'hidden' }}>
                      {p.images?.[0] ? (
                        <img src={resolveImageUrl(p.images[0])} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      ) : (
                        <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Typography color="text.disabled" variant="body2">No Image</Typography>
                        </Box>
                      )}
                    </Box>
                    <CardContent sx={{ flex: 1, p: 2.5 }}>
                      <Typography variant="h6" fontWeight={600} gutterBottom noWrap>{p.name}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 40 }}>
                        {p.description || 'Custom handcrafted lampshade.'}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">From</Typography>
                          <Typography variant="h6" color="secondary.main" fontWeight={700} lineHeight={1}>
                            ${p.basePrice.toFixed(2)}
                          </Typography>
                        </Box>
                        <Chip icon={<TuneIcon sx={{ fontSize: '14px !important' }} />} label="Customize" size="small" color="primary" />
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Box>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}><CircularProgress /></Box>}>
      <ProductsList />
    </Suspense>
  );
}
