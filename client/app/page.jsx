'use client';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Link from 'next/link';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import TuneIcon from '@mui/icons-material/Tune';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';

const features = [
  { icon: <AutoAwesomeIcon sx={{ fontSize: 36 }} />, title: 'Handcrafted Quality', body: 'Every shade is made to order by skilled artisans using premium materials.' },
  { icon: <TuneIcon sx={{ fontSize: 36 }} />, title: 'Fully Customizable', body: 'Choose your dimensions, fabric, color, and finish to match your exact vision.' },
  { icon: <LocalShippingOutlinedIcon sx={{ fontSize: 36 }} />, title: 'Made to Order', body: 'Your shade is crafted fresh for you — no mass production, no compromise.' },
];

export default function Home() {
  return (
    <Box>
      {/* Hero */}
      <Box
        sx={{
          bgcolor: '#000',
          color: '#fff',
          py: { xs: 12, md: 18 },
          px: { xs: 3, md: 4 },
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at 50% 60%, rgba(255,255,255,0.04) 0%, transparent 70%)',
            pointerEvents: 'none',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
          },
        }}
      >
        <Box sx={{ position: 'relative', maxWidth: 700, mx: 'auto' }}>
          <Typography
            variant="overline"
            sx={{
              color: 'rgba(255,255,255,0.45)', letterSpacing: '0.3em', fontWeight: 700, mb: 3, display: 'block',
              animation: 'fadeInDown 0.6s ease both',
              '@keyframes fadeInDown': { from: { opacity: 0, transform: 'translateY(-12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
            }}
          >
            Bespoke Lampshades
          </Typography>
          <Typography
            variant="h2"
            fontWeight={700}
            sx={{
              mb: 3, fontSize: { xs: '2.4rem', md: '3.6rem' }, lineHeight: 1.1,
              animation: 'fadeInUp 0.7s ease 0.1s both',
              '@keyframes fadeInUp': { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
            }}
          >
            Light Your Space,<br />Your Way
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: 'rgba(255,255,255,0.55)', mb: 6, fontWeight: 400, maxWidth: 520, mx: 'auto',
              animation: 'fadeInUp 0.7s ease 0.2s both',
            }}
          >
            Handcrafted custom lampshades built to your exact specifications — dimensions, fabric, color, and finish.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', animation: 'fadeInUp 0.7s ease 0.3s both' }}>
            <Button
              variant="contained"
              color="secondary"
              size="large"
              component={Link}
              href="/products"
              sx={{
                px: 5, py: 1.6, fontSize: 14, letterSpacing: '0.12em',
                bgcolor: '#fff', color: '#000',
                transition: 'all 0.25s ease',
                '&:hover': { bgcolor: '#e8e8e8', transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(255,255,255,0.15)' },
              }}
            >
              Browse Products
            </Button>
            <Button
              variant="outlined"
              size="large"
              component={Link}
              href="/products"
              sx={{
                px: 5, py: 1.6, fontSize: 14, letterSpacing: '0.12em',
                borderColor: 'rgba(255,255,255,0.3)', color: '#fff',
                transition: 'all 0.25s ease',
                '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.08)', transform: 'translateY(-2px)' },
              }}
            >
              Learn More
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Features */}
      <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 8, md: 12 } }}>
        <Typography variant="h4" textAlign="center" mb={1} letterSpacing="-0.01em">Why Fenchel Shades?</Typography>
        <Box sx={{ width: 40, height: 2, bgcolor: '#000', mx: 'auto', mb: 2 }} />
        <Typography color="text.secondary" textAlign="center" mb={7} maxWidth={480} mx="auto">
          We combine traditional craftsmanship with modern customization tools.
        </Typography>
        <Grid container spacing={3}>
          {features.map((f) => (
            <Grid item xs={12} md={4} key={f.title}>
              <Paper
                elevation={0}
                sx={{
                  p: 4, height: '100%', textAlign: 'center',
                  border: '1px solid #e0e0e0',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'default',
                  '&:hover': {
                    border: '1px solid #000',
                    transform: 'translateY(-6px)',
                    boxShadow: '0 16px 40px rgba(0,0,0,0.1)',
                    '& .feature-icon': { transform: 'scale(1.2) rotate(-5deg)', color: '#000' },
                  },
                }}
              >
                <Box className="feature-icon" sx={{ mb: 2.5, color: '#888', transition: 'all 0.3s ease' }}>{f.icon}</Box>
                <Typography variant="h6" mb={1} fontWeight={700} letterSpacing="0.02em">{f.title}</Typography>
                <Typography color="text.secondary" variant="body2" lineHeight={1.7}>{f.body}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Divider line */}
        <Box sx={{ width: '100%', height: '1px', bgcolor: '#e0e0e0', my: 10 }} />

        {/* CTA */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h4" mb={1} letterSpacing="-0.01em">Ready to design your shade?</Typography>
          <Box sx={{ width: 40, height: 2, bgcolor: '#000', mx: 'auto', mb: 4 }} />
          <Button
            variant="contained"
            color="primary"
            size="large"
            component={Link}
            href="/products"
            sx={{
              px: 6, py: 1.6, fontSize: 14, letterSpacing: '0.12em',
              transition: 'all 0.25s ease',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' },
            }}
          >
            Start Customizing
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
