// Cart Screen Component
// Shows shopping cart with checkout
// Handles payment processing
// Checks user authentication
// Processes orders

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useCart } from '../lib/cart-context';
import { useAuth } from '../lib/auth-context';
import { procesarCompra } from '../lib/database';
import { CartDrawer } from '../components/cart-drawer';
import { showAlert, showConfirm } from '../lib/dialog';

// Cart screen component
export default function CartScreen() {
  const router = useRouter();
  const { items, total, itemCount, clearCart } = useCart();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);

  // Handle checkout process
  const processCheckout = async () => {
    if (!user) {
      showAlert('Inicia sesion', 'Necesitas estar autenticado para comprar');
      router.push('/signin');
      return;
    }

    if (items.length === 0) {
      showAlert('Carrito vacío', 'Agrega productos antes de continuar');
      return;
    }

    try {
      setLoading(true);

      await procesarCompra(user.id, items, total, user.email);
      clearCart();
      router.push('/');
    } catch (error) {
      console.error('Error processing order:', error);
      showAlert('Error', 'No se pudo procesar tu compra. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = () => {
    if (loading) {
      return;
    }

    if (items.length === 0) {
      showAlert('Carrito vacío', 'Agrega productos antes de continuar');
      return;
    }

    if (Platform.OS === 'web') {
      setShowCheckoutConfirm(true);
      return;
    }

    showConfirm(
      'Confirmar compra',
      `Vas a comprar ${itemCount} producto(s) por un total de $${total.toFixed(2)}. Deseas continuar?`,
      () => {
        void processCheckout();
      }
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <CartDrawer onCheckout={handleCheckout} onClose={() => router.back()} />
      {showCheckoutConfirm && (
        <View style={styles.confirmOverlay}>
          <TouchableOpacity
            style={styles.confirmBackdrop}
            onPress={() => setShowCheckoutConfirm(false)}
            activeOpacity={1}
          />
          <View style={styles.confirmCard}>
            <Text style={styles.confirmEyebrow}>Confirmacion</Text>
            <Text style={styles.confirmTitle}>Revisa tu compra</Text>
            <Text style={styles.confirmMessage}>
              Vas a comprar {itemCount} producto(s) por un total de $
              {total.toFixed(2)}.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmCancelButton]}
                onPress={() => setShowCheckoutConfirm(false)}
              >
                <Text style={styles.confirmCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmAcceptButton]}
                onPress={() => {
                  setShowCheckoutConfirm(false);
                  void processCheckout();
                }}
              >
                <Text style={styles.confirmAcceptText}>Confirmar pago</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Procesando tu compra...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  confirmOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 998,
    padding: 20,
  },
  confirmBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.32)',
  },
  confirmCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#dbe4ea',
    boxShadow: '0px 18px 40px rgba(15, 23, 42, 0.18)',
    elevation: 12,
  },
  confirmEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#5b7c99',
    marginBottom: 8,
  },
  confirmTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 10,
  },
  confirmMessage: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4b5563',
    marginBottom: 20,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  confirmButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  confirmCancelButton: {
    backgroundColor: '#eef2f5',
  },
  confirmAcceptButton: {
    backgroundColor: '#1f8f55',
  },
  confirmCancelText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
  },
  confirmAcceptText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  loadingText: {
    marginTop: 16,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
