// Database Service Module
// Data access layer for products and orders
// CRUD operations for products
// Order processing and user history
// External API integrations for images
// Search and filtering

import { supabase } from './supabase';
import { getOpenLibraryCoverUrl, getOpenLibraryCoverUrls } from './openlibrary';
import { getDiscogsCoverUrl } from './discogs';

export interface Product {
  id: string;
  titulo: string;
  autor: string;
  descripcion: string;
  precio: number;
  stock: number;
  genero: string;
  isbn?: string;
  discogs_id?: string;
  año_publicacion: number;
  editorial: string;
  vendidos: number;
  imageUrl: string;
  category: 'book' | 'vinyl';
  createdAt?: string;
}

// Get products from database
export const getProductos = async (category?: 'book' | 'vinyl'): Promise<Product[]> => {
  try {
    let query = supabase
      .from('productos')
      .select('*')
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching productos:', error);
    throw error;
  }
};

// Get top 5 best-selling products
export const getTopBestSellers = async (category: 'book' | 'vinyl' = 'book'): Promise<Product[]> => {
  try {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('category', category)
      .order('vendidos', { ascending: false })
      .limit(5);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching best sellers:', error);
    throw error;
  }
};

/**
 * getProductoById - Fetches a single product by its ID
 *
 * Retrieves detailed product information for product detail views
 * Used when displaying individual product pages
 *
 * @param id - Product unique identifier
 * @returns Promise<Product> - Single product object
 */
export const getProductoById = async (id: string): Promise<Product> => {
  try {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching producto:', error);
    throw error;
  }
};

// Create new product in database
export const createProducto = async (productoData: any) => {
  try {
    // Si no hay imagen, obtener de la API correspondiente
    if (!productoData.imageUrl) {
      if (productoData.category === 'book' && productoData.isbn) {
        const coverUrl = await getOpenLibraryCoverUrl(productoData.isbn);
        if (coverUrl) {
          productoData.imageUrl = coverUrl;
        }
      } else if (productoData.category === 'vinyl' && productoData.discogs_id) {
        const coverUrl = await getDiscogsCoverUrl(productoData.discogs_id);
        if (coverUrl) {
          productoData.imageUrl = coverUrl;
        }
      }
    }

    const { data, error } = await supabase
      .from('productos')
      .insert([productoData])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating producto:', error);
    throw error;
  }
};

// Actualizar producto (Admin)
export const updateProducto = async (id: string, updates: any) => {
  try {
    const { data, error } = await supabase
      .from('productos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating producto:', error);
    throw error;
  }
};

// Eliminar producto (Admin)
export const deleteProducto = async (id: string) => {
  try {
    const { error } = await supabase
      .from('productos')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting producto:', error);
    throw error;
  }
};

// Crear encabezado (orden)
export const createEncabezado = async (clienteId: string, total: number) => {
  try {
    const { data, error } = await supabase
      .from('encabezados')
      .insert([
        {
          cliente_id: clienteId,
          total,
          estado: 'pendiente',
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating encabezado:', error);
    throw error;
  }
};

// Crear detalles (items de orden)
export const createDetalles = async (detalles: any[]) => {
  try {
    const { data, error } = await supabase
      .from('detalles')
      .insert(detalles)
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating detalles:', error);
    throw error;
  }
};

// Actualizar cantidad vendida de productos
export const updateProductoVendidos = async (productId: string, cantidad: number) => {
  try {
    const { data: currentData, error: fetchError } = await supabase
      .from('productos')
      .select('vendidos')
      .eq('id', productId)
      .single();

    if (fetchError) throw fetchError;

    const newVendidos = (currentData?.vendidos || 0) + cantidad;

    const { error: updateError } = await supabase
      .from('productos')
      .update({ vendidos: newVendidos })
      .eq('id', productId);

    if (updateError) throw updateError;
  } catch (error) {
    console.error('Error updating vendidos:', error);
    throw error;
  }
};

// Obtener órdenes del cliente
export const getClienteOrdenes = async (clienteId: string) => {
  try {
    // Primero obtener el cliente por email (clienteId aquí es el auth user id)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      throw new Error('Usuario no autenticado');
    }

    const { data: cliente, error: clienteError } = await supabase
      .from('clientes')
      .select('id')
      .eq('email', user.email)
      .single();

    if (clienteError || !cliente) {
      return []; // No hay cliente, no hay órdenes
    }

    // Ahora buscar órdenes usando el id del cliente
    const { data, error } = await supabase
      .from('encabezados')
      .select(
        `
        *,
        detalles(
          *,
          producto:producto_id(*)
        )
      `
      )
      .eq('cliente_id', cliente.id)
      .order('fecha_creacion', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching ordenes:', error);
    throw error;
  }
};

// Verificar y crear cliente si no existe
export const ensureClienteExists = async (clienteId: string, userEmail?: string) => {
  try {
    let email = userEmail;
    if (!email) {
      // Intentar obtener email del usuario autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        email = user.email;
      }
    }

    if (!email) {
      throw new Error('No se pudo obtener el email del usuario');
    }

    // Verificar si el cliente ya existe por email
    const { data: existingCliente, error: fetchError } = await supabase
      .from('clientes')
      .select('*')
      .eq('email', email)
      .single();

    if (existingCliente) {
      return existingCliente; // Ya existe, devolver el registro completo
    }

    // Si no existe, crear cliente básico
    const clienteData = {
      email,
      nombre: '',
      apellido: '',
      telefono: null,
      direccion: null,
      ciudad: null,
      codigo_postal: null,
    };

    const { data, error } = await supabase
      .from('clientes')
      .insert(clienteData)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error ensuring cliente exists:', error);
    throw error;
  }
};

// Procesar compra completa
export const procesarCompra = async (
  clienteId: string,
  items: any[],
  total: number,
  userEmail?: string
) => {
  try {
    // 0. Asegurar que el cliente existe y obtener su registro
    const cliente = await ensureClienteExists(clienteId, userEmail);

    // 1. Crear encabezado usando el ID del cliente de la tabla clientes
    const encabezado = await createEncabezado(cliente.id, total);

    // 2. Crear detalles
    const detalles = items.map((item) => ({
      encabezado_id: encabezado.id,
      producto_id: item.id,
      cantidad: item.cantidad,
      precio_unitario: item.precio,
      subtotal: item.precio * item.cantidad,
    }));

    await createDetalles(detalles);

    // 3. Actualizar cantidad vendida y stock
    for (const item of items) {
      await updateProductoVendidos(item.id, item.cantidad);
      const producto = await getProductoById(item.id);
      await updateProducto(item.id, {
        stock: Math.max(0, producto.stock - item.cantidad),
      });
    }

    return encabezado;
  } catch (error) {
    console.error('Error procesando compra:', error);
    throw error;
  }
};
