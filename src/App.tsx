/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  initialConfig,
  initialProductos,
  initialClientes,
  initialVentas,
  initialAbonos,
  initialProveedores,
} from './data/initialData';
import {
  Producto,
  Cliente,
  VentaMaestro,
  DetalleVenta,
  Abono,
  ConfiguracionApp,
  CartItem,
  MetodoPago,
  Proveedor,
} from './types/schema';
import { HeaderBar } from './components/HeaderBar';
import { OfflineIndicator, useOnlineStatus } from './components/OfflineIndicator';
import { Toaster, toast } from 'react-hot-toast';
import {
  fetchProductos,
  upsertProducto,
  deleteProducto,
  fetchClientes,
  upsertCliente,
  deleteCliente,
  fetchVentas,
  createVenta,
  fetchAbonos,
  createAbono,
  fetchGastos,
  createGasto,
  procesarVentaAtomica,
  procesarAbonoAtomico,
} from './lib/api';
import { migrateFromLocalStorageIfNeeded, setAllInStore, putInStore } from './lib/storage';
import { supabase } from './lib/supabase';
import { ActiveTab } from './types/schema';
import { PosModule } from './components/PosModule';
import { FiadoModule } from './components/FiadoModule';
import { InventarioModule } from './components/InventarioModule';
import { CierreCajaModule } from './components/CierreCajaModule';
import { LoginScreen } from './components/LoginScreen';
import { CalculatorModal } from './components/CalculatorModal';
import { TasaModal } from './components/TasaModal';
import { ConfiguracionModal } from './components/ConfiguracionModal';
import { RegistroNegocioModal } from './components/RegistroNegocioModal';
import { UsuariosModule } from './components/UsuariosModule';
import { LegaboxModule } from './components/LegaboxModule';
import { ClientesModule } from './components/ClientesModule';
import { TrialExpiredScreen } from './components/TrialExpiredScreen';
import { OfflineSyncModal } from './components/OfflineSyncModal';
import { getBcvRate, BcvRateResponse } from './lib/bcvService';
import { 
  enqueueSyncAction, 
  getPendingSyncCount, 
  processSyncQueue 
} from './lib/offlineSyncManager';
import { soundEffects } from './utils/audio';
import { initNativeNavigation, recordTabNavigation, useNativeBackHandler } from './utils/nativeNavigation';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    // Default to true so upon entering the app, user immediately gets the POS visual workspace
    const explicitLoggedOut = localStorage.getItem('bodeguero_logged_out') === 'true';
    if (explicitLoggedOut) return false;
    return true;
  });
  const [showRegistroModal, setShowRegistroModal] = useState<boolean>(false);
  const [preSelectedClienteForPos, setPreSelectedClienteForPos] = useState<Cliente | null>(null);
  
  useEffect(() => {
    // Initial session fetch
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        setIsAuthenticated(true);
        if (session.user?.email?.toLowerCase() === 'javiercol28@gmail.com') {
          setIsSuperAdmin(true);
        }
        localStorage.removeItem('bodeguero_logged_out');
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setIsAuthenticated(true);
        if (session.user?.email?.toLowerCase() === 'javiercol28@gmail.com') {
          setIsSuperAdmin(true);
        }
        localStorage.removeItem('bodeguero_logged_out');
      }
    });

    // Migrate legacy localStorage data to IndexedDB
    migrateFromLocalStorageIfNeeded().catch((e) => console.warn('[Storage] Migration notice:', e));

    return () => subscription.unsubscribe();
  }, []);

  // Application State with LocalStorage Persistence
  const [gastos, setGastos] = useState<any[]>(() => {
    const saved = localStorage.getItem('bodeguero_gastos_v3');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('bodeguero_gastos_v3', JSON.stringify(gastos));
  }, [gastos]);
  
  const handleRegistrarGasto = async (nuevoGasto: any) => {
    const gastoConUser = { ...nuevoGasto, ID_Usuario: session?.user?.id || 'USR-001', user_id: session?.user?.id };
    setGastos(prev => [gastoConUser, ...prev]);
    if (isOnline) {
      try {
        const res = await createGasto(gastoConUser);
        if (res) {
          toast.success('Gasto registrado y sincronizado');
        } else {
          enqueueSyncAction('CREATE_GASTO', gastoConUser, `Gasto: ${nuevoGasto.Concepto || 'General'}`, Number(nuevoGasto.Monto) || 0);
          toast.success('⚡ Gasto guardado localmente (se subirá al volver la señal)', { icon: '🛡️' });
        }
      } catch {
        enqueueSyncAction('CREATE_GASTO', gastoConUser, `Gasto: ${nuevoGasto.Concepto || 'General'}`, Number(nuevoGasto.Monto) || 0);
        toast.success('⚡ Gasto guardado localmente (se subirá al volver la señal)', { icon: '🛡️' });
      }
    } else {
      enqueueSyncAction('CREATE_GASTO', gastoConUser, `Gasto: ${nuevoGasto.Concepto || 'General'}`, Number(nuevoGasto.Monto) || 0);
      toast.success('⚡ Gasto guardado en memoria local (Modo Offline)', { icon: '🛡️' });
    }
  };

  const [config, setConfig] = useState<ConfiguracionApp>(() => {
    const saved = localStorage.getItem('bodeguero_config_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.propietario === 'Don José Pérez') {
          parsed.propietario = '';
        }
        if (!parsed.nombreBodega || parsed.nombreBodega === 'Minimarket La Bendición' || parsed.nombreBodega === 'Librería y Papelería El Éxito' || parsed.nombreBodega === 'Mi Tienda de Ropa' || parsed.nombreBodega === 'OH Store') {
          parsed.nombreBodega = 'Legatix POS';
        }
        if (!parsed.rubro || parsed.rubro === 'Bodega' || parsed.rubro === 'Tienda de Ropa' || parsed.rubro === 'Papelería') {
          parsed.rubro = 'Ropa Deportiva';
        }
        if (parsed.usuariosNegocio && Array.isArray(parsed.usuariosNegocio)) {
          parsed.usuariosNegocio = parsed.usuariosNegocio.filter(
            (u: any) => u.nombre !== 'Don José Pérez' && u.email !== 'caja1@negocio.com' && !u.nombre?.includes('Cajero Principal')
          );
        }
        return { ...initialConfig, ...parsed };
      } catch {}
    }
    return initialConfig;
  });

  const [productos, setProductos] = useState<Producto[]>(() => {
    const saved = localStorage.getItem('bodeguero_productos_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return initialProductos;
  });

  const [clientes, setClientes] = useState<Cliente[]>(() => {
    const saved = localStorage.getItem('bodeguero_clientes_v3');
    return saved ? JSON.parse(saved) : initialClientes;
  });

  const [ventas, setVentas] = useState<VentaMaestro[]>(() => {
    const saved = localStorage.getItem('bodeguero_ventas_v3');
    return saved ? JSON.parse(saved) : initialVentas;
  });

  const [abonos, setAbonos] = useState<Abono[]>(() => {
    const saved = localStorage.getItem('bodeguero_abonos_v3');
    return saved ? JSON.parse(saved) : initialAbonos;
  });

  const [proveedores, setProveedores] = useState<Proveedor[]>(() => {
    const saved = localStorage.getItem('bodeguero_proveedores_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((p: any) => !['PROV-001', 'PROV-002', 'PROV-003'].includes(p.ID_Proveedor));
        }
      } catch {}
    }
    return initialProveedores;
  });

  useEffect(() => {
    localStorage.setItem('bodeguero_proveedores_v1', JSON.stringify(proveedores));
  }, [proveedores]);

  const handleCrearProveedor = (nuevo: Partial<Proveedor>) => {
    const prov: Proveedor = {
      ID_Proveedor: `PROV-${Date.now().toString().slice(-4)}`,
      Nombre_Empresa: nuevo.Nombre_Empresa || 'Proveedor General',
      Contacto_Nombre: nuevo.Contacto_Nombre || '',
      Telefono_WhatsApp: nuevo.Telefono_WhatsApp || '',
      RIF: nuevo.RIF || '',
      Categoria_Rubro: nuevo.Categoria_Rubro || 'Víveres y Alimentos',
      Dias_Visita: nuevo.Dias_Visita || '',
      Saldo_Pendiente: Number(nuevo.Saldo_Pendiente) || 0,
      Direccion: nuevo.Direccion || '',
      Notas: nuevo.Notas || '',
      Fecha_Registro: new Date().toLocaleDateString('es-VE'),
      ...nuevo,
    };
    setProveedores((prev) => [prov, ...prev]);
    toast.success(`Proveedor ${prov.Nombre_Empresa} registrado`);
  };

  const handleEditarProveedor = (editado: Proveedor) => {
    setProveedores((prev) => prev.map((p) => p.ID_Proveedor === editado.ID_Proveedor ? editado : p));
    toast.success('Proveedor actualizado');
  };

  const handleEliminarProveedor = (idProveedor: string) => {
    setProveedores((prev) => prev.filter((p) => p.ID_Proveedor !== idProveedor));
    toast.success('Proveedor eliminado');
  };

  // Offline Resilience State
  const isOnline = useOnlineStatus();
  const isOffline = !isOnline;
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [isSyncingBackground, setIsSyncingBackground] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(() => getPendingSyncCount());

  useEffect(() => {
    const updateCount = () => setPendingSyncCount(getPendingSyncCount());
    window.addEventListener('bodeguero_sync_queue_changed', updateCount);

    // Purge any old test mock user records from localStorage so system is clean for productivity
    const savedUsers = localStorage.getItem('bodeguero_usuarios_v1');
    if (savedUsers) {
      try {
        const parsed = JSON.parse(savedUsers);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(
            (u: any) => u.nombre !== 'Don José Pérez' && u.email !== 'caja1@negocio.com' && !u.nombre?.includes('Cajero Principal')
          );
          if (cleaned.length !== parsed.length) {
            if (cleaned.length > 0) {
              localStorage.setItem('bodeguero_usuarios_v1', JSON.stringify(cleaned));
            } else {
              localStorage.removeItem('bodeguero_usuarios_v1');
            }
          }
        }
      } catch {}
    }

    return () => window.removeEventListener('bodeguero_sync_queue_changed', updateCount);
  }, []);

  // Navigation & Modals: Default to POS workstation ('pos') so entering the app immediately shows POS
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    const saved = localStorage.getItem('bodeguero_active_tab') as ActiveTab;
    return saved || 'pos';
  });
  const [fiadoSubTab, setFiadoSubTab] = useState<'deudores' | 'proveedores' | 'gastos'>('deudores');
  const [showCalculator, setShowCalculator] = useState(false);
  const [showTasaGlobalModal, setShowTasaGlobalModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [bcvData, setBcvData] = useState<BcvRateResponse | null>(null);
  const [userRole, setUserRole] = useState<'Administrador' | 'Cajero'>('Administrador');
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(() => {
    const saved = localStorage.getItem('legatix_is_super_admin');
    return saved !== null ? saved === 'true' : true;
  });

  const isUserAdminOrOwner = isSuperAdmin || config?.rolUsuarioActual === 'Dueño' || config?.rolUsuarioActual === 'Administrador' || userRole === 'Administrador';

  // Protect Admin tabs (dashboard & usuarios) from non-admin roles
  useEffect(() => {
    if (!isUserAdminOrOwner && (activeTab === 'dashboard' || activeTab === 'usuarios')) {
      setActiveTab('pos');
    }
  }, [isUserAdminOrOwner, activeTab]);

  useEffect(() => {
    localStorage.setItem('legatix_is_super_admin', isSuperAdmin ? 'true' : 'false');
  }, [isSuperAdmin]);

  // Native Mobile Back Button & Navigation Stack Handlers
  useNativeBackHandler(showCalculator, () => setShowCalculator(false), 'app_calculator');
  useNativeBackHandler(showTasaGlobalModal, () => setShowTasaGlobalModal(false), 'app_tasa_global');
  useNativeBackHandler(showConfigModal, () => setShowConfigModal(false), 'app_config');
  useNativeBackHandler(showSyncModal, () => setShowSyncModal(false), 'app_sync');

  useEffect(() => {
    const unregister = initNativeNavigation('pos', (prevTab) => {
      setActiveTab(prevTab);
    });

    const handleBackPrompt = () => {
      toast('Presiona "Atrás" de nuevo para salir de la app', {
        icon: '📲',
        duration: 2200,
        style: {
          background: '#18181B',
          color: '#F4F4F5',
          border: '1px solid rgba(212, 175, 55, 0.4)',
          fontSize: '13px',
          fontWeight: 600,
        }
      });
    };

    window.addEventListener('bodeguero_native_back_prompt', handleBackPrompt);
    return () => {
      unregister();
      window.removeEventListener('bodeguero_native_back_prompt', handleBackPrompt);
    };
  }, []);

  const handleTabChange = (tab: ActiveTab) => {
    if (!isUserAdminOrOwner && (tab === 'dashboard' || tab === 'usuarios')) {
      toast.error('Acceso exclusivo para Dueño o Administrador.');
      return;
    }
    localStorage.setItem('bodeguero_active_tab', tab);
    recordTabNavigation(tab);
    setActiveTab(tab);
  };

  const handleToggleSuperAdmin = () => {
    if (isSuperAdmin) {
      setIsSuperAdmin(false);
      toast.success('Modo Cliente activado. El rubro comercial ha sido sellado.');
    } else {
      const pin = prompt('Ingrese PIN Maestro de Administrador General (Legatix):');
      if (pin === '2026' || pin === 'legatix' || (config?.pinSuperAdmin && pin === config.pinSuperAdmin)) {
        setIsSuperAdmin(true);
        toast.success('👑 Modo Administrador General activado. Control total de rubros habilitado.');
      } else if (pin !== null) {
        toast.error('PIN incorrecto. Acceso exclusivo para el Administrador General.');
      }
    }
  };

  const handleSaveConfig = (updated: Partial<ConfiguracionApp>) => {
    setConfig((prev) => ({ ...prev, ...updated }));
    toast.success('Ajustes del comercio guardados');
  };


  const handleSwitchRole = () => {
    if (userRole === 'Administrador') {
      setUserRole('Cajero');
      setActiveTab('pos'); // Force to POS view when becoming cashier
      toast.success('Cambiaste a Modo Cajero (Vista Limitada)');
    } else {
      // In a real app this would ask for a PIN, but for MVP we just toggle back
      const pin = prompt('Ingrese PIN de Administrador (MVP: dejar en blanco o presionar OK):');
      if (pin !== null) {
        setUserRole('Administrador');
        toast.success('Cambiaste a Modo Administrador');
      }
    }
  };

  useEffect(() => {
    if (localStorage.getItem('production_clean_v2') !== 'true') {
      localStorage.removeItem('bodeguero_productos_v2');
      localStorage.removeItem('bodeguero_clientes_v2');
      localStorage.removeItem('bodeguero_ventas_v2');
      localStorage.removeItem('bodeguero_abonos');
      localStorage.removeItem('bodeguero_gastos');
      
      // Clean mock providers
      const provSaved = localStorage.getItem('bodeguero_proveedores_v1');
      if (provSaved) {
        try {
          const parsed = JSON.parse(provSaved);
          if (Array.isArray(parsed)) {
            const cleanProv = parsed.filter((p: any) => 
              !['PROV-001', 'PROV-002', 'PROV-003'].includes(p.ID_Proveedor) &&
              !p.Nombre_Empresa?.toLowerCase().includes('polar') &&
              !p.Nombre_Empresa?.toLowerCase().includes('heinz')
            );
            localStorage.setItem('bodeguero_proveedores_v1', JSON.stringify(cleanProv));
            setProveedores(cleanProv);
          }
        } catch {
          localStorage.removeItem('bodeguero_proveedores_v1');
          setProveedores([]);
        }
      }

      // Clean any mock products with preset IDs
      const prodsSaved = localStorage.getItem('bodeguero_productos_v3');
      if (prodsSaved) {
        try {
          const parsed = JSON.parse(prodsSaved);
          if (Array.isArray(parsed)) {
            const cleanProds = parsed.filter((p: any) => 
              !['CHAR-001', 'CHAR-002', 'CHAR-003', 'FRUT-001', 'CARN-001', 'FAST-001', 'PROD-001', 'PROD-002', 'PROD-003'].includes(p.ID_Producto) &&
              !['Harina PAN', 'Arroz Mary', 'Coca-Cola 2L', 'Pasta Primor'].includes(p.Nombre)
            );
            localStorage.setItem('bodeguero_productos_v3', JSON.stringify(cleanProds));
            setProductos(cleanProds);
          }
        } catch {}
      }

      localStorage.setItem('production_clean_v2', 'true');
    }
  }, []);

  const handlePurgeTestData = () => {
    setProductos([]);
    setVentas([]);
    setAbonos([]);
    setGastos([]);
    setClientes([]);
    setProveedores([]);
    localStorage.setItem('bodeguero_productos_v3', '[]');
    localStorage.setItem('bodeguero_clientes_v3', '[]');
    localStorage.setItem('bodeguero_ventas_v3', '[]');
    localStorage.setItem('bodeguero_abonos_v3', '[]');
    localStorage.setItem('bodeguero_gastos_v3', '[]');
    localStorage.setItem('bodeguero_proveedores_v1', '[]');
    toast.success('¡Sistema depurado al 100%! Toda la información ficticia fue retirada para producción.', { icon: '🚀', duration: 4000 });
  };

  const handleNavigate = (tab: ActiveTab, subTab?: string) => {
    handleTabChange(tab);
    if (tab === 'fiado' && subTab) {
      setFiadoSubTab(subTab as 'deudores' | 'gastos');
    }
  };

  // Desktop keyboard shortcuts (F1: POS, F2: Inventario, F3: Deudores, F4: Cierre, F5: Personal)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }

      if (e.key === 'F1') {
        e.preventDefault();
        handleTabChange('pos');
      } else if (e.key === 'F2') {
        e.preventDefault();
        handleTabChange('inventario');
      } else if (e.key === 'F3') {
        e.preventDefault();
        handleTabChange('fiado');
      } else if (e.key === 'F4') {
        if (userRole === 'Administrador' || isSuperAdmin || config?.rolUsuarioActual === 'Dueño' || config?.rolUsuarioActual === 'Administrador') {
          e.preventDefault();
          handleTabChange('dashboard');
        }
      } else if (e.key === 'F5' && !e.ctrlKey && !e.metaKey) {
        if (userRole === 'Administrador' || isSuperAdmin || config?.rolUsuarioActual === 'Dueño' || config?.rolUsuarioActual === 'Administrador') {
          e.preventDefault();
          handleTabChange('usuarios');
        }
      } else if (e.key === 'F6') {
        e.preventDefault();
        handleTabChange('legabox');
      } else if (e.key === 'F9') {
        e.preventDefault();
        setShowTasaGlobalModal((prev) => !prev);
      } else if (e.key === 'F12') {
        e.preventDefault();
        setShowCalculator((prev) => !prev);
      } else if (e.key === 'Escape') {
        setShowCalculator(false);
        setShowTasaGlobalModal(false);
        setShowConfigModal(false);
        setShowSyncModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [userRole, isSuperAdmin, config?.rolUsuarioActual]);

  // Sync to Storage (IndexedDB + localStorage fallback)
  useEffect(() => {
    localStorage.setItem('bodeguero_config_v3', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem('bodeguero_productos_v3', JSON.stringify(productos));
    setAllInStore('productos', productos).catch(() => {});
  }, [productos]);

  useEffect(() => {
    localStorage.setItem('bodeguero_clientes_v3', JSON.stringify(clientes));
    setAllInStore('clientes', clientes).catch(() => {});
  }, [clientes]);

  useEffect(() => {
    localStorage.setItem('bodeguero_ventas_v3', JSON.stringify(ventas));
    setAllInStore('ventas', ventas).catch(() => {});
  }, [ventas]);

  useEffect(() => {
    localStorage.setItem('bodeguero_abonos_v3', JSON.stringify(abonos));
    setAllInStore('abonos', abonos).catch(() => {});
  }, [abonos]);

  // Auto-reconciliation: Verify and heal client debts if sales/fiados exist but Deuda_Total is 0 or inconsistent
  useEffect(() => {
    if (clientes.length === 0) return;

    let hasChanges = false;
    const reconciledClientes = clientes.map((c) => {
      // Find all fiado or credit sales for this client (by ID or matching Name)
      const clientVentas = ventas.filter((v) => 
        (v.ID_Cliente && v.ID_Cliente === c.ID_Cliente) ||
        (v.Nombre_Cliente && c.Nombre_Completo && v.Nombre_Cliente.trim().toLowerCase() === c.Nombre_Completo.trim().toLowerCase())
      );
      
      const totalCreditoVentas = clientVentas.reduce((acc, v) => {
        if (typeof v.Monto_Credito === 'number' && v.Monto_Credito > 0) {
          return acc + v.Monto_Credito;
        }
        if (v.Metodo_Pago === 'Fiado') {
          return acc + (Number(v.Total_Venta) || 0);
        }
        return acc;
      }, 0);

      // Find all payments / abonos for this client
      const clientAbonos = abonos.filter((a) =>
        (a.ID_Cliente && a.ID_Cliente === c.ID_Cliente) ||
        (a.Nombre_Cliente && c.Nombre_Completo && a.Nombre_Cliente.trim().toLowerCase() === c.Nombre_Completo.trim().toLowerCase())
      );
      const totalAbonado = clientAbonos.reduce((acc, a) => acc + (Number(a.Monto_USD) || 0), 0);

      const computedDebt = Math.max(0, Number((totalCreditoVentas - totalAbonado).toFixed(2)));

      // If client debt was 0 but computed debt is positive, automatically heal it!
      if ((c.Deuda_Total === 0 || !c.Deuda_Total) && computedDebt > 0) {
        hasChanges = true;
        const nuevoEstado =
          computedDebt >= c.Limite_Credito
            ? 'Bloqueado'
            : computedDebt >= c.Limite_Credito * 0.8
            ? 'Cerca del Límite'
            : 'Crédito Activo';

        return {
          ...c,
          Deuda_Total: computedDebt,
          Estado_Credito: nuevoEstado,
          Ultimo_Movimiento: c.Ultimo_Movimiento || 'Sincronizado con historial de fiados',
        };
      }
      return c;
    });

    if (hasChanges) {
      setClientes(reconciledClientes);
    }
  }, [ventas, abonos]);

  // Automated Background Sync on Reconnection
  useEffect(() => {
    if (isOnline && isAuthenticated && session) {
      const runBackgroundSync = async () => {
        const count = getPendingSyncCount();
        if (count > 0) {
          setIsSyncingBackground(true);
          const result = await processSyncQueue();
          setIsSyncingBackground(false);
          setPendingSyncCount(getPendingSyncCount());

          if (result.synced > 0) {
            soundEffects.playCashRegisterChime();
            toast.success(`⚡ ¡Conexión restablecida! Se sincronizaron ${result.synced} operaciones pendientes en segundo plano.`, {
              icon: '☁️',
              duration: 5000,
            });
          }
        }

        // Pull fresh data from cloud only if no failed or pending sync items remain
        if (getPendingSyncCount() === 0) {
          try {
            const [
              serverProductos,
              serverClientes,
              serverVentas,
              serverAbonos,
              serverGastos,
            ] = await Promise.all([
              fetchProductos(),
              fetchClientes(),
              fetchVentas(),
              fetchAbonos(),
              fetchGastos(),
            ]);

            if (serverProductos && serverProductos.length > 0) setProductos(serverProductos);
            if (serverClientes && serverClientes.length > 0) setClientes(serverClientes);
            if (serverVentas && serverVentas.length > 0) setVentas(serverVentas);
            if (serverAbonos && serverAbonos.length > 0) setAbonos(serverAbonos);
            if (serverGastos && serverGastos.length > 0) setGastos(serverGastos);
          } catch (err) {
            console.warn('Sync notice:', err);
          }
        }
      };

      runBackgroundSync();
    }
  }, [isOnline, isAuthenticated, session]);

  // Automated BCV Rate Sync
  const syncBcvTasa = async (silent = false) => {
    try {
      const data = await getBcvRate();
      setBcvData(data);
      if (data.success && data.tasa > 0) {
        setConfig((prev) => {
          const autoSyncEnabled = prev.tasaAutoActualizarBCV ?? true;
          const isManual = prev.tasaEsManual ?? false;
          // If autoSync is enabled and not manually overridden
          if (autoSyncEnabled && !isManual) {
            if (!silent) {
              toast.success(`Tasa BCV actualizada a Bs. ${data.tasa.toLocaleString('es-VE', { minimumFractionDigits: 2 })} (${data.fechaValor})`, {
                icon: '🏦',
                duration: 4000,
              });
            }
            return {
              ...prev,
              tasaCambioUSD: data.tasa,
              tasaBCVOficial: data.tasa,
              tasaBCVFechaValor: data.fechaValor,
              tasaBCVActualizadaEn: data.timestamp,
            };
          } else {
            // Save official BCV metadata without overriding manual custom rate
            return {
              ...prev,
              tasaBCVOficial: data.tasa,
              tasaBCVFechaValor: data.fechaValor,
              tasaBCVActualizadaEn: data.timestamp,
            };
          }
        });
      }
    } catch (err) {
      console.error('Error al sincronizar tasa BCV:', err);
    }
  };

  // Sync on startup and when online
  useEffect(() => {
    if (isOnline) {
      syncBcvTasa(true);
    }
  }, [isOnline]);

  // Handle Dynamic Tasa Update (from Modal or POS)
  const handleUpdateTasa = (newTasa: number, options?: { autoSync?: boolean; isManual?: boolean }) => {
    setConfig((prev) => ({
      ...prev,
      tasaCambioUSD: newTasa,
      tasaAutoActualizarBCV: options?.autoSync !== undefined ? options.autoSync : prev.tasaAutoActualizarBCV,
      tasaEsManual: options?.isManual !== undefined ? options.isManual : prev.tasaEsManual,
    }));
    toast.success(`Tasa activa guardada: Bs. ${newTasa.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`);
  };

  // Handle Offline toggle and Delayed Sync resolution
  const handleToggleOffline = () => {
    if (isOffline) {
      toast.error('Estás sin conexión a internet.');
    } else {
      toast.success('Estás conectado a internet.');
    }
  };

  // Business Logic: Complete Sale (POS Module)
  const handleCompletarVenta = (
    items: CartItem[],
    totalUSD: number,
    metodoPago: MetodoPago,
    clienteId?: string,
    desglosePagos?: any[],
    montoCredito?: number,
    montoAbonado?: number
  ): boolean => {
    const transaccionId = `VTA-${Date.now().toString().slice(-6)}`;
    const fechaHora = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const nuevaVenta: VentaMaestro = {
      ID_Transaccion: transaccionId,
      Fecha_Hora: fechaHora,
      ID_Cliente: clienteId,
      Nombre_Cliente: clienteId
        ? clientes.find((c) => c.ID_Cliente === clienteId)?.Nombre_Completo
        : undefined,
      Total_Venta: totalUSD,
      Metodo_Pago: metodoPago,
      Estado_Transaccion: 'Completada',
      Tasa_Cambio_Aplicada: config.tasaCambioUSD,
      Total_Moneda_Local: totalUSD * config.tasaCambioUSD,
      ID_Usuario: session?.user?.id || 'USR-001',
      Items_Count: items.reduce((sum, i) => sum + i.cantidad, 0),
      Items: items,
      Desglose_Pagos: desglosePagos,
      Monto_Credito: montoCredito,
      Monto_Abonado: montoAbonado,
    };

    // 1. Deduct stock in real-time from Inventario (Módulo de Inventario Dinámico)
    setProductos((prevProds) =>
      prevProds.map((prod) => {
        const itemVendido = items.find((i) => i.producto.ID_Producto === prod.ID_Producto);
        if (itemVendido) {
          const nuevoStock = Math.max(0, prod.Stock_Actual - itemVendido.cantidad);
          return { ...prod, Stock_Actual: nuevoStock };
        }
        return prod;
      })
    );

    // 2. If Fiado or partial credit, update debtor's balance in Clientes (Módulo "El Fiado")
    const deudaAAgregar = (typeof montoCredito === 'number' && montoCredito > 0)
      ? montoCredito
      : (metodoPago === 'Fiado' ? totalUSD : 0);

    if (deudaAAgregar > 0 && (clienteId || nuevaVenta.Nombre_Cliente)) {
      setClientes((prevClientes) =>
        prevClientes.map((c) => {
          const isMatch = (clienteId && c.ID_Cliente === clienteId) ||
            (nuevaVenta.Nombre_Cliente && c.Nombre_Completo.trim().toLowerCase() === nuevaVenta.Nombre_Cliente.trim().toLowerCase());
          if (isMatch) {
            const nuevaDeuda = (Number(c.Deuda_Total) || 0) + deudaAAgregar;
            const nuevoEstado =
              nuevaDeuda >= c.Limite_Credito
                ? 'Bloqueado'
                : nuevaDeuda >= c.Limite_Credito * 0.8
                ? 'Cerca del Límite'
                : 'Crédito Activo';

            return {
              ...c,
              Deuda_Total: nuevaDeuda,
              Estado_Credito: nuevoEstado,
              Ultimo_Movimiento: 'Hoy, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
          }
          return c;
        })
      );
    }

    // 3. Record transaction
    const ventaConUser = { ...nuevaVenta, user_id: session?.user?.id };
    setVentas((prev) => [ventaConUser, ...prev]);


    // Atomic Transaction Payload (Sale, Inventory Decrement, Customer Debt Delta)
    const salePayload = {
      venta: ventaConUser,
      items,
      clienteId: clienteId || undefined,
      deudaDelta: deudaAAgregar,
    };

    if (isOffline) {
      enqueueSyncAction('PROCESAR_VENTA', salePayload, `Venta #${nuevaVenta.ID_Transaccion} (${nuevaVenta.Metodo_Pago})`, totalUSD);
      toast.success('⚡ Venta guardada en memoria local (Modo Offline)', {
        icon: '🛡️',
        duration: 3500
      });
    } else {
      procesarVentaAtomica(ventaConUser, items, clienteId, deudaAAgregar).then(ok => {
        if (ok) {
          toast.success('Venta registrada y sincronizada');
        } else {
          enqueueSyncAction('PROCESAR_VENTA', salePayload, `Venta #${nuevaVenta.ID_Transaccion} (${nuevaVenta.Metodo_Pago})`, totalUSD);
          toast.success('⚡ Guardada localmente. Se sincronizará en segundo plano.', { icon: '🛡️' });
        }
      }).catch(() => {
        enqueueSyncAction('PROCESAR_VENTA', salePayload, `Venta #${nuevaVenta.ID_Transaccion} (${nuevaVenta.Metodo_Pago})`, totalUSD);
        toast.success('⚡ Guardada localmente (Sin conexión). Se sincronizará en segundo plano.', { icon: '🛡️' });
      });
    }

    return true;
  };

  // Business Logic: Register Abono (Fiado Module)
  const handleRegistrarAbono = (
    clienteId: string,
    montoUSD: number,
    metodoAbono: 'Efectivo' | 'Pago Móvil' | 'Divisa',
    comprobanteRef?: string
  ): boolean => {
    const cliente = clientes.find((c) => c.ID_Cliente === clienteId);
    if (!cliente) return false;

    const saldoAnterior = cliente.Deuda_Total;
    const saldoRestante = Math.max(0, saldoAnterior - montoUSD);
    const abonoId = `ABN-${Date.now().toString().slice(-6)}`;
    const fechaHora = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const nuevoAbono: Abono = {
      ID_Abono: abonoId,
      ID_Cliente: clienteId,
      user_id: session?.user?.id,
      Nombre_Cliente: cliente.Nombre_Completo,
      Fecha_Hora: fechaHora,
      Monto_Abonado: montoUSD,
      Monto_Moneda_Local: montoUSD * config.tasaCambioUSD,
      Tasa_Cambio: config.tasaCambioUSD,
      Saldo_Anterior: saldoAnterior,
      Saldo_Restante: saldoRestante,
      Metodo_Abono: metodoAbono,
      Comprobante_Ref: comprobanteRef,
      ID_Usuario: session?.user?.id || 'USR-001',
    };

    // Update client balance and status
    let clienteModificado: Cliente | null = null;
    setClientes((prevClientes) =>
      prevClientes.map((c) => {
        if (c.ID_Cliente === clienteId) {
          const nuevoEstado =
            saldoRestante <= 0
              ? 'Al Día'
              : saldoRestante >= c.Limite_Credito * 0.8
              ? 'Cerca del Límite'
              : 'Crédito Activo';
          
          clienteModificado = {
            ...c,
            Deuda_Total: saldoRestante,
            Estado_Credito: nuevoEstado,
            Ultimo_Movimiento: 'Hoy, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          return clienteModificado;
        }
        return c;
      })
    );

    setAbonos((prev) => [nuevoAbono, ...prev]);
    

    const abonoPayload = {
      abono: nuevoAbono,
      clienteId,
      montoUSD,
    };

    if (isOffline) {
      enqueueSyncAction('PROCESAR_ABONO', abonoPayload, `Abono de ${cliente.Nombre_Completo}`, montoUSD);
      toast.success('⚡ Abono guardado en memoria local (Modo Offline)', { icon: '🛡️' });
    } else {
      procesarAbonoAtomico(nuevoAbono, clienteId, montoUSD).then(ok => {
        if (ok) {
          toast.success('Abono registrado exitosamente');
        } else {
          enqueueSyncAction('PROCESAR_ABONO', abonoPayload, `Abono de ${cliente.Nombre_Completo}`, montoUSD);
          toast.success('⚡ Abono guardado localmente (se subirá en segundo plano)', { icon: '🛡️' });
        }
      }).catch(() => {
        enqueueSyncAction('PROCESAR_ABONO', abonoPayload, `Abono de ${cliente.Nombre_Completo}`, montoUSD);
        toast.success('⚡ Abono guardado localmente (se subirá en segundo plano)', { icon: '🛡️' });
      });
    }
    
    return true;
  };

  // Business Logic: Create new Debtor Client
  const handleCrearCliente = (nuevoCliente: {
    ID_Cliente?: string;
    Nombre_Completo: string;
    Telefono_WhatsApp?: string;
    Limite_Credito?: number | string;
    Notas?: string;
    Deuda_Inicial?: number | string;
    Deuda_Total?: number | string;
    Deglose?: string;
  }): Cliente => {
    // Preserve passed ID_Cliente if provided (prevents mismatch with POS or callers), or generate a clean sequential ID
    const newId = nuevoCliente.ID_Cliente?.trim() || `CLI-${(clientes.length + 1).toString().padStart(3, '0')}`;
    
    // Robust number parsing for debt (handles string with commas/decimals, Deuda_Inicial or Deuda_Total)
    const rawDeuda = (nuevoCliente as any).Deuda_Inicial !== undefined 
      ? (nuevoCliente as any).Deuda_Inicial 
      : (nuevoCliente as any).Deuda_Total;
    
    let deuda = 0;
    if (typeof rawDeuda === 'number') {
      deuda = isNaN(rawDeuda) ? 0 : rawDeuda;
    } else if (typeof rawDeuda === 'string') {
      const cleaned = rawDeuda.replace(/,/g, '.').replace(/[^0-9.]/g, '');
      deuda = parseFloat(cleaned) || 0;
    }

    const rawLimite = nuevoCliente.Limite_Credito;
    let limite = 50;
    if (typeof rawLimite === 'number') {
      limite = isNaN(rawLimite) || rawLimite <= 0 ? 50 : rawLimite;
    } else if (typeof rawLimite === 'string') {
      const cleaned = rawLimite.replace(/,/g, '.').replace(/[^0-9.]/g, '');
      limite = parseFloat(cleaned) || 50;
    }

    const clienteObj: Cliente = {
      ID_Cliente: newId,
      user_id: session?.user?.id,
      Nombre_Completo: nuevoCliente.Nombre_Completo.trim(),
      Telefono_WhatsApp: (nuevoCliente.Telefono_WhatsApp || 'S/N').trim(),
      Limite_Credito: limite,
      Deuda_Total: deuda,
      Estado_Credito: deuda > 0 ? (deuda >= limite * 0.8 ? 'Cerca del Límite' : 'Crédito Activo') : 'Al Día',
      Notas: nuevoCliente.Notas?.trim(),
      Ultimo_Movimiento: deuda > 0 ? 'Deuda registrada hoy' : 'Registrado hoy',
    };

    setClientes((prev) => {
      const idx = prev.findIndex(c => c.ID_Cliente === newId || c.Nombre_Completo.toLowerCase() === clienteObj.Nombre_Completo.toLowerCase());
      if (idx >= 0) {
        const updated = [...prev];
        const existing = updated[idx];
        const finalDeuda = deuda > 0 ? deuda : existing.Deuda_Total;
        updated[idx] = {
          ...existing,
          ...clienteObj,
          Deuda_Total: finalDeuda,
          Estado_Credito: finalDeuda > 0 ? (finalDeuda >= limite * 0.8 ? 'Cerca del Límite' : 'Crédito Activo') : 'Al Día',
        };
        return updated;
      }
      return [...prev, clienteObj];
    });

    if (deuda > 0) {
      const transaccionId = `VTA-${Date.now().toString().slice(-6)}`;
      const fechaHora = new Date().toISOString().replace('T', ' ').slice(0, 19);
      const nuevaVenta: VentaMaestro = {
        ID_Transaccion: transaccionId,
        Fecha_Hora: fechaHora,
        ID_Cliente: newId,
        Nombre_Cliente: nuevoCliente.Nombre_Completo,
        Total_Venta: deuda,
        Metodo_Pago: 'Fiado' as const,
        Estado_Transaccion: 'Completada' as const,
        Tasa_Cambio_Aplicada: config.tasaCambioUSD,
        Total_Moneda_Local: deuda * config.tasaCambioUSD,
        ID_Usuario: session?.user?.id || 'USR-001',
        Monto_Credito: deuda,
        Monto_Abonado: 0,
        Items_Count: 1,
        Items: [
          {
            cantidad: 1,
            producto: {
              ID_Producto: 'INIT-DEBT',
              Codigo_Barras: '000000',
              Nombre: nuevoCliente.Deglose || 'Saldo Inicial Registrado',
              Categoria: 'Otros',
              Costo: 0,
              Precio_Venta: deuda,
              Stock_Actual: 0,
              Stock_Minimo: 0,
              Unidad_Medida: 'Unidad'
            }
          }
        ],
        user_id: session?.user?.id,
      };

      setVentas((prev) => [nuevaVenta, ...prev]);

      {
        if (isOnline) {
          createVenta(nuevaVenta).catch(() => {
            enqueueSyncAction('CREATE_VENTA', nuevaVenta, `Saldo inicial: ${nuevoCliente.Nombre_Completo}`, deuda);
          });
        } else {
          enqueueSyncAction('CREATE_VENTA', nuevaVenta, `Saldo inicial: ${nuevoCliente.Nombre_Completo}`, deuda);
        }
      }
    }

    
    if (isOnline) {
      upsertCliente(clienteObj).catch(() => {
        enqueueSyncAction('UPSERT_CLIENTE', clienteObj, `Nuevo cliente: ${clienteObj.Nombre_Completo}`);
      });
    } else {
      enqueueSyncAction('UPSERT_CLIENTE', clienteObj, `Nuevo cliente: ${clienteObj.Nombre_Completo}`);
    }

    return clienteObj;
  };

  // Direct Fiado / Debt Charge to an existing client
  const handleCargarDeudaCliente = (clienteId: string, montoUSD: number, concepto?: string) => {
    if (!clienteId || montoUSD <= 0) return;
    
    let clienteNombre = '';
    setClientes((prevClientes) =>
      prevClientes.map((c) => {
        if (c.ID_Cliente === clienteId) {
          clienteNombre = c.Nombre_Completo;
          const nuevaDeuda = (Number(c.Deuda_Total) || 0) + montoUSD;
          const nuevoEstado =
            nuevaDeuda >= c.Limite_Credito
              ? 'Bloqueado'
              : nuevaDeuda >= c.Limite_Credito * 0.8
              ? 'Cerca del Límite'
              : 'Crédito Activo';
          const updatedCli: Cliente = {
            ...c,
            Deuda_Total: nuevaDeuda,
            Estado_Credito: nuevoEstado,
            Ultimo_Movimiento: 'Fiado: Hoy, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          {
            if (isOnline) {
              upsertCliente(updatedCli).catch(() => {
                enqueueSyncAction('UPSERT_CLIENTE', updatedCli, `Cargar fiado a ${c.Nombre_Completo}`);
              });
            } else {
              enqueueSyncAction('UPSERT_CLIENTE', updatedCli, `Cargar fiado a ${c.Nombre_Completo}`);
            }
          }
          return updatedCli;
        }
        return c;
      })
    );

    // Register in ventas for closure and audit tracking
    const transaccionId = `VTA-${Date.now().toString().slice(-6)}`;
    const fechaHora = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const nuevaVenta: VentaMaestro = {
      ID_Transaccion: transaccionId,
      Fecha_Hora: fechaHora,
      ID_Cliente: clienteId,
      Nombre_Cliente: clienteNombre || 'Cliente Deudor',
      Total_Venta: montoUSD,
      Metodo_Pago: 'Fiado',
      Estado_Transaccion: 'Completada',
      Tasa_Cambio_Aplicada: config.tasaCambioUSD,
      Total_Moneda_Local: montoUSD * config.tasaCambioUSD,
      ID_Usuario: session?.user?.id || 'USR-001',
      Monto_Credito: montoUSD,
      Monto_Abonado: 0,
      Items_Count: 1,
      Items: [
        {
          cantidad: 1,
          producto: {
            ID_Producto: 'FIADO-DIR',
            Codigo_Barras: '000000',
            Nombre: concepto?.trim() || 'Fiado registrado en libreta',
            Categoria: 'Otros',
            Costo: 0,
            Precio_Venta: montoUSD,
            Stock_Actual: 0,
            Stock_Minimo: 0,
            Unidad_Medida: 'Unidad',
          },
        },
      ],
      user_id: session?.user?.id,
    };

    setVentas((prev) => [nuevaVenta, ...prev]);
    {
      if (isOnline) {
        createVenta(nuevaVenta).catch(() => {
          enqueueSyncAction('CREATE_VENTA', nuevaVenta, `Fiado cargado: ${clienteNombre}`, montoUSD);
        });
      } else {
        enqueueSyncAction('CREATE_VENTA', nuevaVenta, `Fiado cargado: ${clienteNombre}`, montoUSD);
      }
    }

    toast.success(`Fiado de $${montoUSD.toFixed(2)} cargado con éxito a ${clienteNombre || 'cliente'}`);
  };

  // Business Logic: Stock Adjustment / Reposición
  const handleActualizarStock = (prodId: string, cantidadSumar: number) => {
    let productoActualizado: Producto | null = null;
    setProductos((prev) =>
      prev.map((p) => {
        if (p.ID_Producto === prodId) {
          productoActualizado = { ...p, Stock_Actual: Math.max(0, p.Stock_Actual + cantidadSumar) };
          return productoActualizado;
        }
        return p;
      })
    );
    if (productoActualizado) {
      if (isOnline) {
        upsertProducto(productoActualizado).then(res => {
          if (res) toast.success('Stock actualizado en la nube');
          else {
            enqueueSyncAction('UPSERT_PRODUCTO', productoActualizado!, `Ajuste stock: ${productoActualizado!.Nombre}`);
            toast.success('⚡ Stock guardado localmente (se subirá en segundo plano)', { icon: '🛡️' });
          }
        }).catch(() => {
          enqueueSyncAction('UPSERT_PRODUCTO', productoActualizado!, `Ajuste stock: ${productoActualizado!.Nombre}`);
          toast.success('⚡ Stock guardado localmente (se subirá en segundo plano)', { icon: '🛡️' });
        });
      } else {
        enqueueSyncAction('UPSERT_PRODUCTO', productoActualizado, `Ajuste stock: ${productoActualizado.Nombre}`);
        toast.success('⚡ Stock guardado en memoria local (Modo Offline)', { icon: '🛡️' });
      }
    }
  };

  // Business Logic: Create new Product
  const handleCrearProducto = async (nuevo: Omit<Producto, 'ID_Producto'>) => {
    // 1. Optimistic Local Update
    const newId = `PROD-${(productos.length + 1).toString().padStart(3, '0')}`;
    const prodObj: Producto = {
      ID_Producto: newId,
      user_id: session?.user?.id,
      ...nuevo,
    };
    setProductos((prev) => [prodObj, ...prev]);


    // 2. Sync
    if (isOnline) {
      try {
        const res = await upsertProducto(prodObj);
        if (res) toast.success('Producto creado y sincronizado');
        else {
          enqueueSyncAction('UPSERT_PRODUCTO', prodObj, `Nuevo producto: ${prodObj.Nombre}`);
          toast.success('⚡ Producto guardado localmente', { icon: '🛡️' });
        }
      } catch {
        enqueueSyncAction('UPSERT_PRODUCTO', prodObj, `Nuevo producto: ${prodObj.Nombre}`);
        toast.success('⚡ Producto guardado localmente', { icon: '🛡️' });
      }
    } else {
      enqueueSyncAction('UPSERT_PRODUCTO', prodObj, `Nuevo producto: ${prodObj.Nombre}`);
      toast.success('⚡ Producto guardado en memoria local (Modo Offline)', { icon: '🛡️' });
    }
  };

  const handleEditarProducto = async (productoEditado: Producto) => {
    setProductos((prev) => prev.map((p) => p.ID_Producto === productoEditado.ID_Producto ? productoEditado : p));
    if (isOnline) {
      try {
        const res = await upsertProducto(productoEditado);
        if (res) toast.success('Producto editado en la nube');
        else {
          enqueueSyncAction('UPSERT_PRODUCTO', productoEditado, `Editar producto: ${productoEditado.Nombre}`);
          toast.success('⚡ Edición guardada localmente', { icon: '🛡️' });
        }
      } catch {
        enqueueSyncAction('UPSERT_PRODUCTO', productoEditado, `Editar producto: ${productoEditado.Nombre}`);
        toast.success('⚡ Edición guardada localmente', { icon: '🛡️' });
      }
    } else {
      enqueueSyncAction('UPSERT_PRODUCTO', productoEditado, `Editar producto: ${productoEditado.Nombre}`);
      toast.success('⚡ Edición guardada localmente (Modo Offline)', { icon: '🛡️' });
    }
  };

  const handleEliminarProducto = async (idProducto: string) => {
    const prod = productos.find(p => p.ID_Producto === idProducto);
    setProductos((prev) => prev.filter((p) => p.ID_Producto !== idProducto));
    if (isOnline) {
      try {
        await deleteProducto(idProducto);
        toast.success('Producto eliminado de la nube');
      } catch {
        enqueueSyncAction('DELETE_PRODUCTO', { idProducto }, `Eliminar: ${prod?.Nombre || idProducto}`);
        toast.success('⚡ Eliminación registrada localmente', { icon: '🛡️' });
      }
    } else {
      enqueueSyncAction('DELETE_PRODUCTO', { idProducto }, `Eliminar: ${prod?.Nombre || idProducto}`);
      toast.success('⚡ Eliminado localmente (se sincronizará)', { icon: '🛡️' });
    }
  };
  
  const handleEditarCliente = async (clienteEditado: Cliente) => {
    setClientes((prev) => prev.map((c) => c.ID_Cliente === clienteEditado.ID_Cliente ? clienteEditado : c));
    if (isOnline) {
      try {
        const res = await upsertCliente(clienteEditado);
        if (res) toast.success('Cliente editado en la nube');
        else {
          enqueueSyncAction('UPSERT_CLIENTE', clienteEditado, `Editar cliente: ${clienteEditado.Nombre_Completo}`);
          toast.success('⚡ Edición guardada localmente', { icon: '🛡️' });
        }
      } catch {
        enqueueSyncAction('UPSERT_CLIENTE', clienteEditado, `Editar cliente: ${clienteEditado.Nombre_Completo}`);
        toast.success('⚡ Edición guardada localmente', { icon: '🛡️' });
      }
    } else {
      enqueueSyncAction('UPSERT_CLIENTE', clienteEditado, `Editar cliente: ${clienteEditado.Nombre_Completo}`);
      toast.success('⚡ Edición guardada localmente (Modo Offline)', { icon: '🛡️' });
    }
  };

  const handleEliminarCliente = async (idCliente: string) => {
    const cli = clientes.find(c => c.ID_Cliente === idCliente);
    setClientes((prev) => prev.filter((c) => c.ID_Cliente !== idCliente));
    if (isOnline) {
      try {
        await deleteCliente(idCliente);
        toast.success('Cliente eliminado de la nube');
      } catch {
        enqueueSyncAction('DELETE_CLIENTE', { idCliente }, `Eliminar cliente: ${cli?.Nombre_Completo || idCliente}`);
        toast.success('⚡ Eliminación registrada localmente', { icon: '🛡️' });
      }
    } else {
      enqueueSyncAction('DELETE_CLIENTE', { idCliente }, `Eliminar cliente: ${cli?.Nombre_Completo || idCliente}`);
      toast.success('⚡ Eliminado localmente (se sincronizará)', { icon: '🛡️' });
    }
  };

  // Business Logic: Cierre de Caja Trigger
  const handleEjecutarCierreDiario = () => {
    // Simulated backend trigger
  };

  // Compute Badges for bottom nav
  const debtorsCount = clientes.filter((c) => (Number(c.Deuda_Total) || 0) > 0).length;
  const lowStockCount = productos.filter((p) => p.Stock_Actual <= p.Stock_Minimo).length;

  // 15-Day Trial System Calculation: day 16 lockout
  const trialStartDate = config?.fechaRegistroUsuario || localStorage.getItem('bodeguero_trial_start');
  const isLicenseActive = config?.licenciaActiva === true || localStorage.getItem('bodeguero_license_active') === 'true';

  let isTrialExpired = false;
  let daysRemaining = 15;
  let daysElapsed = 0;

  if (trialStartDate && !isLicenseActive && !isSuperAdmin) {
    const startMs = new Date(trialStartDate).getTime();
    const diffDays = Math.floor((Date.now() - startMs) / (1000 * 60 * 60 * 24));
    daysElapsed = Math.max(0, diffDays);
    daysRemaining = Math.max(0, 15 - diffDays);
    // On day 16 (i.e. diffDays >= 15), the app is completely locked
    if (diffDays >= 15) {
      isTrialExpired = true;
    }
  }

  const handleUnlockLicense = (enteredPin: string): boolean => {
    const masterPin = config.pinSuperAdmin || '2026';
    if (enteredPin === masterPin || enteredPin === 'LEGATIX2026' || enteredPin === 'admin123456') {
      const updatedConfig: ConfiguracionApp = {
        ...config,
        licenciaActiva: true,
      };
      handleSaveConfig(updatedConfig);
      localStorage.setItem('bodeguero_license_active', 'true');
      toast.success('¡Licencia del programa activada con éxito!', { icon: '🎉', duration: 5000 });
      return true;
    }
    return false;
  };

  if (!isAuthenticated) {
    return (
      <LoginScreen 
        onLogin={() => {
          localStorage.removeItem('bodeguero_logged_out');
          setIsAuthenticated(true);
          setActiveTab('pos');
        }}
      />
    );
  }

  // Day 16 Lockout: User must contact administrator
  if (isTrialExpired) {
    return (
      <TrialExpiredScreen
        config={config}
        onUnlockLicense={handleUnlockLicense}
        onLogout={async () => {
          try {
            await supabase.auth.signOut();
          } catch {}
          localStorage.setItem('bodeguero_logged_out', 'true');
          setIsAuthenticated(false);
        }}
      />
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-[#050505] text-[#E0E0E0] font-sans select-none antialiased flex flex-col items-center justify-center overflow-hidden">
      <Toaster 
        position="top-right" 
        toastOptions={{ 
          className: 'font-mono text-sm', 
          style: { background: '#1A1A1A', color: '#fff', border: '1px solid #333' } 
        }} 
      />
      
      <OfflineIndicator 
        onOpenSyncModal={() => setShowSyncModal(true)} 
        isSyncing={isSyncingBackground} 
      />
      <main className="w-full h-full flex flex-col">
        <div className="w-full h-full bg-[#0A0A0C] flex flex-col overflow-hidden relative mx-auto">
            {/* Top Header Bar */}
            <HeaderBar
              config={config}
              onUpdateTasa={handleUpdateTasa}
              isOffline={isOffline}
              onToggleOffline={handleToggleOffline}
              pendingSyncCount={pendingSyncCount}
              activeTab={activeTab}
              onChangeTab={handleTabChange}
              onLogout={async () => {
                try {
                  await supabase.auth.signOut();
                } catch {}
                localStorage.setItem('bodeguero_logged_out', 'true');
                setIsAuthenticated(false);
              }}
              onOpenCalculator={() => setShowCalculator(true)}
              onOpenTasaModal={() => setShowTasaGlobalModal(true)}
              onOpenConfigModal={() => setShowConfigModal(true)}
              onOpenSyncModal={() => setShowSyncModal(true)}
              role={userRole}
              isSuperAdmin={isSuperAdmin}
              onSwitchRole={handleSwitchRole}
              onToggleSuperAdmin={handleToggleSuperAdmin}
            />

            {/* Trial Status Banner for registered users within the 15-day trial */}
            {trialStartDate && !isLicenseActive && !isSuperAdmin && (
              <div className="w-full bg-gradient-to-r from-[#D4AF37]/20 via-[#111215] to-[#D4AF37]/20 border-b border-[#D4AF37]/40 px-3 sm:px-4 py-1.5 flex items-center justify-between gap-3 text-xs shrink-0 z-30 font-mono">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse shrink-0"></span>
                  <span className="text-[#D4AF37] font-bold text-[11px] uppercase tracking-wider">
                    Prueba de 15 Días:
                  </span>
                  <span className="text-gray-300 text-[11px] truncate">
                    Día {daysElapsed + 1} de 15 • Quedan <strong className="text-white">{daysRemaining} {daysRemaining === 1 ? 'día' : 'días'}</strong>
                  </span>
                </div>
                <span className="text-[10px] text-[#D4AF37] bg-black/50 border border-[#D4AF37]/30 px-2 py-0.5 rounded shrink-0">
                  🔒 {config.rubro || 'Comercio'}
                </span>
              </div>
            )}

            {/* Active Module View */}
            <main className="flex-1 overflow-hidden relative">
              {activeTab === 'pos' && (
                <PosModule
                  productos={productos}
                  clientes={clientes}
                  config={config}
                  onCompletarVenta={handleCompletarVenta}
                  onUpdateTasa={handleUpdateTasa}
                  onNavigateToFiado={() => handleTabChange('fiado')}
                  role={userRole}
                  bcvData={bcvData}
                  onRefreshBcv={() => syncBcvTasa(false)}
                  onOpenConfigModal={() => setShowConfigModal(true)}
                  onCrearCliente={handleCrearCliente}
                  preSelectedCliente={preSelectedClienteForPos}
                  onClearPreSelectedCliente={() => setPreSelectedClienteForPos(null)}
                />
              )}

              {activeTab === 'clientes' && (
                <ClientesModule
                  clientes={clientes}
                  ventas={ventas}
                  config={config}
                  onCrearCliente={handleCrearCliente}
                  onEditarCliente={userRole === 'Administrador' ? handleEditarCliente : undefined}
                  onEliminarCliente={userRole === 'Administrador' ? handleEliminarCliente : undefined}
                  onIniciarVentaConCliente={(cli) => {
                    setPreSelectedClienteForPos(cli);
                    handleTabChange('pos');
                  }}
                  role={userRole}
                />
              )}

              {activeTab === 'fiado' && (
                <FiadoModule
                  clientes={clientes}
                  abonos={abonos}
                  config={config}
                  gastos={gastos}
                  proveedores={proveedores}
                  ventas={ventas}
                  initialTab={fiadoSubTab}
                  onRegistrarAbono={handleRegistrarAbono}
                  onCrearCliente={handleCrearCliente}
                  onRegistrarGasto={handleRegistrarGasto}
                  onCrearProveedor={handleCrearProveedor}
                  onEditarProveedor={userRole === 'Administrador' ? handleEditarProveedor : undefined}
                  onEliminarProveedor={userRole === 'Administrador' ? handleEliminarProveedor : undefined}
                  onEditarCliente={userRole === 'Administrador' ? handleEditarCliente : undefined}
                  onEliminarCliente={userRole === 'Administrador' ? handleEliminarCliente : undefined}
                  onCargarDeudaCliente={handleCargarDeudaCliente}
                  role={userRole}
                />
              )}

              {activeTab === 'inventario' && (
                <InventarioModule
                  productos={productos}
                  config={config}
                  onActualizarStock={handleActualizarStock}
                  onCrearProducto={handleCrearProducto}
                  onEditarProducto={userRole === 'Administrador' ? handleEditarProducto : undefined}
                  onEliminarProducto={userRole === 'Administrador' ? handleEliminarProducto : undefined}
                  role={userRole}
                  isSuperAdmin={isSuperAdmin}
                  ventas={ventas}
                  onUpdateConfig={handleSaveConfig}
                  onOpenConfigModal={() => setShowConfigModal(true)}
                />
              )}

              {activeTab === 'dashboard' && isUserAdminOrOwner && (
                <CierreCajaModule
                  onNavigate={handleNavigate}
                  ventas={ventas}
                  abonos={abonos}
                  gastos={gastos}
                  productos={productos}
                  clientes={clientes}
                  config={config}
                  onEjecutarCierreDiario={handleEjecutarCierreDiario}
                  onOpenConfigModal={() => setShowConfigModal(true)}
                />
              )}

              {activeTab === 'usuarios' && isUserAdminOrOwner && (
                <UsuariosModule
                  config={config}
                  onUpdateConfig={handleSaveConfig}
                  isSuperAdmin={isSuperAdmin}
                  currentUserEmail={session?.user?.email || ''}
                />
              )}

              {activeTab === 'legabox' && (
                <LegaboxModule
                  config={config}
                  productos={productos}
                  clientes={clientes}
                  ventas={ventas}
                  abonos={abonos}
                  gastos={gastos}
                  proveedores={proveedores}
                  onNavigateToTab={handleNavigate}
                  onOpenConfigModal={() => setShowConfigModal(true)}
                />
              )}
            </main>

            {showCalculator && (
              <CalculatorModal onClose={() => setShowCalculator(false)} />
            )}
            <TasaModal
              isOpen={showTasaGlobalModal}
              onClose={() => setShowTasaGlobalModal(false)}
              config={config}
              onSaveTasa={handleUpdateTasa}
              bcvData={bcvData}
              onRefreshBcv={() => syncBcvTasa(false)}
            />
            <ConfiguracionModal
              isOpen={showConfigModal}
              onClose={() => setShowConfigModal(false)}
              config={config}
              onSaveConfig={handleSaveConfig}
              onPurgeTestData={handlePurgeTestData}
              isSuperAdmin={isSuperAdmin}
              onRequestSuperAdmin={handleToggleSuperAdmin}
            />
            <RegistroNegocioModal
              isOpen={showRegistroModal}
              onClose={() => setShowRegistroModal(false)}
              currentConfig={config}
              onSuccessRegister={(updatedConfig, registeredEmail) => {
                handleSaveConfig(updatedConfig);
                if (updatedConfig.rolUsuarioActual === 'Cajero' || updatedConfig.rolUsuarioActual === 'Supervisor') {
                  setUserRole('Cajero');
                  setActiveTab('pos');
                } else {
                  setUserRole('Administrador');
                  setActiveTab('dashboard');
                }
                setShowRegistroModal(false);
                toast.success(`¡Negocio ${updatedConfig.nombreBodega} registrado! Rol: ${updatedConfig.rolUsuarioActual || 'Dueño'}. Bienvenido ${registeredEmail}`, { icon: '🎉', duration: 5000 });
              }}
            />
            <OfflineSyncModal
              isOpen={showSyncModal}
              onClose={() => setShowSyncModal(false)}
              isOnline={isOnline}
              onSyncComplete={() => {
                setPendingSyncCount(getPendingSyncCount());
              }}
            />
          </div>
        </main>

      
    </div>
  );
}
