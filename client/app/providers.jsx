'use client';
import { useState, useEffect } from 'react';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Link from 'next/link';
import MuiRegistry from '../lib/MuiRegistry';
import theme from '../lib/theme';
import { store } from '../lib/store';

function Footer() {
  const [year, setYear] = useState('');
  useEffect(() => { setYear(String(new Date().getFullYear())); }, []);
  return (
    <Box
      component="footer"
      sx={{ bgcolor: '#000', color: 'rgba(255,255,255,0.55)', py: 5, mt: 'auto', borderTop: '1px solid #222' }}
    >
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 4 }, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 2 }}>
        <Typography variant="body2" fontWeight={700} color="#fff" letterSpacing="0.12em" sx={{ transition: 'opacity 0.2s ease', '&:hover': { opacity: 0.7 } }}>
          FENCHEL SHADES
        </Typography>
        <Typography variant="caption">
          {year ? `© ${year} Fenchel Shades. Handcrafted with care.` : ''}
        </Typography>
      </Box>
    </Box>
  );
}

export default function RootProviders({ children }) {
  return (
    <Provider store={store}>
    <MuiRegistry>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          {/* ── Navbar ── */}
          {/* <AppBar position="sticky" color="primary" elevation={0} sx={{ bgcolor: '#000', borderBottom: '1px solid #000' }}>
            <Toolbar sx={{ maxWidth: 1200, width: '100%', mx: 'auto', px: { xs: 2, md: 4 }, gap: 1 }}>
              <Typography
                variant="h6"
                component={Link}
                href="/"
                sx={{
                  flexGrow: 1, color: '#fff', textDecoration: 'none', fontWeight: 700,
                  letterSpacing: '0.12em', fontSize: { xs: 15, md: 18 },
                  transition: 'opacity 0.2s ease',
                  '&:hover': { opacity: 0.75 },
                }}
              >
                FENCHEL SHADES
              </Typography>
              <Button
                color="inherit"
                component={Link}
                href="/products"
                sx={{
                  color: 'rgba(255,255,255,0.75)', letterSpacing: '0.08em', fontSize: 13,
                  transition: 'color 0.2s ease, border-bottom 0.2s ease',
                  borderBottom: '1px solid transparent',
                  borderRadius: 0,
                  '&:hover': { color: '#fff', borderBottom: '1px solid #fff', background: 'transparent' },
                }}
              >
                Shop
              </Button>
              <Button
                variant="outlined"
                component={Link}
                href="/admin/products"
                sx={{
                  borderColor: 'rgba(255,255,255,0.4)', color: '#fff', letterSpacing: '0.08em', fontSize: 13,
                  transition: 'all 0.25s ease',
                  '&:hover': { borderColor: '#fff', bgcolor: '#fff', color: '#000' },
                }}
              >
                Admin
              </Button>
            </Toolbar>
          </AppBar> */}

          {/* ── Page content ── */}
          <Box component="main" sx={{ flex: 1, bgcolor: 'background.default' }}>
            {children}
          </Box>

          {/* ── Footer ── */}
          {/* <Footer /> */}
        </Box>
      </ThemeProvider>
    </MuiRegistry>
    </Provider>
  );
}
