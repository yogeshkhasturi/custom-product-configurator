'use client';
import { Suspense, useEffect } from 'react';
import { useParams } from 'next/navigation';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import { useGetProductByIdQuery } from '../../../../lib/productsApi';
import ProductForm from '../ProductForm';

function EditProduct() {
  const { id } = useParams();
  const { data, isLoading, isError } = useGetProductByIdQuery(id);

  useEffect(() => {
    if (data?.data?.name) {
      document.title = `Edit ${data.data.name} | Admin | Fenchel Shades`;
    } else {
      document.title = 'Edit Product | Admin | Fenchel Shades';
    }
  }, [data?.data?.name]);

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;
  if (isError) return <Alert severity="error" sx={{ m: 4 }}>Product not found.</Alert>;

  return <ProductForm mode="edit" initialData={data?.data} />;
}

export default function EditProductPage() {
  return (
    <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>}>
      <EditProduct />
    </Suspense>
  );
}
