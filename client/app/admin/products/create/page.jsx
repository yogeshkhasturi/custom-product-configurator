'use client';
import { useEffect } from 'react';
import ProductForm from '../ProductForm';

export default function CreateProductPage() {
  useEffect(() => {
    document.title = 'Create Product | Admin | Fenchel Shades';
  }, []);

  return <ProductForm mode="create" />;
}

