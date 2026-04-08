// Orders Screen Component
// Shows user's order history
// Displays order details and status
// Handles authentication checks
// Pull-to-refresh functionality

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../lib/auth-context';
import { getClienteOrdenes } from '../lib/database';
import { useRouter } from 'expo-router';

interface Orden {
  id: string;
  estado: string;
  total: number;
  fechaCreacion: string;
  detalles: Array<{
    cantidad: number;
    precioUnitario: number;
    producto: {
      titulo: string;
      autor: string;
    };
  }>;
}

// Orders screen component
export default function OrdersScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load user's orders from database
  const loadOrdenes = async () => {
    try {
      if (!user) return;
      const data = await getClienteOrdenes(user.id);
      setOrdenes(data);
    } catch (error) {
      console.error('Error loading ordenes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadOrdenes();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Handle pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    loadOrdenes();
  };

  // Get color for order status badge
  const getEstadoBadgeColor = (estado: string) => {
    switch (estado) {
      case 'completada':
        return '#2ecc71';
      case 'pendiente':
        return '#f39c12';
      case 'cancelada':
        return '#e74c3c';
      default:
        return '#95a5a6';
    }
  };

  // Get display label for order status
  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'completada':
        return '✓ Completada';
      case 'pendiente':
        return '⏳ Pendiente';
      case 'cancelada':
        return '✗ Cancelada';
      default:
        return estado;
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>🔐</Text>
          <Text style={styles.emptyTitle}>Necesitas iniciar sesión</Text>
          <Text style={styles.emptySubtitle}>Para ver tus órdenes</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/signin')}
          >
            <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>📦 Mis Órdenes</Text>
        <Text style={styles.subtitle}>
          Total: {ordenes.length} orden{ordenes.length !== 1 ? 'es' : ''}
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#3498db" />
        </View>
      ) : ordenes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>📭</Text>
          <Text style={styles.emptyTitle}>No tienes órdenes</Text>
          <Text style={styles.emptySubtitle}>
            Realiza tu primera compra en el catálogo
          </Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => router.push('/explore')}
          >
            <Text style={styles.shopButtonText}>Ir al Catálogo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={ordenes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.ordenCard}>
              {/* Header orden */}
              <View style={styles.ordenHeader}>
                <View>
                  <Text style={styles.ordenId}>Orden #{item.id.slice(0, 8)}</Text>
                  <Text style={styles.ordenFecha}>
                    {new Date(item.fechaCreacion).toLocaleDateString('es-ES')}
                  </Text>
                </View>
                <View
                  style={[
                    styles.estadoBadge,
                    { backgroundColor: getEstadoBadgeColor(item.estado) },
                  ]}
                >
                  <Text style={styles.estadoText}>
                    {getEstadoLabel(item.estado)}
                  </Text>
                </View>
              </View>

              {/* Items */}
              <View style={styles.itemsContainer}>
                {item.detalles.map((detalle, index) => (
                  <View key={index} style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemTitle} numberOfLines={2}>
                        {detalle.producto.titulo}
                      </Text>
                      <Text style={styles.itemAutor}>
                        {detalle.producto.autor}
                      </Text>
                    </View>
                    <View style={styles.itemRight}>
                      <Text style={styles.itemCantidad}>
                        x{detalle.cantidad}
                      </Text>
                      <Text style={styles.itemPrice}>
                        ${detalle.precioUnitario.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Total */}
              <View style={styles.totalSection}>
                <Text style={styles.totalLabel}>Total de Orden:</Text>
                <Text style={styles.totalAmount}>
                  ${item.total.toFixed(2)}
                </Text>
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#3498db']}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  emptyText: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  shopButton: {
    backgroundColor: '#2ecc71',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shopButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  listContent: {
    padding: 8,
  },
  ordenCard: {
    marginHorizontal: 8,
    marginVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ordenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  ordenId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  ordenFecha: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  estadoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  estadoText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  itemsContainer: {
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  itemAutor: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemCantidad: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#4b0082',
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4b0082',
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4b0082',
  },
});
