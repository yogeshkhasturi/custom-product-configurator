'use client';
import { Suspense, useEffect } from 'react';
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
import Button from '@mui/material/Button';
import TuneIcon from '@mui/icons-material/Tune';
import FolderSpecialOutlinedIcon from '@mui/icons-material/FolderSpecialOutlined';
import Link from 'next/link';
import { useGetProductsQuery } from '../../lib/productsApi';
import { resolveImageUrl } from '../../lib/pricingUtils';

function ProductsList() {
  const router = useRouter();
  const { data, isLoading, isError } = useGetProductsQuery({ status: 'active' });
  const products = data?.data || [];

  useEffect(() => {
    document.title = 'Custom Lampshades Collection | Fenchel Shades';
  }, []);

  return (
    <Box>
      <Box sx={{
        bgcolor: '#0f172a',
        color: 'white',
        py: { xs: 6, md: 8 },
        px: { xs: 2, md: 4 },
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 80% 30%, rgba(2,132,199,0.15) 0%, transparent 60%)',
          pointerEvents: 'none',
        },
      }}>
        <Box sx={{ maxWidth: 1100, mx: 'auto', position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="overline" sx={{ color: '#38bdf8', letterSpacing: '0.2em', fontWeight: 700, animation: 'fadeInDown 0.5s ease both' }}>
              Our Collection
            </Typography>
            <Typography variant="h3" fontWeight={700} mt={0.5} sx={{ animation: 'fadeInUp 0.5s ease 0.1s both' }}>Custom Lampshades</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.7)', mt: 1, maxWidth: 480, animation: 'fadeInUp 0.5s ease 0.2s both' }}>
              Each shade is made to order. Select a product to configure your perfect fit.
            </Typography>
          </Box>
          <Button
            component={Link}
            href="/projects"
            variant="outlined"
            startIcon={<FolderSpecialOutlinedIcon />}
            sx={{
              color: '#fff',
              borderColor: 'rgba(255,255,255,0.3)',
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: 13,
              '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.08)' },
            }}
          >
            My Projects
          </Button>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 5, md: 8 } }}>
        {isError && <Alert severity="error" sx={{ mb: 3 }}>Failed to load products.</Alert>}

        {isLoading ? (
          <Grid container spacing={3}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <Grid item xs={12} sm={6} md={4} key={n}>
                <Box sx={{ height: 380, borderRadius: '12px', border: '1px solid #e2e8f0', p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box className="shimmer-skeleton" sx={{ width: '100%', height: 210, borderRadius: '8px' }} />
                  <Box className="shimmer-skeleton" sx={{ width: '70%', height: 24, borderRadius: '4px' }} />
                  <Box className="shimmer-skeleton" sx={{ width: '90%', height: 16, borderRadius: '4px' }} />
                  <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box className="shimmer-skeleton" sx={{ width: 60, height: 24, borderRadius: '4px' }} />
                    <Box className="shimmer-skeleton" sx={{ width: 80, height: 24, borderRadius: '12px' }} />
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        ) : products.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 12, animation: 'fadeIn 0.5s ease both' }}>
            <Typography variant="h6" color="text.secondary">No products available yet.</Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {products.map((p, idx) => (
              <Grid item xs={12} sm={6} md={4} key={p._id}>
                <Card
                  elevation={0}
                  className="card-luxury-hover"
                  sx={{
                    height: '100%',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    animation: 'fadeInUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) both',
                    animationDelay: `${Math.min(idx * 70, 400)}ms`,
                  }}
                >
                  <CardActionArea
                    onClick={() => router.push(`/products/${p._id}`)}
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'stretch',
                      '&:hover .product-card-img': { transform: 'scale(1.06)' },
                    }}
                  >
                    <Box sx={{ position: 'relative', height: 240, bgcolor: '#f8fafc', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, borderBottom: '1px solid #f1f5f9' }}>
                      {p.images?.[0] ? (
                        <img
                          className="product-card-img"
                          src={resolveImageUrl(p.images[0])}
                          alt={p.name}
                          style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain',
                            display: 'block',
                            transition: 'transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)',
                          }}
                        />
                      ) : (
                        <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Typography color="text.disabled" variant="body2">No Image</Typography>
                        </Box>
                      )}
                    </Box>
                    <CardContent sx={{ flex: 1, p: 2.5 }}>
                      <Typography variant="h6" fontWeight={600} gutterBottom noWrap sx={{ transition: 'color 0.2s ease', '&:hover': { color: '#0284c7' } }}>
                        {p.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 40, lineHeight: 1.6 }}>
                        {p.description || 'Custom handcrafted lampshade.'}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1 }}>From</Typography>
                          <Typography variant="h6" color="#0f172a" fontWeight={700} lineHeight={1.2}>
                            ${p.basePrice.toFixed(2)}
                          </Typography>
                        </Box>
                        <Chip
                          icon={<TuneIcon sx={{ fontSize: '14px !important' }} />}
                          label="Customize"
                          size="small"
                          sx={{
                            bgcolor: '#0f172a',
                            color: '#fff',
                            fontWeight: 600,
                            letterSpacing: '0.02em',
                            transition: 'all 0.2s ease',
                            '&:hover': { bgcolor: '#0284c7', transform: 'scale(1.04)' },
                          }}
                        />
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
