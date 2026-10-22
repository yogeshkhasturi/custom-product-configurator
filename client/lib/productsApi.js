import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const dynamicBaseQuery = async (args, api, extraOptions) => {
  const isBrowser = typeof window !== 'undefined';
  const baseUrl = isBrowser
    ? '/api'
    : (process.env.INTERNAL_API_URL || 'http://127.0.0.1:5000/api');

  const rawBaseQuery = fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers) => {
      headers.set('ngrok-skip-browser-warning', 'true');
      return headers;
    },
  });

  return rawBaseQuery(args, api, extraOptions);
};

export const productsApiSlice = createApi({
  reducerPath: 'productsApi',
  baseQuery: dynamicBaseQuery,
  tagTypes: ['Product'],
  endpoints: (builder) => ({
    getProducts: builder.query({
      query: (params) => ({ url: '/products', params }),
      providesTags: ['Product'],
    }),
    getProductById: builder.query({
      query: (id) => `/products/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Product', id }],
    }),
    createProduct: builder.mutation({
      query: (data) => ({ url: '/products', method: 'POST', body: data }),
      invalidatesTags: ['Product'],
    }),
    updateProduct: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/products/${id}`, method: 'PUT', body: data }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Product', id }, 'Product'],
    }),
    deleteProduct: builder.mutation({
      query: (id) => ({ url: `/products/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Product'],
    }),
    calculatePrice: builder.mutation({
      query: ({ id, customizations }) => ({
        url: `/products/${id}/calculate-price`,
        method: 'POST',
        body: { customizations },
      }),
    }),
    resolveConfiguration: builder.mutation({
      query: ({ id, selections }) => ({
        url: `/products/${id}/configuration`,
        method: 'POST',
        body: { selections },
      }),
    }),
    calculateStepsPrice: builder.mutation({
      query: ({ id, stepSelections, quantity }) => ({
        url: `/products/${id}/steps-price`,
        method: 'POST',
        body: { stepSelections, quantity },
      }),
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetProductByIdQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useCalculatePriceMutation,
  useResolveConfigurationMutation,
  useCalculateStepsPriceMutation,
} = productsApiSlice;

// Upload helpers (keep axios for multipart)
import axios from 'axios';
export const uploadApi = {
  upload: (files) => {
    const form = new FormData();
    files.forEach((f) => form.append('images', f));
    return axios.post(`${BASE}/upload`, form);
  },
  remove: (url) => axios.delete(`${BASE}/upload`, { data: { url } }),
};
